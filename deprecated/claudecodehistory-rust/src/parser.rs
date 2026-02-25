//! JSONL file parser with high-performance batch operations
//!
//! Uses memory-mapped files for fast reading and rayon for parallel parsing.

use std::path::Path;
use std::fs::File;
use std::io::{BufRead, BufReader};
use memmap2::Mmap;
use rayon::prelude::*;
use walkdir::WalkDir;

use crate::types::ConversationEntry;
use crate::error::Result;

/// Parse a single JSONL file into conversation entries
///
/// Uses memory-mapped files for efficient reading of large files.
///
/// # Arguments
/// * `path` - Path to the JSONL file
///
/// # Returns
/// Vector of ConversationEntry parsed from the file
pub fn parse_jsonl_file<P: AsRef<Path>>(path: P) -> Result<Vec<ConversationEntry>> {
    let path = path.as_ref();
    let path_str = path.to_string_lossy().to_string();
    
    // Try memory-mapped reading first
    if let Ok(file) = File::open(path) {
        if let Ok(mmap) = unsafe { Mmap::map(&file) } {
            return parse_mmap(&mmap, &path_str);
        }
    }
    
    // Fallback to buffered reading
    parse_jsonl_file_buffered(path)
}

/// Parse memory-mapped content
fn parse_mmap(data: &[u8], source_file: &str) -> Result<Vec<ConversationEntry>> {
    let content = std::str::from_utf8(data)
        .map_err(|e| crate::error::HistoryError::ParseError(format!("Invalid UTF-8: {}", e)))?;
    
    let entries: Vec<ConversationEntry> = content
        .par_lines()
        .filter(|line| !line.trim().is_empty())
        .filter_map(|line| ConversationEntry::from_jsonl_line(line, Some(source_file)).ok())
        .collect();
    
    Ok(entries)
}

/// Parse JSONL file using buffered reader (fallback)
fn parse_jsonl_file_buffered<P: AsRef<Path>>(path: P) -> Result<Vec<ConversationEntry>> {
    let path = path.as_ref();
    let path_str = path.to_string_lossy().to_string();
    
    let file = File::open(path)
        .map_err(|e| crate::error::HistoryError::IoError(e.to_string()))?;
    
    let reader = BufReader::new(file);
    let mut entries = Vec::new();
    
    for line in reader.lines() {
        let line = line
            .map_err(|e| crate::error::HistoryError::IoError(e.to_string()))?;
        
        if line.trim().is_empty() {
            continue;
        }
        
        if let Ok(entry) = ConversationEntry::from_jsonl_line(&line, Some(&path_str)) {
            entries.push(entry);
        }
    }
    
    Ok(entries)
}

/// Parse multiple JSONL files in parallel
///
/// Uses rayon for parallel processing of multiple files.
///
/// # Arguments
/// * `paths` - Vector of paths to JSONL files
///
/// # Returns
/// Vector of all ConversationEntry from all files, merged
pub fn parse_jsonl_batch<P: AsRef<Path> + Sync + Send>(paths: Vec<P>) -> Result<Vec<ConversationEntry>> {
    let entries: Vec<Vec<ConversationEntry>> = paths
        .par_iter()
        .map(|path| parse_jsonl_file(path).unwrap_or_default())
        .collect();
    
    // Flatten and sort by timestamp
    let mut all_entries: Vec<ConversationEntry> = entries.into_iter().flatten().collect();
    all_entries.sort_by(|a, b| {
        match (&a.timestamp, &b.timestamp) {
            (Some(ta), Some(tb)) => ta.cmp(tb),
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => std::cmp::Ordering::Equal,
        }
    });
    
    Ok(all_entries)
}

/// Find all JSONL files in a directory
///
/// # Arguments
/// * `dir` - Directory to search
/// * `recursive` - Whether to search recursively
///
/// # Returns
/// Vector of paths to JSONL files
pub fn find_jsonl_files<P: AsRef<Path>>(dir: P, recursive: bool) -> Result<Vec<String>> {
    let dir = dir.as_ref();
    
    let walker = if recursive {
        WalkDir::new(dir).into_iter()
    } else {
        WalkDir::new(dir).max_depth(1).into_iter()
    };
    
    let files: Vec<String> = walker
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(|e| {
            e.path()
                .extension()
                .map(|ext| ext == "jsonl")
                .unwrap_or(false)
        })
        .map(|e| e.path().to_string_lossy().to_string())
        .collect();
    
    Ok(files)
}

/// Parse all JSONL files in a directory
///
/// # Arguments
/// * `dir` - Directory containing JSONL files
/// * `recursive` - Whether to search recursively
///
/// # Returns
/// Vector of all ConversationEntry from all files
pub fn parse_jsonl_directory<P: AsRef<Path>>(dir: P, recursive: bool) -> Result<Vec<ConversationEntry>> {
    let files = find_jsonl_files(dir, recursive)?;
    parse_jsonl_batch(files)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;
    
    #[test]
    fn test_parse_jsonl_file() {
        let mut temp_file = NamedTempFile::new().unwrap();
        writeln!(temp_file, r#"{{"uuid":"1","sessionId":"s1","timestamp":"2024-01-15T10:00:00Z"}}"#).unwrap();
        writeln!(temp_file, r#"{{"uuid":"2","sessionId":"s1","timestamp":"2024-01-15T10:01:00Z"}}"#).unwrap();
        writeln!(temp_file, "").unwrap(); // Empty line should be skipped
        writeln!(temp_file, r#"{{"uuid":"3","sessionId":"s1","timestamp":"2024-01-15T10:02:00Z"}}"#).unwrap();
        
        let entries = parse_jsonl_file(temp_file.path()).unwrap();
        assert_eq!(entries.len(), 3);
    }
    
    #[test]
    fn test_parse_jsonl_batch() {
        let mut temp1 = NamedTempFile::new().unwrap();
        let mut temp2 = NamedTempFile::new().unwrap();
        
        writeln!(temp1, r#"{{"uuid":"1","timestamp":"2024-01-15T10:00:00Z"}}"#).unwrap();
        writeln!(temp2, r#"{{"uuid":"2","timestamp":"2024-01-15T09:00:00Z"}}"#).unwrap();
        
        let paths = vec![temp1.path().to_string_lossy().to_string(), temp2.path().to_string_lossy().to_string()];
        let entries = parse_jsonl_batch(paths).unwrap();
        
        assert_eq!(entries.len(), 2);
        // Should be sorted by timestamp
        assert_eq!(entries[0].uuid, Some("2".to_string()));
        assert_eq!(entries[1].uuid, Some("1".to_string()));
    }
}
