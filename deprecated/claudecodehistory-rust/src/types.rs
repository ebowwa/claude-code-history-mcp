//! Type definitions for Claude Code history entries
//!
//! These types mirror the TypeScript types from @ebowwa/claude-code-history
//! for seamless interoperability.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// A single message within a Claude Code conversation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ClaudeCodeMessage {
    /// Message role: "user" or "assistant"
    pub role: String,
    /// Message content (text or structured content)
    pub content: MessageContent,
    /// Optional timestamp
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<DateTime<Utc>>,
}

/// Message content can be a string or structured array
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
pub enum MessageContent {
    /// Simple text content
    Text(String),
    /// Structured content blocks
    Blocks(Vec<ContentBlock>),
}

/// A content block within a message
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ContentBlock {
    /// Block type: "text", "tool_use", "tool_result", etc.
    #[serde(rename = "type")]
    pub block_type: String,
    /// Text content for text blocks
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    /// Tool name for tool_use blocks
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    /// Tool input for tool_use blocks
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input: Option<serde_json::Value>,
    /// Tool result content
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<serde_json::Value>,
    /// Tool use ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_use_id: Option<String>,
    /// Whether the tool result is an error
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_error: Option<bool>,
}

/// A single entry in the conversation history
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ConversationEntry {
    /// Unique entry ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uuid: Option<String>,
    /// Parent entry ID (for threading)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_uuid: Option<String>,
    /// Session ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    /// User message
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_message: Option<ClaudeCodeMessage>,
    /// Assistant response
    #[serde(skip_serializing_if = "Option::is_none")]
    pub assistant_message: Option<ClaudeCodeMessage>,
    /// Raw JSONL line
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw: Option<serde_json::Value>,
    /// Timestamp of the entry
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<DateTime<Utc>>,
    /// Source file path
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_file: Option<String>,
}

impl ConversationEntry {
    /// Create a new conversation entry from a raw JSONL line
    pub fn from_jsonl_line(line: &str, source_file: Option<&str>) -> Result<Self, serde_json::Error> {
        let raw: serde_json::Value = serde_json::from_str(line)?;
        
        // Extract common fields from Claude Code format
        let uuid = raw.get("uuid").and_then(|v| v.as_str()).map(String::from);
        let parent_uuid = raw.get("parentUuid").and_then(|v| v.as_str()).map(String::from);
        let session_id = raw.get("sessionId").and_then(|v| v.as_str()).map(String::from);
        
        // Extract timestamp
        let timestamp = raw.get("timestamp")
            .and_then(|v| v.as_str())
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&Utc));
        
        // Extract user message
        let user_message = raw.get("message")
            .and_then(|m| m.get("content"))
            .map(|content| ClaudeCodeMessage {
                role: "user".to_string(),
                content: parse_content(content),
                timestamp: timestamp.clone(),
            });
        
        // For assistant messages, check if this is a response entry
        let assistant_message = if raw.get("type").and_then(|t| t.as_str()) == Some("assistant") {
            raw.get("message").map(|msg| ClaudeCodeMessage {
                role: "assistant".to_string(),
                content: msg.get("content")
                    .map(parse_content)
                    .unwrap_or(MessageContent::Text(String::new())),
                timestamp: timestamp.clone(),
            })
        } else {
            None
        };
        
        Ok(ConversationEntry {
            uuid,
            parent_uuid,
            session_id,
            user_message,
            assistant_message,
            raw: Some(raw),
            timestamp,
            source_file: source_file.map(String::from),
        })
    }
    
    /// Get all text content from this entry
    pub fn get_text_content(&self) -> String {
        let mut text = String::new();
        
        if let Some(ref msg) = self.user_message {
            text.push_str(&extract_text(&msg.content));
            text.push(' ');
        }
        
        if let Some(ref msg) = self.assistant_message {
            text.push_str(&extract_text(&msg.content));
        }
        
        text.trim().to_string()
    }
}

/// Parse content value into MessageContent enum
fn parse_content(content: &serde_json::Value) -> MessageContent {
    match content {
        serde_json::Value::String(s) => MessageContent::Text(s.clone()),
        serde_json::Value::Array(blocks) => {
            let parsed: Vec<ContentBlock> = blocks
                .iter()
                .filter_map(|b| serde_json::from_value(b.clone()).ok())
                .collect();
            MessageContent::Blocks(parsed)
        }
        _ => MessageContent::Text(String::new()),
    }
}

/// Extract text from MessageContent
fn extract_text(content: &MessageContent) -> String {
    match content {
        MessageContent::Text(s) => s.clone(),
        MessageContent::Blocks(blocks) => {
            blocks
                .iter()
                .filter_map(|b| b.text.clone())
                .collect::<Vec<_>>()
                .join(" ")
        }
    }
}

/// Information about a Claude Code session
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SessionInfo {
    /// Session ID
    pub session_id: String,
    /// Project path
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_path: Option<String>,
    /// First entry timestamp
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at: Option<DateTime<Utc>>,
    /// Last entry timestamp
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_activity: Option<DateTime<Utc>>,
    /// Number of entries
    pub entry_count: usize,
    /// Source files
    pub source_files: Vec<String>,
}

/// Information about a Claude Code project
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProjectInfo {
    /// Project path
    pub path: String,
    /// Project name (derived from path)
    pub name: String,
    /// Number of sessions
    pub session_count: usize,
    /// Total entries across all sessions
    pub total_entries: usize,
    /// First activity timestamp
    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_activity: Option<DateTime<Utc>>,
    /// Last activity timestamp
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_activity: Option<DateTime<Utc>>,
}

/// Query options for searching history
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HistoryQueryOptions {
    /// Search query string
    #[serde(skip_serializing_if = "Option::is_none")]
    pub query: Option<String>,
    /// Filter by session ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    /// Filter by project path
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_path: Option<String>,
    /// Filter entries after this timestamp
    #[serde(skip_serializing_if = "Option::is_none")]
    pub after: Option<DateTime<Utc>>,
    /// Filter entries before this timestamp
    #[serde(skip_serializing_if = "Option::is_none")]
    pub before: Option<DateTime<Utc>>,
    /// Maximum number of results
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<usize>,
    /// Offset for pagination
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offset: Option<usize>,
    /// Include raw JSON in results
    #[serde(default)]
    pub include_raw: bool,
    /// Case-sensitive search
    #[serde(default)]
    pub case_sensitive: bool,
}

impl Default for HistoryQueryOptions {
    fn default() -> Self {
        HistoryQueryOptions {
            query: None,
            session_id: None,
            project_path: None,
            after: None,
            before: None,
            limit: Some(100),
            offset: None,
            include_raw: false,
            case_sensitive: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_jsonl_line() {
        let line = r#"{"uuid":"test-123","parentUuid":"parent-456","sessionId":"session-789","timestamp":"2024-01-15T10:30:00Z","message":{"role":"user","content":"Hello Claude"}}"#;
        
        let entry = ConversationEntry::from_jsonl_line(line, Some("/test/history.jsonl")).unwrap();
        
        assert_eq!(entry.uuid, Some("test-123".to_string()));
        assert_eq!(entry.parent_uuid, Some("parent-456".to_string()));
        assert_eq!(entry.session_id, Some("session-789".to_string()));
        assert!(entry.user_message.is_some());
    }
    
    #[test]
    fn test_get_text_content() {
        let entry = ConversationEntry {
            uuid: Some("test".to_string()),
            parent_uuid: None,
            session_id: Some("session".to_string()),
            user_message: Some(ClaudeCodeMessage {
                role: "user".to_string(),
                content: MessageContent::Text("Hello".to_string()),
                timestamp: None,
            }),
            assistant_message: Some(ClaudeCodeMessage {
                role: "assistant".to_string(),
                content: MessageContent::Text("Hi there".to_string()),
                timestamp: None,
            }),
            raw: None,
            timestamp: None,
            source_file: None,
        };
        
        assert_eq!(entry.get_text_content(), "Hello Hi there");
    }
}
