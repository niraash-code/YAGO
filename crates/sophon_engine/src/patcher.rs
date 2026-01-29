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
    streamImport: *mut c_void,
    streamSize: hpatch_StreamPos_t,
    read: extern "C" fn(*const hpatch_TStreamInput, hpatch_StreamPos_t, *mut c_uchar, *mut c_uchar) -> hpatch_BOOL,
    _private_reserved: *mut c_void,
}

#[repr(C)]
struct hpatch_TStreamOutput {
    streamImport: *mut c_void,
    streamSize: hpatch_StreamPos_t,
    read_writed: Option<extern "C" fn(*const hpatch_TStreamOutput, hpatch_StreamPos_t, *mut c_uchar, *mut c_uchar) -> hpatch_BOOL>,
    write: extern "C" fn(*const hpatch_TStreamOutput, hpatch_StreamPos_t, *const c_uchar, *const c_uchar) -> hpatch_BOOL,
}

extern "C" {
    fn patch_stream(
        out_newData: *const hpatch_TStreamOutput,
        oldData: *const hpatch_TStreamInput,
        serializedDiff: *const hpatch_TStreamInput,
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
        W: Write + Seek, // Write needs Seek? hpatchz output is random access?
        // Checking patch_stream: "sequential write" is commented in header.
        // But patch_stream documentation says: "const hpatch_TStreamOutput* out_newData, //sequential write"
        // Wait, if it's sequential write, do I need Seek?
        // "streamSize" is max writable range.
        // Let's assume sequential write for now.
    {
        // Get sizes
        let old_size = old_data.seek(SeekFrom::End(0))?;
        old_data.seek(SeekFrom::Start(0))?;

        let diff_size = diff_data.seek(SeekFrom::End(0))?;
        diff_data.seek(SeekFrom::Start(0))?;

        // We don't know new_size easily without parsing diff first.
        // But hpatchz might handle it?
        // `out_newData->streamSize` is used for bounds check.
        // If we stream to a file, we might set it to u64::MAX or the expected size from manifest.
        // For generic Write, we might not know.
        // But patch_stream usually expects to write fully.
        
        let mut old_stream = hpatch_TStreamInput {
            streamImport: old_data as *mut _ as *mut c_void,
            streamSize: old_size,
            read: input_read::<R>,
            _private_reserved: ptr::null_mut(),
        };

        let mut diff_stream = hpatch_TStreamInput {
            streamImport: diff_data as *mut _ as *mut c_void,
            streamSize: diff_size,
            read: input_read::<D>,
            _private_reserved: ptr::null_mut(),
        };

        let mut new_stream = hpatch_TStreamOutput {
            streamImport: new_data as *mut _ as *mut c_void,
            streamSize: u64::MAX, // Allow unlimited write? Or should check manifest?
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
        let reader = &mut *((*stream).streamImport as *mut T);
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
    write_to_pos: hpatch_StreamPos_t,
    data: *const c_uchar,
    data_end: *const c_uchar,
) -> hpatch_BOOL {
    unsafe {
        let writer = &mut *((*stream).streamImport as *mut T);
        let len = data_end as usize - data as usize;
        let buf = std::slice::from_raw_parts(data, len);

        // If T supports Seek, we should seek. But Write trait doesn't imply Seek.
        // However, hpatch_stream doc says "sequential write" for out_newData.
        // If it strictly writes sequentially, we might ignore write_to_pos?
        // But if it jumps, we need Seek.
        // "patch_stream" usually writes sequentially.
        // But wait, "writeToPos" is passed. If it's sequential, it should match current pos.
        // If it's random access, we need Seek.
        
        // Let's assume we need Seek if write_to_pos is not ignored.
        // To be safe, let's require Seek for W too if possible, OR check if hpatchz guarantees sequential.
        // The header says "sequential write".
        // But if I can't seek, I rely on it being exactly sequential.
        // Let's rely on Write for now.
        
        if writer.write_all(buf).is_err() {
            return 0;
        }
        1
    }
}