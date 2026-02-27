//! Type definitions matching the TypeScript history-service.ts API
//!
//! These types are designed to be serializable for NAPI bindings
//! and match the TypeScript interfaces exactly.

use serde::{Deserialize, Serialize};

/// Raw message from Claude Code JSONL files
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeCodeMessage {
    pub parent_uuid: Option<String>,
    pub is_sidechain: bool,
    pub user_type: String,
    pub cwd: String,
    pub session_id: String,
    pub version: String,
    #[serde(rename = "type")]
    pub message_type: MessageType,
    pub message: Option<MessageContent>,
    pub uuid: String,
    pub timestamp: String,
    pub request_id: Option<String>,
}

/// Message type enum
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum MessageType {
    User,
    Assistant,
    System,
    Result,
}

/// Message content structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageContent {
    pub role: String,
    pub content: MessageContentValue,
    pub model: Option<String>,
    pub usage: Option<serde_json::Value>,
}

/// Message content can be string or array
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MessageContentValue {
    String(String),
    Array(Vec<ContentBlock>),
}

/// Content block for array messages
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentBlock {
    #[serde(rename = "type")]
    pub block_type: Option<String>,
    pub text: Option<String>,
}

/// Processed conversation entry for API responses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationEntry {
    pub session_id: String,
    pub timestamp: String,
    #[serde(rename = "type")]
    pub entry_type: MessageType,
    pub content: String,
    pub project_path: String,
    pub uuid: String,
    pub formatted_time: Option<String>,
    pub time_ago: Option<String>,
    pub local_date: Option<String>,
    pub metadata: Option<EntryMetadata>,
}

/// Metadata for conversation entries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntryMetadata {
    pub usage: Option<serde_json::Value>,
    pub total_cost_usd: Option<f64>,
    pub num_turns: Option<u32>,
    pub duration_ms: Option<u64>,
    pub is_error: Option<bool>,
    pub error_type: Option<String>,
    pub model: Option<String>,
    pub request_id: Option<String>,
}

/// Paginated response for conversation history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedConversationResponse {
    pub entries: Vec<ConversationEntry>,
    pub pagination: Pagination,
}

/// Pagination metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pagination {
    pub total_count: usize,
    pub limit: usize,
    pub offset: usize,
    pub has_more: bool,
}

/// Options for querying conversation history
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct HistoryQueryOptions {
    pub session_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
    pub timezone: Option<String>,
    pub message_types: Option<Vec<MessageType>>,
}

/// Options for listing sessions
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SessionListOptions {
    pub project_path: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub timezone: Option<String>,
}

/// Project information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub project_path: String,
    pub session_count: usize,
    pub message_count: usize,
    pub last_activity_time: String,
}

/// Session information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    pub session_id: String,
    pub project_path: String,
    pub start_time: String,
    pub end_time: String,
    pub message_count: usize,
    pub user_message_count: usize,
    pub assistant_message_count: usize,
    pub first_user_message: Option<String>,
    pub duration_ms: Option<u64>,
    pub duration_formatted: Option<String>,
    pub has_errors: Option<bool>,
    pub project_name: Option<String>,
}

/// Search options
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SearchOptions {
    pub limit: Option<usize>,
    pub project_path: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub timezone: Option<String>,
}

/// Current session information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrentSessionInfo {
    pub session_id: String,
    pub timestamp: String,
    pub project_path: Option<String>,
    pub display: Option<String>,
}

/// Session process information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionProcessInfo {
    pub session_id: String,
    pub pid: u32,
    pub command: String,
    pub alive: bool,
}

/// Recent activity options
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RecentActivityOptions {
    pub limit: Option<usize>,
    pub include_summaries: Option<bool>,
}

/// Recent activity item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentActivityItem {
    pub session_id: String,
    pub project_path: String,
    pub project_name: String,
    pub timestamp: String,
    pub asked: String,
    pub done: Option<String>,
    pub time_ago: String,
}

/// Fast parsed entry (minimal fields for quick processing)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FastEntry {
    pub uuid: String,
    pub session_id: String,
    pub timestamp: String,
    pub role: Option<String>,
    pub content: Option<String>,
}

/// Parsed entry from the fast parser
#[derive(Debug, Clone)]
pub struct ParsedEntry {
    pub uuid: String,
    pub session_id: String,
    pub timestamp: String,
    pub role: String,
    pub content: String,
    pub file_path: String,
}

impl Default for MessageType {
    fn default() -> Self {
        Self::User
    }
}

impl std::fmt::Display for MessageType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MessageType::User => write!(f, "user"),
            MessageType::Assistant => write!(f, "assistant"),
            MessageType::System => write!(f, "system"),
            MessageType::Result => write!(f, "result"),
        }
    }
}

impl From<&str> for MessageType {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "user" => MessageType::User,
            "assistant" => MessageType::Assistant,
            "system" => MessageType::System,
            "result" => MessageType::Result,
            _ => MessageType::User,
        }
    }
}
