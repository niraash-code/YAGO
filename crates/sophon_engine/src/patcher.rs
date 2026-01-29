use crate::error::{Result, SophonError};
use libc::{c_void, c_uchar, c_uint};
use std::io::{Read, Seek, SeekFrom, Write};
use std::ptr;

#[allow(non_camel_case_types)]
type hpatch_BOOL = c_uint;
#[allow(non_camel_case_types)]
type hpatch_StreamPos_t = u64;

#[repr(C)]
struct hpatch_TStreamInput {
    stream_import: *mut c_void,
    stream_size: hpatch_StreamPos_t,
    read: extern "C" fn(*const hpatch_TStreamInput, hpatch_StreamPos_t, *mut c_uchar, *mut c_uchar) -> hpatch_BOOL,
    private_reserved: *mut c_void,
}

#[repr(C)]
struct hpatch_TStreamOutput {
    stream_import: *mut c_void,
    stream_size: hpatch_StreamPos_t,
    read_writed: Option<extern "C" fn(*const hpatch_TStreamOutput, hpatch_StreamPos_t, *mut c_uchar, *mut c_uchar) -> hpatch_BOOL>,
    write: extern "C" fn(*const hpatch_TStreamOutput, hpatch_StreamPos_t, *const c_uchar, *const c_uchar) -> hpatch_BOOL,
}

extern "C" {
    fn patch_stream(
        out_new_data: *const hpatch_TStreamOutput,
        old_data: *const hpatch_TStreamInput,
        serialized_diff: *const hpatch_TStreamInput,
    ) -> hpatch_BOOL;
}

pub struct Patcher;

impl Patcher {
    pub fn apply_patch<R, D, W>(
        old_data: &mut R,
        diff_data: &mut D,
        new_data: &mut W,
    ) -> Result<()>
    where
        R: Read + Seek,
        D: Read + Seek,
        W: Write + Seek, 
    {
        // Get sizes
        let old_size = old_data.seek(SeekFrom::End(0))?;
        old_data.seek(SeekFrom::Start(0))?;

        let diff_size = diff_data.seek(SeekFrom::End(0))?;
        diff_data.seek(SeekFrom::Start(0))?;

        let old_stream = hpatch_TStreamInput {
            stream_import: old_data as *mut _ as *mut c_void,
            stream_size: old_size,
            read: input_read::<R>,
            private_reserved: ptr::null_mut(),
        };

        let diff_stream = hpatch_TStreamInput {
            stream_import: diff_data as *mut _ as *mut c_void,
            stream_size: diff_size,
            read: input_read::<D>,
            private_reserved: ptr::null_mut(),
        };

        let new_stream = hpatch_TStreamOutput {
            stream_import: new_data as *mut _ as *mut c_void,
            stream_size: u64::MAX,
            read_writed: None,
            write: output_write::<W>,
        };

        let result = unsafe {
            patch_stream(&new_stream, &old_stream, &diff_stream)
        };

        if result == 0 {
            return Err(SophonError::Protocol("hpatchz patch failed".to_string()));
        }

        Ok(())
    }
}

extern "C" fn input_read<T: Read + Seek>(
    stream: *const hpatch_TStreamInput,
    read_from_pos: hpatch_StreamPos_t,
    out_data: *mut c_uchar,
    out_data_end: *mut c_uchar,
) -> hpatch_BOOL {
    unsafe {
        let reader = &mut *((*stream).stream_import as *mut T);
        let len = out_data_end as usize - out_data as usize;
        let buf = std::slice::from_raw_parts_mut(out_data, len);

        if reader.seek(SeekFrom::Start(read_from_pos)).is_err() {
            return 0;
        }
        if reader.read_exact(buf).is_err() {
            return 0;
        }
        1
    }
}

extern "C" fn output_write<T: Write>(
    stream: *const hpatch_TStreamOutput,
    _write_to_pos: hpatch_StreamPos_t,
    data: *const c_uchar,
    data_end: *const c_uchar,
) -> hpatch_BOOL {
    unsafe {
        let writer = &mut *((*stream).stream_import as *mut T);
        let len = data_end as usize - data as usize;
        let buf = std::slice::from_raw_parts(data, len);
        
        if writer.write_all(buf).is_err() {
            return 0;
        }
        1
    }
}