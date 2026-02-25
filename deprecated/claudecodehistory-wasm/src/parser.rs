//! JSONL parsing logic for Claude Code history files

use crate::types::{ConversationEntry, ContentBlock, ConversationMetadata, TokenUsage, FastEntry};

/// Parse JSONL content string into a vector of conversation entries (fast path)
pub fn parse_jsonl_content(content: &str) -> Vec<ConversationEntry> {
    content
        .lines()
        .filter(|line| !line.trim().is_empty())
        .filter_map(|line| parse_single_entry(line))
        .collect()
}

/// Parse JSONL content with fast path - returns raw JSON values to avoid struct conversion overhead
pub fn parse_jsonl_fast(content: &str) -> Vec<FastEntry> {
    content
        .lines()
        .filter(|line| !line.trim().is_empty())
        .filter_map(|line| serde_json::from_str(line).ok())
        .collect()
}

/// Parse a single JSONL line into a ConversationEntry (optimized - skips raw_content)
fn parse_single_entry(line: &str) -> Option<ConversationEntry> {
    // Direct parse - no post-processing to keep it fast
    serde_json::from_str(line).ok()
}

/// Extract all text content from an entry for search (lazy - only call when needed)
pub fn extract_raw_content(entry: &ConversationEntry) -> String {
    let mut parts = Vec::new();

    for block in &entry.content {
        match block {
            ContentBlock::Text { text } => {
                parts.push(text.as_str());
            }
            ContentBlock::ToolUse { name, .. } => {
                parts.push(name.as_str());
            }
            ContentBlock::ToolResult { content, .. } => {
                if let Some(content_str) = content {
                    parts.push(content_str.as_str());
                }
            }
            ContentBlock::Thinking { thinking } => {
                parts.push(thinking.as_str());
            }
        }
    }

    if let Some(ref summary) = entry.summary {
        parts.push(summary.as_str());
    }

    parts.join(" ")
}

/// Parse JSONL content and return metadata about the conversation
pub fn parse_with_metadata(content: &str, file_path: &str) -> (Vec<ConversationEntry>, ConversationMetadata) {
    let entries = parse_jsonl_content(content);

    let total_entries = entries.len();

    // Extract session ID from first entry
    let session_id = entries
        .first()
        .map(|e| e.session_id.clone())
        .unwrap_or_default();

    // Get timestamp range (now as strings, no DateTime parsing)
    let first_timestamp = entries.first().map(|e| e.timestamp.clone());
    let last_timestamp = entries.last().map(|e| e.timestamp.clone());

    // Collect unique models
    let models_used: Vec<String> = entries
        .iter()
        .filter_map(|e| e.model.clone())
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();

    // Sum token usage
    let total_tokens = calculate_total_tokens(&entries);

    let metadata = ConversationMetadata {
        file_path: file_path.to_string(),
        total_entries,
        session_id,
        first_timestamp,
        last_timestamp,
        models_used,
        total_tokens,
    };

    (entries, metadata)
}

/// Calculate total token usage across all entries
fn calculate_total_tokens(entries: &[ConversationEntry]) -> TokenUsage {
    let mut input_tokens = 0u64;
    let mut output_tokens = 0u64;
    let mut cache_creation_input_tokens = 0u64;
    let mut cache_read_input_tokens = 0u64;

    for entry in entries {
        if let Some(ref usage) = entry.usage {
            if let Some(v) = usage.input_tokens {
                input_tokens += v;
            }
            if let Some(v) = usage.output_tokens {
                output_tokens += v;
            }
            if let Some(v) = usage.cache_creation_input_tokens {
                cache_creation_input_tokens += v;
            }
            if let Some(v) = usage.cache_read_input_tokens {
                cache_read_input_tokens += v;
            }
        }
    }

    TokenUsage {
        input_tokens: Some(input_tokens),
        output_tokens: Some(output_tokens),
        cache_creation_input_tokens: Some(cache_creation_input_tokens),
        cache_read_input_tokens: Some(cache_read_input_tokens),
    }
}

/// Filter entries by session ID (returns owned entries)
pub fn filter_by_session(entries: &[ConversationEntry], session_id: &str) -> Vec<ConversationEntry> {
    entries
        .iter()
        .filter(|e| e.session_id == session_id)
        .cloned()
        .collect()
}

/// Get unique session IDs from entries
pub fn get_unique_sessions(entries: &[ConversationEntry]) -> Vec<String> {
    entries
        .iter()
        .map(|e| e.session_id.clone())
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect()
}

/// Get unique models used in entries
pub fn get_unique_models(entries: &[ConversationEntry]) -> Vec<String> {
    entries
        .iter()
        .filter_map(|e| e.model.clone())
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_empty_content() {
        let result = parse_jsonl_content("");
        assert!(result.is_empty());
    }

    #[test]
    fn test_parse_single_entry() {
        let jsonl = r#"{"uuid":"test-123","session_id":"session-1","timestamp":"2024-01-01T00:00:00Z","role":"user","content":[{"type":"text","text":"Hello"}]}"#;
        let result = parse_jsonl_content(jsonl);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].uuid, "test-123");
        assert_eq!(result[0].session_id, "session-1");
    }

    #[test]
    fn test_parse_multiple_entries() {
        let jsonl = r#"{"uuid":"test-1","session_id":"session-1","timestamp":"2024-01-01T00:00:00Z","role":"user","content":[{"type":"text","text":"Hello"}]}
{"uuid":"test-2","session_id":"session-1","timestamp":"2024-01-01T00:01:00Z","role":"assistant","content":[{"type":"text","text":"Hi there!"}]}"#;
        let result = parse_jsonl_content(jsonl);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_skip_invalid_lines() {
        let jsonl = r#"{"uuid":"test-1","session_id":"session-1","timestamp":"2024-01-01T00:00:00Z","role":"user","content":[{"type":"text","text":"Hello"}]}
invalid json line
{"uuid":"test-2","session_id":"session-1","timestamp":"2024-01-01T00:01:00Z","role":"assistant","content":[{"type":"text","text":"Hi!"}]}"#;
        let result = parse_jsonl_content(jsonl);
        assert_eq!(result.len(), 2); // Invalid line should be skipped
    }

    #[test]
    fn test_fast_parse() {
        let jsonl = r#"{"uuid":"test-1","session_id":"session-1","timestamp":"2024-01-01T00:00:00Z","role":"user","content":[{"type":"text","text":"Hello"}]}"#;
        let result: Vec<FastEntry> = parse_jsonl_fast(jsonl);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].uuid, "test-1");
    }
}
