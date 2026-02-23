//! Error types for claudecodehistory-rust

use thiserror::Error;

/// Result type alias for history operations
pub type Result<T> = std::result::Result<T, HistoryError>;

/// Error types for history parsing and search
#[derive(Debug, Error)]
pub enum HistoryError {
    /// IO error (file not found, permission denied, etc.)
    #[error("IO error: {0}")]
    IoError(String),
    
    /// JSON parsing error
    #[error("JSON parse error: {0}")]
    ParseError(String),
    
    /// Invalid input error
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    
    /// FFI string conversion error
    #[error("FFI string error: {0}")]
    FfiError(String),
    
    /// Generic error
    #[error("Error: {0}")]
    Generic(String),
}

impl From<serde_json::Error> for HistoryError {
    fn from(e: serde_json::Error) -> Self {
        HistoryError::ParseError(e.to_string())
    }
}

impl From<std::io::Error> for HistoryError {
    fn from(e: std::io::Error) -> Self {
        HistoryError::IoError(e.to_string())
    }
}
