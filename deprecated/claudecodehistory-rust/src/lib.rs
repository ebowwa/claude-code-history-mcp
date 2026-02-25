//! claudecodehistory-rust
//!
//! High-performance Claude Code history parser with FFI bindings for Bun.
//!
//! This library provides:
//! - Fast JSONL parsing using memory-mapped files
//! - Parallel batch processing with rayon
//! - Text search across conversation entries
//! - C-compatible FFI bindings for Node.js/Bun integration
//!
//! # Example
//!
//! ```rust
//! use claudecodehistory_rust::parser::parse_jsonl_file;
//! use claudecodehistory_rust::search::search_entries;
//!
//! // Parse a single file
//! let entries = parse_jsonl_file("history.jsonl").unwrap();
//!
//! // Search for entries
//! let matches = search_entries(&entries, "query");
//! println!("Found {} matching entries", matches.len());
//! ```

pub mod error;
pub mod ffi;
pub mod parser;
pub mod search;
pub mod types;

// Re-export main types for convenience
pub use error::{HistoryError, Result};
pub use types::{
    ClaudeCodeMessage,
    ContentBlock,
    ConversationEntry,
    HistoryQueryOptions,
    MessageContent,
    ProjectInfo,
    SessionInfo,
};

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_library_exports() {
        // Ensure all public types are accessible
        let _ = types::ConversationEntry::default();
        let _ = types::HistoryQueryOptions::default();
    }
}
