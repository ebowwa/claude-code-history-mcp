//! Claude Code History WASM Parser
//!
//! High-performance JSONL parser for Claude Code conversation history files,
//! compiled to WebAssembly for use in Node.js and browsers.
//!
//! Optimizations:
//! - Uses String timestamps instead of DateTime (avoids expensive chrono parsing)
//! - Skips raw_content extraction by default (lazy evaluation)
//! - Single-pass parsing with minimal allocations

use wasm_bindgen::prelude::*;
use serde_wasm_bindgen;
use crate::types::{ConversationEntry, SearchOptions, FastEntry};
use crate::parser::{parse_jsonl_content, parse_with_metadata, filter_by_session, get_unique_sessions, get_unique_models, parse_jsonl_fast};
use crate::search::{search_entries, search_entries_detailed, get_unique_tool_names, search_by_tool_name, count_occurrences};

mod types;
mod parser;
mod search;

/// Convert serde_wasm_bindgen::Error to JsValue
fn to_js_error(e: serde_wasm_bindgen::Error) -> JsValue {
    JsValue::from_str(&e.to_string())
}

/// Get the version of the WASM package
#[wasm_bindgen]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Parse JSONL content string into an array of conversation entries (optimized)
///
/// # Arguments
/// * `content` - JSONL content as a string (each line is a JSON object)
///
/// # Returns
/// Array of ConversationEntry objects
#[wasm_bindgen]
pub fn parse_jsonl_wasm(content: String) -> Result<Vec<JsValue>, JsValue> {
    let entries = parse_jsonl_content(&content);

    entries
        .into_iter()
        .map(|entry| serde_wasm_bindgen::to_value(&entry).map_err(to_js_error))
        .collect()
}

/// Fast parse - returns raw JSON objects with minimal processing
/// Use this when you only need basic fields (uuid, session_id, timestamp, role)
///
/// # Arguments
/// * `content` - JSONL content as a string
///
/// # Returns
/// Array of lightweight entry objects
#[wasm_bindgen]
pub fn parse_jsonl_fast_wasm(content: String) -> Result<Vec<JsValue>, JsValue> {
    let entries: Vec<FastEntry> = parse_jsonl_fast(&content);

    entries
        .into_iter()
        .map(|entry| serde_wasm_bindgen::to_value(&entry).map_err(to_js_error))
        .collect()
}

/// Ultra-fast parse - returns a single JSON string for JS-side parsing
/// Avoids individual object conversion overhead
///
/// # Arguments
/// * `content` - JSONL content as a string
///
/// # Returns
/// JSON array string (parse with JSON.parse in JS)
#[wasm_bindgen]
pub fn parse_jsonl_ultra_fast_wasm(content: String) -> Result<String, JsValue> {
    let entries: Vec<FastEntry> = parse_jsonl_fast(&content);
    serde_json::to_string(&entries).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Direct JS - creates JS objects directly without serde_wasm_bindgen
/// This bypasses the serialization overhead entirely
///
/// # Arguments
/// * `content` - JSONL content as a string
///
/// # Returns
/// Array of JS objects
#[wasm_bindgen]
pub fn parse_jsonl_direct_js(content: String) -> Result<js_sys::Array, JsValue> {
    use js_sys::{Array, Object, Reflect, JsString};

    let arr = Array::new();

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        // Parse to generic Value first
        let value: serde_json::Value = match serde_json::from_str(line) {
            Ok(v) => v,
            Err(_) => continue,
        };

        // Extract only the fields we need and create JS object directly
        if let serde_json::Value::Object(map) = value {
            let obj = Object::new();

            // Direct field extraction - no intermediate structs
            if let Some(v) = map.get("uuid").and_then(|v| v.as_str()) {
                Reflect::set(&obj, &JsString::from("uuid"), &JsString::from(v))
                    .map_err(|e| JsValue::from_str(&format!("{:?}", e)))?;
            }
            if let Some(v) = map.get("session_id").and_then(|v| v.as_str()) {
                Reflect::set(&obj, &JsString::from("session_id"), &JsString::from(v))
                    .map_err(|e| JsValue::from_str(&format!("{:?}", e)))?;
            }
            if let Some(v) = map.get("timestamp").and_then(|v| v.as_str()) {
                Reflect::set(&obj, &JsString::from("timestamp"), &JsString::from(v))
                    .map_err(|e| JsValue::from_str(&format!("{:?}", e)))?;
            }
            if let Some(v) = map.get("role").and_then(|v| v.as_str()) {
                Reflect::set(&obj, &JsString::from("role"), &JsString::from(v))
                    .map_err(|e| JsValue::from_str(&format!("{:?}", e)))?;
            }

            arr.push(&obj);
        }
    }

    Ok(arr)
}

/// Hybrid approach - WASM validates and extracts lines, JS does parsing
/// Returns array of [start, end] byte positions for each valid JSON line
///
/// # Arguments
/// * `content` - JSONL content as a string
///
/// # Returns
/// Array of [start, end] positions for valid lines
#[wasm_bindgen]
pub fn parse_jsonl_hybrid(content: String) -> js_sys::Array {
    use js_sys::Array;

    let arr = Array::new();
    let mut pos = 0u32;

    for line in content.lines() {
        let line_start = pos;
        let line_len = line.len() as u32;
        let line_end = line_start + line_len;

        // Skip empty lines
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            // Quick validation: check if line starts with '{' and ends with '}'
            if trimmed.starts_with('{') && trimmed.ends_with('}') {
                let pair = Array::new();
                pair.push(&js_sys::Number::from(line_start));
                pair.push(&js_sys::Number::from(line_end));
                arr.push(&pair);
            }
        }

        // Move past this line and the newline
        pos = line_end + 1; // +1 for the newline character
    }

    arr
}

/// Passthrough - just returns the content, used to measure WASM boundary overhead
#[wasm_bindgen]
pub fn passthrough(content: String) -> String {
    content
}

/// Count lines - minimal WASM work, used to measure string encoding overhead
#[wasm_bindgen]
pub fn count_lines(content: String) -> u32 {
    content.lines().filter(|l| !l.trim().is_empty()).count() as u32
}

/// Parse JSONL content with metadata
///
/// # Arguments
/// * `content` - JSONL content as a string
/// * `file_path` - Optional file path for metadata
///
/// # Returns
/// Object with `entries` array and `metadata` object
#[wasm_bindgen]
pub fn parse_jsonl_with_metadata(content: String, file_path: String) -> Result<JsValue, JsValue> {
    let (entries, metadata) = parse_with_metadata(&content, &file_path);
    
    // Convert entries to JsValue array
    let entries_js: Result<Vec<JsValue>, _> = entries
        .into_iter()
        .map(|entry| serde_wasm_bindgen::to_value(&entry).map_err(to_js_error))
        .collect();
    
    let entries_js = entries_js?;
    
    // Create result object manually
    let result = js_sys::Object::new();
    js_sys::Reflect::set(
        &result,
        &JsValue::from_str("entries"),
        &js_sys::Array::from_iter(entries_js.into_iter()).into(),
    ).map_err(|e| JsValue::from_str(&format!("Failed to set entries: {:?}", e)))?;
    
    let metadata_js = serde_wasm_bindgen::to_value(&metadata).map_err(to_js_error)?;
    js_sys::Reflect::set(
        &result,
        &JsValue::from_str("metadata"),
        &metadata_js,
    ).map_err(|e| JsValue::from_str(&format!("Failed to set metadata: {:?}", e)))?;
    
    Ok(result.into())
}

/// Search entries for a query string
///
/// # Arguments
/// * `entries` - Array of ConversationEntry objects (from parse_jsonl_wasm)
/// * `query` - Search query string
///
/// # Returns
/// Filtered array of ConversationEntry objects
#[wasm_bindgen]
pub fn search_entries_wasm(entries: Vec<JsValue>, query: String) -> Result<Vec<JsValue>, JsValue> {
    let parsed_entries: Result<Vec<ConversationEntry>, _> = entries
        .into_iter()
        .map(|js_val| serde_wasm_bindgen::from_value(js_val).map_err(to_js_error))
        .collect();
    
    let parsed_entries = parsed_entries?;
    let results = search_entries(&parsed_entries, &query);
    
    results
        .into_iter()
        .map(|entry| serde_wasm_bindgen::to_value(&entry).map_err(to_js_error))
        .collect()
}

/// Search entries with detailed options
///
/// # Arguments
/// * `entries` - Array of ConversationEntry objects
/// * `query` - Search query string
/// * `options` - SearchOptions object (case_sensitive, include_tools, etc.)
///
/// # Returns
/// Array of SearchResult objects with entry and match context
#[wasm_bindgen]
pub fn search_entries_detailed_wasm(
    entries: Vec<JsValue>,
    query: String,
    options: JsValue,
) -> Result<Vec<JsValue>, JsValue> {
    let parsed_entries: Result<Vec<ConversationEntry>, _> = entries
        .into_iter()
        .map(|js_val| serde_wasm_bindgen::from_value(js_val).map_err(to_js_error))
        .collect();
    
    let search_options: SearchOptions = if options.is_undefined() || options.is_null() {
        SearchOptions::default()
    } else {
        serde_wasm_bindgen::from_value(options).map_err(to_js_error)?
    };
    
    let parsed_entries = parsed_entries?;
    let results = search_entries_detailed(&parsed_entries, &query, search_options);
    
    results
        .into_iter()
        .map(|result| serde_wasm_bindgen::to_value(&result).map_err(to_js_error))
        .collect()
}

/// Get unique session IDs from entries
///
/// # Arguments
/// * `entries` - Array of ConversationEntry objects
///
/// # Returns
/// Array of unique session ID strings
#[wasm_bindgen]
pub fn get_unique_sessions_wasm(entries: Vec<JsValue>) -> Result<Vec<JsValue>, JsValue> {
    let parsed_entries: Result<Vec<ConversationEntry>, _> = entries
        .into_iter()
        .map(|js_val| serde_wasm_bindgen::from_value(js_val).map_err(to_js_error))
        .collect();
    
    let sessions = get_unique_sessions(&parsed_entries?);
    
    Ok(sessions.into_iter().map(JsValue::from).collect())
}

/// Get unique models used in entries
///
/// # Arguments
/// * `entries` - Array of ConversationEntry objects
///
/// # Returns
/// Array of unique model name strings
#[wasm_bindgen]
pub fn get_unique_models_wasm(entries: Vec<JsValue>) -> Result<Vec<JsValue>, JsValue> {
    let parsed_entries: Result<Vec<ConversationEntry>, _> = entries
        .into_iter()
        .map(|js_val| serde_wasm_bindgen::from_value(js_val).map_err(to_js_error))
        .collect();
    
    let models = get_unique_models(&parsed_entries?);
    
    Ok(models.into_iter().map(JsValue::from).collect())
}

/// Get unique tool names used in entries
///
/// # Arguments
/// * `entries` - Array of ConversationEntry objects
///
/// # Returns
/// Array of unique tool name strings
#[wasm_bindgen]
pub fn get_unique_tools_wasm(entries: Vec<JsValue>) -> Result<Vec<JsValue>, JsValue> {
    let parsed_entries: Result<Vec<ConversationEntry>, _> = entries
        .into_iter()
        .map(|js_val| serde_wasm_bindgen::from_value(js_val).map_err(to_js_error))
        .collect();
    
    let tools = get_unique_tool_names(&parsed_entries?);
    
    Ok(tools.into_iter().map(JsValue::from).collect())
}

/// Filter entries by session ID
///
/// # Arguments
/// * `entries` - Array of ConversationEntry objects
/// * `session_id` - Session ID to filter by
///
/// # Returns
/// Filtered array of ConversationEntry objects
#[wasm_bindgen]
pub fn filter_by_session_wasm(entries: Vec<JsValue>, session_id: String) -> Result<Vec<JsValue>, JsValue> {
    let parsed_entries: Result<Vec<ConversationEntry>, _> = entries
        .into_iter()
        .map(|js_val| serde_wasm_bindgen::from_value(js_val).map_err(to_js_error))
        .collect();
    
    let filtered = filter_by_session(&parsed_entries?, &session_id);
    
    filtered
        .into_iter()
        .map(|entry| serde_wasm_bindgen::to_value(&entry).map_err(to_js_error))
        .collect()
}

/// Search entries by tool name
///
/// # Arguments
/// * `entries` - Array of ConversationEntry objects
/// * `tool_name` - Tool name to search for
///
/// # Returns
/// Filtered array of ConversationEntry objects that use the specified tool
#[wasm_bindgen]
pub fn search_by_tool_wasm(entries: Vec<JsValue>, tool_name: String) -> Result<Vec<JsValue>, JsValue> {
    let parsed_entries: Result<Vec<ConversationEntry>, _> = entries
        .into_iter()
        .map(|js_val| serde_wasm_bindgen::from_value(js_val).map_err(to_js_error))
        .collect();
    
    let results = search_by_tool_name(&parsed_entries?, &tool_name);
    
    results
        .into_iter()
        .map(|entry| serde_wasm_bindgen::to_value(&entry).map_err(to_js_error))
        .collect()
}

/// Count occurrences of a query in entries
///
/// # Arguments
/// * `entries` - Array of ConversationEntry objects
/// * `query` - Query string to count
/// * `case_sensitive` - Whether to search case-sensitively
///
/// # Returns
/// Number of occurrences
#[wasm_bindgen]
pub fn count_occurrences_wasm(entries: Vec<JsValue>, query: String, case_sensitive: bool) -> Result<usize, JsValue> {
    let parsed_entries: Result<Vec<ConversationEntry>, _> = entries
        .into_iter()
        .map(|js_val| serde_wasm_bindgen::from_value(js_val).map_err(to_js_error))
        .collect();
    
    Ok(count_occurrences(&parsed_entries?, &query, case_sensitive))
}

/// Initialize the WASM module (placeholder for future panic hook setup)
#[wasm_bindgen]
pub fn init_wasm() {
    // Placeholder for panic hook if needed in the future
}

// Console logging utilities for debugging
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

/// Log a message to the browser/Node console (for debugging)
#[wasm_bindgen]
pub fn console_log(message: String) {
    log(&message);
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_version() {
        assert_eq!(get_version(), "0.1.0");
    }
}
