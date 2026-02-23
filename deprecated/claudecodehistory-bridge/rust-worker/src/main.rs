//! Claude Code History Parser Worker
//!
//! Parses Claude Code history JSONL files via stdin/stdout using MessagePack binary protocol.
//! Uses SIMD-accelerated JSON parsing for performance.
//!
//! Protocol:
//! - Frame format: 4-byte length (big-endian u32) + MessagePack payload
//! - Request/Response matching via `id` field

use byteorder::{BigEndian, ReadBytesExt, WriteBytesExt};
use serde::{Deserialize, Serialize};
use std::io::{self, Read, Write};
use simd_json::prelude::*;  // Import traits for OwnedValue access

// ============================================================================
// JSON-RPC Protocol (MessagePack serialized)
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
struct Request {
    jsonrpc: String,
    id: String,
    method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    params: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
struct Response<T: Serialize> {
    jsonrpc: String,
    id: String,
    result: T,
}

#[derive(Debug, Serialize)]
struct ErrorObject {
    code: i32,
    message: String,
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    jsonrpc: String,
    id: String,
    error: ErrorObject,
}

// ============================================================================
// Domain Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConversationEntry {
    session_id: String,
    timestamp: String,
    role: String,
    content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_input: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    file_path: Option<String>,
}

#[derive(Debug, Serialize)]
struct ParseResult {
    entries: Vec<ConversationEntry>,
    count: usize,
    errors: Vec<String>,
    parse_time_ms: u64,
}

#[derive(Debug, Serialize)]
struct SearchResult {
    entries: Vec<ConversationEntry>,
    total: usize,
    query: String,
}

#[derive(Debug, Serialize)]
struct WorkerInfo {
    version: String,
    os: String,
    arch: String,
    simd: bool,
    protocol: String,
}

// ============================================================================
// Handlers
// ============================================================================

fn handle_info() -> WorkerInfo {
    WorkerInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        simd: true,
        protocol: "msgpack".to_string(),
    }
}

fn handle_parse_content(params: Option<serde_json::Value>) -> Result<ParseResult, String> {
    let start = std::time::Instant::now();
    let params = params.ok_or("Missing params")?;

    // Extract content string
    let content = params
        .get("content")
        .and_then(|v| v.as_str())
        .ok_or("Missing 'content' param")?;

    let mut entries = Vec::new();
    let mut errors = Vec::new();

    for (line_num, line) in content.lines().enumerate() {
        if line.trim().is_empty() {
            continue;
        }

        match parse_jsonl_line_simd(line) {
            Ok(entry) => entries.push(entry),
            Err(e) => errors.push(format!("Line {}: {}", line_num + 1, e)),
        }
    }

    Ok(ParseResult {
        count: entries.len(),
        entries,
        errors,
        parse_time_ms: start.elapsed().as_millis() as u64,
    })
}

fn handle_parse_content_fast(params: Option<serde_json::Value>) -> Result<ParseResult, String> {
    let start = std::time::Instant::now();
    let params = params.ok_or("Missing params")?;
    let content = params
        .get("content")
        .and_then(|v| v.as_str())
        .ok_or("Missing 'content' param")?;

    // Fast path: just count lines, no parsing
    let count = content.lines().filter(|l| !l.trim().is_empty()).count();

    Ok(ParseResult {
        count,
        entries: Vec::new(), // No entries for fast path
        errors: Vec::new(),
        parse_time_ms: start.elapsed().as_millis() as u64,
    })
}

fn handle_search(params: Option<serde_json::Value>) -> Result<SearchResult, String> {
    let params = params.ok_or("Missing params")?;

    // Extract entries array
    let entries_val = params.get("entries").ok_or("Missing 'entries' param")?;
    let entries: Vec<ConversationEntry> = serde_json::from_value(entries_val.clone())
        .map_err(|e| format!("Invalid entries: {}", e))?;

    let query = params
        .get("query")
        .and_then(|v| v.as_str())
        .ok_or("Missing 'query' param")?
        .to_lowercase();

    let limit = params
        .get("limit")
        .and_then(|v| v.as_u64())
        .unwrap_or(100) as usize;

    let matching: Vec<ConversationEntry> = entries
        .into_iter()
        .filter(|e| {
            e.content.to_lowercase().contains(&query)
                || e.role.to_lowercase().contains(&query)
                || e.tool_name
                    .as_ref()
                    .map(|t| t.to_lowercase().contains(&query))
                    .unwrap_or(false)
        })
        .take(limit)
        .collect();

    let total = matching.len();
    Ok(SearchResult {
        entries: matching,
        total,
        query,
    })
}

// ============================================================================
// SIMD JSON Parsing
// ============================================================================

/// Parse a single JSONL line using SIMD-accelerated parser
fn parse_jsonl_line_simd(line: &str) -> Result<ConversationEntry, String> {
    // simd-json requires mutable bytes
    let mut bytes = line.as_bytes().to_vec();

    // Use SIMD-accelerated parsing
    let raw: simd_json::OwnedValue =
        simd_json::to_owned_value(&mut bytes).map_err(|e| format!("JSON parse error: {}", e))?;

    // Extract fields from the owned value
    let session_id = raw
        .get("session_id")
        .and_then(|v| v.as_str())
        .or_else(|| raw.get("sessionId").and_then(|v| v.as_str()))
        .or_else(|| raw.get("uuid").and_then(|v| v.as_str()))
        .unwrap_or("unknown")
        .to_string();

    let timestamp = raw
        .get("timestamp")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let role = raw
        .get("role")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();

    let content = extract_content_simd(&raw);

    let tool_name = raw
        .get("tool_name")
        .and_then(|v| v.as_str())
        .or_else(|| raw.get("toolName").and_then(|v| v.as_str()))
        .map(|s| s.to_string());

    let tool_input = raw.get("tool_input")
        .or_else(|| raw.get("toolInput"))
        .and_then(|v| simd_value_to_serde_value(v));

    let file_path = raw
        .get("file_path")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    Ok(ConversationEntry {
        session_id,
        timestamp,
        role,
        content,
        tool_name,
        tool_input,
        file_path,
    })
}

/// Extract content from simd-json OwnedValue
fn extract_content_simd(raw: &simd_json::OwnedValue) -> String {
    // Try content array (blocks)
    if let Some(blocks) = raw.get("content").and_then(|v| v.as_array()) {
        let texts: Vec<String> = blocks
            .iter()
            .filter_map(|block| {
                if block.get("type").and_then(|t| t.as_str()) == Some("text") {
                    block.get("text").and_then(|t| t.as_str()).map(|s| s.to_string())
                } else {
                    None
                }
            })
            .collect();
        if !texts.is_empty() {
            return texts.join(" ");
        }
    }

    // Try direct content field (string)
    if let Some(content) = raw.get("content").and_then(|v| v.as_str()) {
        return content.to_string();
    }

    String::new()
}

/// Convert simd-json OwnedValue to serde_json Value
fn simd_value_to_serde_value(value: &simd_json::OwnedValue) -> Option<serde_json::Value> {
    serde_json::to_value(value).ok()
}

// ============================================================================
// MessagePack Frame Protocol
// ============================================================================

/// Read a MessagePack frame from stdin
fn read_frame() -> io::Result<Vec<u8>> {
    let mut stdin = io::stdin();
    let len = stdin.read_u32::<BigEndian>()? as usize;

    let mut buf = vec![0u8; len];
    stdin.read_exact(&mut buf)?;
    Ok(buf)
}

/// Write a MessagePack frame to stdout
fn write_frame(data: &[u8]) -> io::Result<()> {
    let mut stdout = io::stdout();
    stdout.write_u32::<BigEndian>(data.len() as u32)?;
    stdout.write_all(data)?;
    stdout.flush()
}

/// Send a success response
fn send_response<T: Serialize>(id: String, result: T) -> io::Result<()> {
    let response = Response {
        jsonrpc: "2.0".to_string(),
        id,
        result,
    };
    // Use to_vec_named for map-based serialization (objects, not arrays)
    let encoded = rmp_serde::to_vec_named(&response)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
    write_frame(&encoded)
}

/// Send an error response
fn send_error(id: String, code: i32, message: String) -> io::Result<()> {
    let response = ErrorResponse {
        jsonrpc: "2.0".to_string(),
        id,
        error: ErrorObject { code, message },
    };
    // Use to_vec_named for map-based serialization (objects, not arrays)
    let encoded = rmp_serde::to_vec_named(&response)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?;
    write_frame(&encoded)
}

// ============================================================================
// Main Event Loop
// ============================================================================

fn main() {
    eprintln!("[worker] Claude Code History Worker started (MessagePack + SIMD)");

    loop {
        // Read frame
        let frame = match read_frame() {
            Ok(f) => f,
            Err(e) => {
                if e.kind() == io::ErrorKind::UnexpectedEof {
                    eprintln!("[worker] EOF received, shutting down");
                    break;
                }
                eprintln!("[worker] Failed to read frame: {}", e);
                continue;
            }
        };

        // Decode MessagePack request
        let request: Request = match rmp_serde::from_slice(&frame) {
            Ok(r) => r,
            Err(e) => {
                eprintln!("[worker] Failed to decode request: {}", e);
                let _ = send_error("unknown".to_string(), -32700, format!("Parse error: {}", e));
                continue;
            }
        };

        let id = request.id.clone();

        // Route to handler
        let result: Result<serde_json::Value, String> = match request.method.as_str() {
            "worker.info" => {
                serde_json::to_value(handle_info()).map_err(|e| e.to_string())
            }
            "parser.parseContent" => {
                handle_parse_content(request.params)
                    .and_then(|r| serde_json::to_value(r).map_err(|e| e.to_string()))
            }
            "parser.parseContentFast" => {
                handle_parse_content_fast(request.params)
                    .and_then(|r| serde_json::to_value(r).map_err(|e| e.to_string()))
            }
            "parser.search" => {
                handle_search(request.params)
                    .and_then(|r| serde_json::to_value(r).map_err(|e| e.to_string()))
            }
            _ => Err(format!("Unknown method: {}", request.method)),
        };

        // Send response
        match result {
            Ok(value) => {
                // Convert serde_json::Value to serializable form and send
                let response = Response {
                    jsonrpc: "2.0".to_string(),
                    id,
                    result: value,
                };
                // Use to_vec_named for map-based serialization
                match rmp_serde::to_vec_named(&response) {
                    Ok(encoded) => {
                        if let Err(e) = write_frame(&encoded) {
                            eprintln!("[worker] Failed to write response: {}", e);
                        }
                    }
                    Err(e) => {
                        eprintln!("[worker] Failed to encode response: {}", e);
                    }
                }
            }
            Err(e) => {
                if let Err(e) = send_error(id, -32603, e) {
                    eprintln!("[worker] Failed to send error: {}", e);
                }
            }
        }
    }

    eprintln!("[worker] Shutting down");
}
