#[cfg(target_os = "windows")]
use crate::error::{MarshalError, Result};
#[cfg(target_os = "windows")]
use std::path::Path;

#[cfg(target_os = "windows")]
pub fn inject_remote(pid: u32, dll_path: &Path) -> Result<()> {
    use windows_sys::Win32::System::Diagnostics::Debug::WriteProcessMemory;
    use windows_sys::Win32::System::LibraryLoader::{GetModuleHandleW, GetProcAddress};
    use windows_sys::Win32::System::Memory::{
        VirtualAllocEx, MEM_COMMIT, MEM_RESERVE, PAGE_READWRITE,
    };
    use windows_sys::Win32::System::Threading::{
        CreateRemoteThread, OpenProcess, PROCESS_ALL_ACCESS,
    };

    let h_process = unsafe { OpenProcess(PROCESS_ALL_ACCESS, 0, pid) };
    if h_process == 0 {
        return Err(MarshalError::Io(std::io::Error::last_os_error()));
    }

    let wide_path: Vec<u16> = dll_path
        .to_string_lossy()
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();
    let path_len = wide_path.len() * 2;

    unsafe {
        let remote_mem = VirtualAllocEx(
            h_process,
            std::ptr::null(),
            path_len,
            MEM_COMMIT | MEM_RESERVE,
            PAGE_READWRITE,
        );
        if remote_mem.is_null() {
            return Err(MarshalError::Io(std::io::Error::last_os_error()));
        }

        if WriteProcessMemory(
            h_process,
            remote_mem,
            wide_path.as_ptr() as *const _,
            path_len,
            std::ptr::null_mut(),
        ) == 0
        {
            return Err(MarshalError::Io(std::io::Error::last_os_error()));
        }

        let kernel32_name: Vec<u16> = "kernel32.dll\0".encode_utf16().collect();
        let h_kernel32 = GetModuleHandleW(kernel32_name.as_ptr());
        let load_library_addr = GetProcAddress(h_kernel32, b"LoadLibraryW\0".as_ptr());

        if load_library_addr.is_none() {
            return Err(MarshalError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "LoadLibraryW not found",
            )));
        }

        let h_thread = CreateRemoteThread(
            h_process,
            std::ptr::null(),
            0,
            std::mem::transmute(load_library_addr),
            remote_mem,
            0,
            std::ptr::null_mut(),
        );

        if h_thread == 0 {
            return Err(MarshalError::Io(std::io::Error::last_os_error()));
        }
    }

    Ok(())
}

#[cfg(target_os = "windows")]
pub fn resume_process(pid: u32) -> Result<()> {
    use std::mem::size_of;
    use windows_sys::Win32::Foundation::{CloseHandle, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Thread32First, Thread32Next, TH32CS_SNAPTHREAD, THREADENTRY32,
    };
    use windows_sys::Win32::System::Threading::{OpenThread, ResumeThread, THREAD_SUSPEND_RESUME};

    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0);
        if snapshot == INVALID_HANDLE_VALUE {
            return Err(MarshalError::Io(std::io::Error::last_os_error()));
        }

        let mut entry: THREADENTRY32 = std::mem::zeroed();
        entry.dwSize = size_of::<THREADENTRY32>() as u32;

        if Thread32First(snapshot, &mut entry) != 0 {
            loop {
                if entry.th32OwnerProcessID == pid {
                    let thread_handle = OpenThread(THREAD_SUSPEND_RESUME, 0, entry.th32ThreadID);
                    if thread_handle != 0 {
                        ResumeThread(thread_handle);
                        CloseHandle(thread_handle);
                        CloseHandle(snapshot);
                        return Ok(());
                    }
                }
                if Thread32Next(snapshot, &mut entry) == 0 {
                    break;
                }
            }
        }

        CloseHandle(snapshot);
        Err(MarshalError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Main thread not found",
        )))
    }
}

#[cfg(target_os = "windows")]
pub fn launch_injected(
    game_exe: &Path,
    args: &[String],
    dll_paths: Vec<std::path::PathBuf>,
) -> Result<std::process::Child> {
    use std::os::windows::process::CommandExt;
    const CREATE_SUSPENDED: u32 = 0x00000004;

    let mut cmd = std::process::Command::new(game_exe);
    cmd.args(args);
    cmd.creation_flags(CREATE_SUSPENDED);

    let child = cmd.spawn().map_err(MarshalError::Io)?;
    let pid = child.id();

    for dll in dll_paths {
        inject_remote(pid, &dll)?;
    }

    resume_process(pid)?;

    Ok(child)
}

#[cfg(target_os = "windows")]
pub struct LoaderHook {
    h_module: windows_sys::Win32::Foundation::HMODULE,
}

#[cfg(target_os = "windows")]
impl LoaderHook {
    pub fn load(dll_path: &Path) -> Result<Self> {
        use windows_sys::Win32::System::LibraryLoader::LoadLibraryW;

        let wide_path: Vec<u16> = dll_path
            .to_string_lossy()
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();

        let h_module = unsafe { LoadLibraryW(wide_path.as_ptr()) };
        if h_module == 0 {
            return Err(MarshalError::Io(std::io::Error::last_os_error()));
        }

        Ok(Self { h_module })
    }

    pub fn set_hook(&self, process_name: &str) -> Result<()> {
        use windows_sys::Win32::System::LibraryLoader::GetProcAddress;
        
        let wide_name: Vec<u16> = process_name
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();

        unsafe {
            let func_name = b"HookLibrary\0";
            let func_ptr = GetProcAddress(self.h_module, func_name.as_ptr());
            
            if let Some(ptr) = func_ptr {
                // ANSI Version
                let ansi_name = std::ffi::CString::new(process_name).unwrap();
                // Most custom modding DLLs use cdecl (extern "C")
                let hook_library_ansi: unsafe extern "C" fn(*const u8) = std::mem::transmute(ptr);
                hook_library_ansi(ansi_name.as_ptr() as *const u8);
                println!("Marshal: HookLibrary called successfully.");
            } else {
                 return Err(MarshalError::Io(std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    "HookLibrary function not found in 3dmloader.dll",
                )));
            }
        }
        Ok(())
    }

    pub fn wait_for_injection(&self) -> Result<()> {
        use windows_sys::Win32::System::LibraryLoader::GetProcAddress;

        unsafe {
            let func_name = b"WaitForInjection\0";
            let func_ptr = GetProcAddress(self.h_module, func_name.as_ptr());

             if let Some(ptr) = func_ptr {
                let wait_func: unsafe extern "C" fn() = std::mem::transmute(ptr);
                wait_func();
                println!("Marshal: WaitForInjection returned.");
            } else {
                 return Err(MarshalError::Io(std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    "WaitForInjection function not found in 3dmloader.dll",
                )));
            }
        }
        Ok(())
    }
}

#[cfg(target_os = "windows")]
impl Drop for LoaderHook {
    fn drop(&mut self) {
        use windows_sys::Win32::Foundation::FreeLibrary;
        unsafe {
            if self.h_module != 0 {
                FreeLibrary(self.h_module);
            }
        }
    }
}
