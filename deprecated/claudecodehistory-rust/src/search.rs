//! Fast text search for conversation entries
//!
//! Provides case-insensitive text search across conversation content.

use crate::types::{ConversationEntry, HistoryQueryOptions};
use crate::error::Result;

/// Search entries for text matching a query
///
/// Performs case-insensitive substring search across all text content
/// in the entries (user messages, assistant messages, and tool content).
///
/// # Arguments
/// * `entries` - Slice of conversation entries to search
/// * `query` - Search query string
///
/// # Returns
/// Vector of references to matching entries
pub fn search_entries<'a>(entries: &'a [ConversationEntry], query: &str) -> Vec<&'a ConversationEntry> {
    if query.is_empty() {
        return entries.iter().collect();
    }
    
    let query_lower = query.to_lowercase();
    
    entries
        .iter()
        .filter(|entry| {
            let text = entry.get_text_content().to_lowercase();
            text.contains(&query_lower)
        })
        .collect()
}

/// Search entries with full query options
///
/// Applies all filters from HistoryQueryOptions including:
/// - Text search query
/// - Session ID filter
/// - Time range filters
/// - Pagination (limit/offset)
///
/// # Arguments
/// * `entries` - Slice of conversation entries to search
/// * `options` - Query options
///
/// # Returns
/// Vector of matching entries (owned, for FFI compatibility)
pub fn search_with_options(entries: &[ConversationEntry], options: &HistoryQueryOptions) -> Result<Vec<ConversationEntry>> {
    let mut results: Vec<ConversationEntry> = entries
        .iter()
        .filter(|entry| {
            // Apply session ID filter
            if let Some(ref session_id) = options.session_id {
                if entry.session_id.as_ref() != Some(session_id) {
                    return false;
                }
            }
            
            // Apply time range filters
            if let Some(ref after) = options.after {
                if let Some(ref ts) = entry.timestamp {
                    if ts < after {
                        return false;
                    }
                }
            }
            
            if let Some(ref before) = options.before {
                if let Some(ref ts) = entry.timestamp {
                    if ts > before {
                        return false;
                    }
                }
            }
            
            // Apply text search
            if let Some(ref query) = options.query {
                let text = if options.case_sensitive {
                    entry.get_text_content()
                } else {
                    entry.get_text_content().to_lowercase()
                };
                
                let search_query = if options.case_sensitive {
                    query.clone()
                } else {
                    query.to_lowercase()
                };
                
                if !text.contains(&search_query) {
                    return false;
                }
            }
            
            true
        })
        .cloned()
        .collect();
    
    // Apply offset
    if let Some(offset) = options.offset {
        if offset < results.len() {
            results = results.split_off(offset);
        } else {
            results.clear();
        }
    }
    
    // Apply limit
    if let Some(limit) = options.limit {
        results.truncate(limit);
    }
    
    // Optionally strip raw content
    if !options.include_raw {
        for entry in &mut results {
            entry.raw = None;
        }
    }
    
    Ok(results)
}

/// Search entries and return indices
///
/// Useful for FFI when you need to know which entries matched.
///
/// # Arguments
/// * `entries` - Slice of conversation entries to search
/// * `query` - Search query string
///
/// # Returns
/// Vector of indices of matching entries
pub fn search_entries_indices(entries: &[ConversationEntry], query: &str) -> Vec<usize> {
    if query.is_empty() {
        return (0..entries.len()).collect();
    }
    
    let query_lower = query.to_lowercase();
    
    entries
        .iter()
        .enumerate()
        .filter(|(_, entry)| {
            let text = entry.get_text_content().to_lowercase();
            text.contains(&query_lower)
        })
        .map(|(i, _)| i)
        .collect()
}

/// Count entries matching a query
///
/// # Arguments
/// * `entries` - Slice of conversation entries to search
/// * `query` - Search query string
///
/// # Returns
/// Number of matching entries
pub fn count_matches(entries: &[ConversationEntry], query: &str) -> usize {
    if query.is_empty() {
        return entries.len();
    }
    
    let query_lower = query.to_lowercase();
    
    entries
        .iter()
        .filter(|entry| {
            let text = entry.get_text_content().to_lowercase();
            text.contains(&query_lower)
        })
        .count()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{ClaudeCodeMessage, MessageContent};
    use chrono::Utc;
    
    fn create_test_entry(uuid: &str, text: &str) -> ConversationEntry {
        ConversationEntry {
            uuid: Some(uuid.to_string()),
            parent_uuid: None,
            session_id: Some("test-session".to_string()),
            user_message: Some(ClaudeCodeMessage {
                role: "user".to_string(),
                content: MessageContent::Text(text.to_string()),
                timestamp: None,
            }),
            assistant_message: None,
            raw: None,
            timestamp: Some(Utc::now()),
            source_file: None,
        }
    }
    
    #[test]
    fn test_search_entries() {
        let entries = vec![
            create_test_entry("1", "Hello world"),
            create_test_entry("2", "Goodbye moon"),
            create_test_entry("3", "World of wonder"),
        ];
        
        let results = search_entries(&entries, "world");
        assert_eq!(results.len(), 2);
        
        let results = search_entries(&entries, "moon");
        assert_eq!(results.len(), 1);
    }
    
    #[test]
    fn test_search_case_insensitive() {
        let entries = vec![
            create_test_entry("1", "Hello WORLD"),
        ];
        
        let results = search_entries(&entries, "world");
        assert_eq!(results.len(), 1);
    }
    
    #[test]
    fn test_search_with_options_limit() {
        let entries = vec![
            create_test_entry("1", "test one"),
            create_test_entry("2", "test two"),
            create_test_entry("3", "test three"),
        ];
        
        let options = HistoryQueryOptions {
            query: Some("test".to_string()),
            limit: Some(2),
            ..Default::default()
        };
        
        let results = search_with_options(&entries, &options).unwrap();
        assert_eq!(results.len(), 2);
    }
    
    #[test]
    fn test_search_with_options_session_filter() {
        let mut entry1 = create_test_entry("1", "test");
        entry1.session_id = Some("session-a".to_string());
        
        let mut entry2 = create_test_entry("2", "test");
        entry2.session_id = Some("session-b".to_string());
        
        let entries = vec![entry1, entry2];
        
        let options = HistoryQueryOptions {
            query: Some("test".to_string()),
            session_id: Some("session-a".to_string()),
            ..Default::default()
        };
        
        let results = search_with_options(&entries, &options).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].uuid, Some("1".to_string()));
    }
}
