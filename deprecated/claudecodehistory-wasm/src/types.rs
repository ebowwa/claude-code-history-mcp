//! Type definitions matching TypeScript ConversationEntry interface

use serde::{Deserialize, Serialize};

/// Role of a conversation message
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    User,
    Assistant,
    System,
}

/// Message type classification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MessageType {
    Text,
    ToolUse,
    ToolResult,
    Thinking,
}

/// Tool usage information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolUse {
    pub tool_name: String,
    pub tool_input: Option<serde_json::Value>,
}

/// Tool result information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub tool_name: String,
    pub output: Option<String>,
    pub is_error: Option<bool>,
}

/// Content block within a message
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ContentBlock {
    Text { text: String },
    ToolUse {
        name: String,
        input: Option<serde_json::Value>,
    },
    ToolResult {
        tool_use_id: String,
        content: Option<String>,
        is_error: Option<bool>,
    },
    Thinking { thinking: String },
}

/// A single conversation entry from Claude Code history (full version with DateTime)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationEntry {
    /// Unique identifier for the entry
    pub uuid: String,
    /// Parent UUID for conversation threading
    pub parent_uuid: Option<String>,
    /// Session/conversation ID
    pub session_id: String,
    /// Timestamp of the entry (kept as string to avoid expensive DateTime parsing)
    pub timestamp: String,
    /// Role (user, assistant, system)
    pub role: Role,
    /// Content blocks (text, tool use, tool result)
    #[serde(default)]
    pub content: Vec<ContentBlock>,
    /// Message type classification
    #[serde(rename = "type")]
    pub message_type: Option<MessageType>,
    /// Model used for assistant messages
    pub model: Option<String>,
    /// Token usage statistics
    pub usage: Option<TokenUsage>,
    /// Whether this entry has been edited
    pub is_edited: Option<bool>,
    /// Summary text for the entry
    pub summary: Option<String>,
    /// Raw content as string (for search purposes) - computed lazily
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub raw_content: String,
}

/// Lightweight entry for fast parsing - minimal fields only, no content parsing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FastEntry {
    pub uuid: String,
    pub session_id: String,
    pub timestamp: String,
    pub role: String,  // Keep as string to avoid enum parsing
    // Skip content entirely for maximum speed
}

/// Token usage statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub input_tokens: Option<u64>,
    pub output_tokens: Option<u64>,
    pub cache_creation_input_tokens: Option<u64>,
    pub cache_read_input_tokens: Option<u64>,
}

/// Search options for filtering entries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchOptions {
    /// Case-sensitive search
    #[serde(default)]
    pub case_sensitive: bool,
    /// Search in tool names
    #[serde(default = "default_true")]
    pub include_tools: bool,
    /// Search in tool inputs/outputs
    #[serde(default = "default_true")]
    pub include_tool_content: bool,
    /// Search in thinking blocks
    #[serde(default = "default_true")]
    pub include_thinking: bool,
    /// Filter by role
    pub role: Option<Role>,
    /// Filter by session ID
    pub session_id: Option<String>,
    /// Limit results
    pub limit: Option<usize>,
}

fn default_true() -> bool { true }

impl Default for SearchOptions {
    fn default() -> Self {
        Self {
            case_sensitive: false,
            include_tools: true,
            include_tool_content: true,
            include_thinking: true,
            role: None,
            session_id: None,
            limit: None,
        }
    }
}

/// Parsed conversation file metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationMetadata {
    pub file_path: String,
    pub total_entries: usize,
    pub session_id: String,
    pub first_timestamp: Option<String>,  // Changed from DateTime to String
    pub last_timestamp: Option<String>,   // Changed from DateTime to String
    pub models_used: Vec<String>,
    pub total_tokens: TokenUsage,
}

/// Search result with match context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub entry: ConversationEntry,
    pub match_type: MatchType,
    pub match_context: String,
}

/// Type of search match
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MatchType {
    TextContent,
    ToolName,
    ToolInput,
    ToolOutput,
    Thinking,
    Summary,
}
