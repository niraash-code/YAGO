#[cfg(target_os = "windows")]
use crate::error::{MarshalError, Result};
#[cfg(target_os = "windows")]
use dll_syringe::{process::OwnedProcess, Syringe};
#[cfg(target_os = "windows")]
use std::path::Path;

#[cfg(target_os = "windows")]
pub fn inject_remote(pid: u32, dll_path: &Path) -> Result<()> {
    let process = OwnedProcess::from_pid(pid).map_err(|e| {
        MarshalError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string(),
        ))
    })?;
    let syringe = Syringe::for_process(process);

    syringe.inject(dll_path).map_err(|e| {
        MarshalError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            e.to_string(),
        ))
    })?;

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
