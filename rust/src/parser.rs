//! High-performance JSONL parser for Claude Code history files
//!
//! Uses memory-mapped I/O and parallel processing for maximum speed.

use memmap2::Mmap;
use rayon::prelude::*;
use std::fs::File;
use std::path::Path;
use walkdir::WalkDir;

use crate::types::*;
use crate::utils::*;

/// Fast directory parser - parses all JSONL files in a directory
///
/// Uses memory-mapped I/O and parallel processing for maximum speed.
/// This is the equivalent of `parseDirFast` from @ebowwa/jsonl-hft
pub fn parse_dir_fast(dir_path: &str) -> Vec<ParsedEntry> {
    let path = Path::new(dir_path);

    if !path.exists() || !path.is_dir() {
        return Vec::new();
    }

    // Collect all JSONL files
    let jsonl_files: Vec<_> = WalkDir::new(path)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map_or(false, |ext| ext == "jsonl"))
        .map(|e| e.path().to_path_buf())
        .collect();

    // Parse files in parallel
    jsonl_files
        .par_iter()
        .flat_map(|file_path| parse_file_fast(file_path))
        .collect()
}

/// Fast file parser - parses a single JSONL file using memory-mapped I/O
pub fn parse_file_fast(file_path: &Path) -> Vec<ParsedEntry> {
    let file = match File::open(file_path) {
        Ok(f) => f,
        Err(_) => return Vec::new(),
    };

    let mmap = match unsafe { Mmap::map(&file) } {
        Ok(m) => m,
        Err(_) => return Vec::new(),
    };

    let file_path_str = file_path.to_string_lossy().to_string();

    // Parse lines in parallel using rayon
    mmap.split(|&b| b == b'\n')
        .par_bridge()
        .filter_map(|line| parse_line_fast(line, &file_path_str))
        .collect()
}

/// Parse a single line into a ParsedEntry
fn parse_line_fast(line: &[u8], file_path: &str) -> Option<ParsedEntry> {
    // Skip empty lines
    let trimmed = trim_whitespace(line);
    if trimmed.is_empty() {
        return None;
    }

    // Quick validation: must start with '{' and end with '}'
    if trimmed.first()? != &b'{' || trimmed.last()? != &b'}' {
        return None;
    }

    // Parse JSON
    let value: serde_json::Value = serde_json::from_slice(trimmed).ok()?;

    // Extract fields with minimal allocations
    let obj = value.as_object()?;

    let uuid = obj.get("uuid")?.as_str()?.to_string();
    let session_id = obj.get("sessionId")?.as_str()?.to_string();
    let timestamp = obj.get("timestamp")?.as_str()?.to_string();

    // Extract type/role
    let message_type = obj.get("type").and_then(|v| v.as_str()).unwrap_or("user");
    let role = message_type.to_string();

    // Extract content from message.content
    let content = extract_content(obj).unwrap_or_default();

    Some(ParsedEntry {
        uuid,
        session_id,
        timestamp,
        role,
        content,
        file_path: file_path.to_string(),
    })
}

/// Extract content from the message field
fn extract_content(obj: &serde_json::Map<String, serde_json::Value>) -> Option<String> {
    let message = obj.get("message")?.as_object()?;
    let content = message.get("content")?;

    match content {
        serde_json::Value::String(s) => Some(s.clone()),
        serde_json::Value::Array(arr) => {
            let texts: Vec<_> = arr
                .iter()
                .filter_map(|item| {
                    if let serde_json::Value::String(s) = item {
                        Some(s.clone())
                    } else if let Some(text) = item.get("text").and_then(|t| t.as_str()) {
                        Some(text.to_string())
                    } else {
                        None
                    }
                })
                .collect();
            Some(texts.join(" "))
        }
        _ => None,
    }
}

/// Trim whitespace from bytes
fn trim_whitespace(bytes: &[u8]) -> &[u8] {
    let start = bytes.iter().position(|&b| !b.is_ascii_whitespace()).unwrap_or(0);
    let end = bytes
        .iter()
        .rposition(|&b| !b.is_ascii_whitespace())
        .map(|i| i + 1)
        .unwrap_or(0);
    &bytes[start..end]
}

/// Parse a JSONL file into ConversationEntry objects
pub fn parse_jsonl_file(
    file_path: &Path,
    project_dir: &str,
    start_date: Option<&str>,
    end_date: Option<&str>,
) -> Vec<ConversationEntry> {
    let file = match File::open(file_path) {
        Ok(f) => f,
        Err(_) => return Vec::new(),
    };

    let mmap = match unsafe { Mmap::map(&file) } {
        Ok(m) => m,
        Err(_) => return Vec::new(),
    };

    let project_path = decode_project_path(project_dir);

    mmap.split(|&b| b == b'\n')
        .filter_map(|line| {
            let trimmed = trim_whitespace(line);
            if trimmed.is_empty() {
                return None;
            }

            let msg: ClaudeCodeMessage = serde_json::from_slice(trimmed).ok()?;

            // Date filtering
            if let Some(start) = start_date {
                if msg.timestamp.as_str() < start {
                    return None;
                }
            }
            if let Some(end) = end_date {
                if msg.timestamp.as_str() > end {
                    return None;
                }
            }

            convert_message_to_entry(msg, &project_path)
        })
        .collect()
}

/// Convert a ClaudeCodeMessage to a ConversationEntry
fn convert_message_to_entry(
    msg: ClaudeCodeMessage,
    project_path: &str,
) -> Option<ConversationEntry> {
    // Extract content
    let content = msg.message.as_ref().map(|m| {
        match &m.content {
            MessageContentValue::String(s) => s.clone(),
            MessageContentValue::Array(blocks) => blocks
                .iter()
                .filter_map(|b| {
                    b.text.clone().or_else(|| {
                        b.block_type
                            .as_ref()
                            .map(|t| format!("[{}]", t))
                    })
                })
                .collect::<Vec<_>>()
                .join(" "),
        }
    }).unwrap_or_default();

    // Calculate time-related fields
    let timestamp = msg.timestamp.clone();
    let (formatted_time, time_ago, local_date) = format_timestamp(&timestamp);

    Some(ConversationEntry {
        session_id: msg.session_id,
        timestamp,
        entry_type: msg.message_type,
        content,
        project_path: project_path.to_string(),
        uuid: msg.uuid,
        formatted_time: Some(formatted_time),
        time_ago: Some(time_ago),
        local_date: Some(local_date),
        metadata: msg.message.map(|m| EntryMetadata {
            usage: m.usage,
            model: m.model,
            request_id: msg.request_id,
            total_cost_usd: None,
            num_turns: None,
            duration_ms: None,
            is_error: None,
            error_type: None,
        }),
    })
}

/// Decode project path from directory name (e.g., "-Users-ebowwa-Desktop-codespaces" -> "/Users/ebowwa/Desktop/codespaces")
fn decode_project_path(project_dir: &str) -> String {
    project_dir
        .replace('-', "/")
        .trim_start_matches('/')
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decode_project_path() {
        assert_eq!(
            decode_project_path("-Users-ebowwa-Desktop-codespaces"),
            "Users/ebowwa/Desktop/codespaces"
        );
    }

    #[test]
    fn test_trim_whitespace() {
        assert_eq!(trim_whitespace(b"  hello  "), b"hello");
        assert_eq!(trim_whitespace(b"\n\ttest\n"), b"test");
        assert_eq!(trim_whitespace(b""), b"");
    }
}
