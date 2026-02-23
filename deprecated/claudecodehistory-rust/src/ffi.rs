//! FFI bindings for Bun integration
//!
//! Provides a C-compatible interface for calling Rust functions from Bun/Node.js.
//! Follows the same error handling pattern as quant-rust with LAST_ERROR mutex.

use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::ptr;
use std::sync::Mutex;

use crate::error::{HistoryError, Result};
use crate::parser::{parse_jsonl_batch, parse_jsonl_file};
use crate::search::{search_entries, search_with_options};
use crate::types::{ConversationEntry, HistoryQueryOptions};

/// Global storage for the last error message
static LAST_ERROR: Mutex<Option<String>> = Mutex::new(None);

/// Set the last error message
fn set_last_error(msg: String) {
    if let Ok(mut guard) = LAST_ERROR.lock() {
        *guard = Some(msg);
    }
}

/// Convert a Rust string to a C string (leaked)
fn to_c_string(s: String) -> *mut c_char {
    match CString::new(s.clone()) {
        Ok(cstr) => cstr.into_raw(),
        Err(_) => {
            // Handle null bytes by replacing them
            let safe_s: String = s.chars().map(|c| if c == '\0' { '?' } else { c }).collect();
            CString::new(safe_s).unwrap_or_default().into_raw()
        }
    }
}

/// Convert a C string to a Rust string
fn from_c_string(s: *const c_char) -> Result<String> {
    if s.is_null() {
        return Err(HistoryError::InvalidInput("Null string pointer".to_string()));
    }
    
    unsafe {
        CStr::from_ptr(s)
            .to_str()
            .map(|s| s.to_string())
            .map_err(|e| HistoryError::FfiError(format!("Invalid UTF-8: {}", e)))
    }
}

/// Get the last error message
///
/// Returns a pointer to the last error message string.
/// The returned string is valid until the next call to any FFI function.
/// Returns null if no error has occurred.
///
/// # Safety
/// The returned pointer should not be freed or modified.
#[no_mangle]
pub extern "C" fn claudecodehistory_last_error() -> *const c_char {
    if let Ok(guard) = LAST_ERROR.lock() {
        if let Some(ref err) = *guard {
            return to_c_string(err.clone());
        }
    }
    ptr::null()
}

/// Clear the last error message
///
/// # Safety
/// This function is safe to call from any thread.
#[no_mangle]
pub extern "C" fn claudecodehistory_clear_error() {
    if let Ok(mut guard) = LAST_ERROR.lock() {
        *guard = None;
    }
}

/// Parse a single JSONL file
///
/// # Arguments
/// * `path` - Path to the JSONL file (null-terminated C string)
///
/// # Returns
/// JSON string array of ConversationEntry objects, or null on error.
/// Use claudecodehistory_last_error() to get the error message.
///
/// # Safety
/// The returned string must be freed with claudecodehistory_free_string().
#[no_mangle]
pub extern "C" fn claudecodehistory_parse_jsonl_file(path: *const c_char) -> *mut c_char {
    let path_str = match from_c_string(path) {
        Ok(s) => s,
        Err(e) => {
            set_last_error(e.to_string());
            return ptr::null_mut();
        }
    };

    match parse_jsonl_file(&path_str) {
        Ok(entries) => {
            match serde_json::to_string(&entries) {
                Ok(json) => to_c_string(json),
                Err(e) => {
                    set_last_error(format!("JSON serialization error: {}", e));
                    ptr::null_mut()
                }
            }
        }
        Err(e) => {
            set_last_error(e.to_string());
            ptr::null_mut()
        }
    }
}

/// Parse multiple JSONL files in parallel
///
/// # Arguments
/// * `paths_json` - JSON array of file paths (null-terminated C string)
///
/// # Returns
/// JSON string array of ConversationEntry objects, or null on error.
/// Use claudecodehistory_last_error() to get the error message.
///
/// # Safety
/// The returned string must be freed with claudecodehistory_free_string().
#[no_mangle]
pub extern "C" fn claudecodehistory_parse_jsonl_batch(paths_json: *const c_char) -> *mut c_char {
    let paths_str = match from_c_string(paths_json) {
        Ok(s) => s,
        Err(e) => {
            set_last_error(e.to_string());
            return ptr::null_mut();
        }
    };

    let paths: Vec<String> = match serde_json::from_str(&paths_str) {
        Ok(p) => p,
        Err(e) => {
            set_last_error(format!("Invalid paths JSON: {}", e));
            return ptr::null_mut();
        }
    };

    match parse_jsonl_batch(paths) {
        Ok(entries) => {
            match serde_json::to_string(&entries) {
                Ok(json) => to_c_string(json),
                Err(e) => {
                    set_last_error(format!("JSON serialization error: {}", e));
                    ptr::null_mut()
                }
            }
        }
        Err(e) => {
            set_last_error(e.to_string());
            ptr::null_mut()
        }
    }
}

/// Search entries for text matching a query
///
/// # Arguments
/// * `entries_json` - JSON array of ConversationEntry objects
/// * `query` - Search query string
///
/// # Returns
/// JSON array of matching ConversationEntry objects, or null on error.
/// Use claudecodehistory_last_error() to get the error message.
///
/// # Safety
/// The returned string must be freed with claudecodehistory_free_string().
#[no_mangle]
pub extern "C" fn claudecodehistory_search_entries(
    entries_json: *const c_char,
    query: *const c_char,
) -> *mut c_char {
    let entries_str = match from_c_string(entries_json) {
        Ok(s) => s,
        Err(e) => {
            set_last_error(e.to_string());
            return ptr::null_mut();
        }
    };

    let query_str = match from_c_string(query) {
        Ok(s) => s,
        Err(e) => {
            set_last_error(e.to_string());
            return ptr::null_mut();
        }
    };

    let entries: Vec<ConversationEntry> = match serde_json::from_str(&entries_str) {
        Ok(e) => e,
        Err(e) => {
            set_last_error(format!("Invalid entries JSON: {}", e));
            return ptr::null_mut();
        }
    };

    let results = search_entries(&entries, &query_str);

    match serde_json::to_string(&results) {
        Ok(json) => to_c_string(json),
        Err(e) => {
            set_last_error(format!("JSON serialization error: {}", e));
            ptr::null_mut()
        }
    }
}

/// Free a string allocated by Rust
///
/// # Safety
/// Only call this with strings returned from other FFI functions.
/// Do not call this twice with the same pointer.
#[no_mangle]
pub extern "C" fn claudecodehistory_free_string(s: *mut c_char) {
    if !s.is_null() {
        unsafe {
            let _ = CString::from_raw(s);
        }
    }
}

/// Get the library version
///
/// # Returns
/// Version string (e.g., "0.1.0")
///
/// # Safety
/// The returned string should NOT be freed.
#[no_mangle]
pub extern "C" fn claudecodehistory_version() -> *const c_char {
    // Return a static string, no need to free
    b"0.1.0\0".as_ptr() as *const c_char
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::ffi::CString;

    #[test]
    fn test_version() {
        let version = claudecodehistory_version();
        let cstr = unsafe { CStr::from_ptr(version) };
        assert_eq!(cstr.to_str().unwrap(), "0.1.0");
    }

    #[test]
    fn test_last_error() {
        claudecodehistory_clear_error();
        assert!(claudecodehistory_last_error().is_null());

        set_last_error("Test error".to_string());
        let err = claudecodehistory_last_error();
        assert!(!err.is_null());

        let cstr = unsafe { CStr::from_ptr(err) };
        assert_eq!(cstr.to_str().unwrap(), "Test error");

        claudecodehistory_clear_error();
    }
}
