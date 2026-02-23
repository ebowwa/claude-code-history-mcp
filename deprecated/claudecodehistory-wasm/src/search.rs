//! Text search implementation for conversation entries

use crate::types::{ConversationEntry, ContentBlock, SearchOptions, SearchResult, MatchType};

/// Search entries for a query string
pub fn search_entries(entries: &[ConversationEntry], query: &str) -> Vec<ConversationEntry> {
    search_entries_with_options(entries, query, SearchOptions::default())
}

/// Search entries with configurable options
pub fn search_entries_with_options(
    entries: &[ConversationEntry],
    query: &str,
    options: SearchOptions,
) -> Vec<ConversationEntry> {
    let search_query = if options.case_sensitive {
        query.to_string()
    } else {
        query.to_lowercase()
    };
    
    let mut results: Vec<ConversationEntry> = entries
        .iter()
        .filter(|entry| {
            // Filter by role if specified
            if let Some(ref role) = options.role {
                if entry.role != *role {
                    return false;
                }
            }
            
            // Filter by session if specified
            if let Some(ref session_id) = options.session_id {
                if entry.session_id != *session_id {
                    return false;
                }
            }
            
            // Search content
            entry_matches_query(entry, &search_query, &options, options.case_sensitive)
        })
        .cloned()
        .collect();
    
    // Apply limit if specified
    if let Some(limit) = options.limit {
        results.truncate(limit);
    }
    
    results
}

/// Search entries and return detailed results with match context
pub fn search_entries_detailed(
    entries: &[ConversationEntry],
    query: &str,
    options: SearchOptions,
) -> Vec<SearchResult> {
    let search_query = if options.case_sensitive {
        query.to_string()
    } else {
        query.to_lowercase()
    };
    
    let mut results = Vec::new();
    
    for entry in entries {
        // Filter by role if specified
        if let Some(ref role) = options.role {
            if entry.role != *role {
                continue;
            }
        }
        
        // Filter by session if specified
        if let Some(ref session_id) = options.session_id {
            if entry.session_id != *session_id {
                continue;
            }
        }
        
        // Find matches and get context
        if let Some((match_type, context)) = find_match_with_context(entry, &search_query, &options, options.case_sensitive) {
            results.push(SearchResult {
                entry: entry.clone(),
                match_type,
                match_context: context,
            });
        }
    }
    
    // Apply limit if specified
    if let Some(limit) = options.limit {
        results.truncate(limit);
    }
    
    results
}

/// Check if an entry matches the query
fn entry_matches_query(
    entry: &ConversationEntry,
    query: &str,
    options: &SearchOptions,
    case_sensitive: bool,
) -> bool {
    // Check raw content (includes summary)
    let raw = if case_sensitive {
        entry.raw_content.as_str()
    } else {
        // Need to check lowercase - we'll use a temporary approach
        return entry.raw_content.to_lowercase().contains(query);
    };
    
    if raw.contains(query) {
        return true;
    }
    
    // Check content blocks
    for block in &entry.content {
        match block {
            ContentBlock::Text { text } => {
                let search_text = if case_sensitive {
                    text.as_str()
                } else {
                    return text.to_lowercase().contains(query);
                };
                if search_text.contains(query) {
                    return true;
                }
            }
            ContentBlock::ToolUse { name, input } => {
                if options.include_tools {
                    if case_sensitive {
                        if name.contains(query) {
                            return true;
                        }
                    } else {
                        if name.to_lowercase().contains(query) {
                            return true;
                        }
                    }
                }
                
                if options.include_tool_content {
                    if let Some(input_val) = input {
                        if let Ok(input_str) = serde_json::to_string(input_val) {
                            if case_sensitive {
                                if input_str.contains(query) {
                                    return true;
                                }
                            } else {
                                if input_str.to_lowercase().contains(query) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
            ContentBlock::ToolResult { content, .. } => {
                if options.include_tool_content {
                    if let Some(content_str) = content {
                        if case_sensitive {
                            if content_str.contains(query) {
                                return true;
                            }
                        } else {
                            if content_str.to_lowercase().contains(query) {
                                return true;
                            }
                        }
                    }
                }
            }
            ContentBlock::Thinking { thinking } => {
                if options.include_thinking {
                    if case_sensitive {
                        if thinking.contains(query) {
                            return true;
                        }
                    } else {
                        if thinking.to_lowercase().contains(query) {
                            return true;
                        }
                    }
                }
            }
        }
    }
    
    // Check summary
    if let Some(ref summary) = entry.summary {
        if case_sensitive {
            if summary.contains(query) {
                return true;
            }
        } else {
            if summary.to_lowercase().contains(query) {
                return true;
            }
        }
    }
    
    false
}

/// Find a match and return its type and context
fn find_match_with_context(
    entry: &ConversationEntry,
    query: &str,
    options: &SearchOptions,
    case_sensitive: bool,
) -> Option<(MatchType, String)> {
    // Check summary first
    if let Some(ref summary) = entry.summary {
        let matches = if case_sensitive {
            summary.contains(query)
        } else {
            summary.to_lowercase().contains(query)
        };
        if matches {
            return Some((MatchType::Summary, extract_context(summary, query, case_sensitive)));
        }
    }
    
    // Check content blocks
    for block in &entry.content {
        match block {
            ContentBlock::Text { text } => {
                let matches = if case_sensitive {
                    text.contains(query)
                } else {
                    text.to_lowercase().contains(query)
                };
                if matches {
                    return Some((MatchType::TextContent, extract_context(text, query, case_sensitive)));
                }
            }
            ContentBlock::ToolUse { name, input } => {
                if options.include_tools {
                    let matches = if case_sensitive {
                        name.contains(query)
                    } else {
                        name.to_lowercase().contains(query)
                    };
                    if matches {
                        return Some((MatchType::ToolName, extract_context(name, query, case_sensitive)));
                    }
                }
                
                if options.include_tool_content {
                    if let Some(input_val) = input {
                        if let Ok(input_str) = serde_json::to_string(input_val) {
                            let matches = if case_sensitive {
                                input_str.contains(query)
                            } else {
                                input_str.to_lowercase().contains(query)
                            };
                            if matches {
                                return Some((MatchType::ToolInput, extract_context(&input_str, query, case_sensitive)));
                            }
                        }
                    }
                }
            }
            ContentBlock::ToolResult { content, .. } => {
                if options.include_tool_content {
                    if let Some(content_str) = content {
                        let matches = if case_sensitive {
                            content_str.contains(query)
                        } else {
                            content_str.to_lowercase().contains(query)
                        };
                        if matches {
                            return Some((MatchType::ToolOutput, extract_context(content_str, query, case_sensitive)));
                        }
                    }
                }
            }
            ContentBlock::Thinking { thinking } => {
                if options.include_thinking {
                    let matches = if case_sensitive {
                        thinking.contains(query)
                    } else {
                        thinking.to_lowercase().contains(query)
                    };
                    if matches {
                        return Some((MatchType::Thinking, extract_context(thinking, query, case_sensitive)));
                    }
                }
            }
        }
    }
    
    None
}

/// Extract context around a match (surrounding characters)
fn extract_context(text: &str, query: &str, case_sensitive: bool) -> String {
    const CONTEXT_CHARS: usize = 50;
    
    let search_text = if case_sensitive {
        text.to_string()
    } else {
        text.to_lowercase()
    };
    
    let search_query = if case_sensitive {
        query.to_string()
    } else {
        query.to_lowercase()
    };
    
    if let Some(pos) = search_text.find(&search_query) {
        let start = pos.saturating_sub(CONTEXT_CHARS);
        let end = (pos + query.len() + CONTEXT_CHARS).min(text.len());
        
        let context = &text[start..end];
        
        let prefix = if start > 0 { "..." } else { "" };
        let suffix = if end < text.len() { "..." } else { "" };
        
        format!("{}{}{}", prefix, context, suffix)
    } else {
        text.chars().take(100).collect()
    }
}

/// Get all unique tool names used in entries
pub fn get_unique_tool_names(entries: &[ConversationEntry]) -> Vec<String> {
    entries
        .iter()
        .flat_map(|entry| &entry.content)
        .filter_map(|block| {
            if let ContentBlock::ToolUse { name, .. } = block {
                Some(name.clone())
            } else {
                None
            }
        })
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect()
}

/// Search for entries that use a specific tool
pub fn search_by_tool_name(entries: &[ConversationEntry], tool_name: &str) -> Vec<ConversationEntry> {
    entries
        .iter()
        .filter(|entry| {
            entry.content.iter().any(|block| {
                if let ContentBlock::ToolUse { name, .. } = block {
                    name == tool_name
                } else {
                    false
                }
            })
        })
        .cloned()
        .collect()
}

/// Count occurrences of a query in entries
pub fn count_occurrences(entries: &[ConversationEntry], query: &str, case_sensitive: bool) -> usize {
    let search_query = if case_sensitive {
        query.to_string()
    } else {
        query.to_lowercase()
    };
    
    entries
        .iter()
        .map(|entry| {
            let raw = if case_sensitive {
                entry.raw_content.clone()
            } else {
                entry.raw_content.to_lowercase()
            };
            
            raw.matches(&search_query).count()
        })
        .sum()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Role;
    use chrono::Utc;
    
    fn create_test_entry(uuid: &str, content_text: &str) -> ConversationEntry {
        ConversationEntry {
            uuid: uuid.to_string(),
            parent_uuid: None,
            session_id: "test-session".to_string(),
            timestamp: Utc::now(),
            role: Role::User,
            content: vec![ContentBlock::Text { text: content_text.to_string() }],
            message_type: None,
            model: None,
            usage: None,
            is_edited: None,
            summary: None,
            raw_content: content_text.to_string(),
        }
    }
    
    #[test]
    fn test_basic_search() {
        let entries = vec![
            create_test_entry("1", "Hello world"),
            create_test_entry("2", "Goodbye world"),
            create_test_entry("3", "Hello again"),
        ];
        
        let results = search_entries(&entries, "hello");
        assert_eq!(results.len(), 2);
    }
    
    #[test]
    fn test_case_sensitive_search() {
        let entries = vec![
            create_test_entry("1", "Hello world"),
            create_test_entry("2", "hello world"),
        ];
        
        let options = SearchOptions {
            case_sensitive: true,
            ..Default::default()
        };
        
        let results = search_entries_with_options(&entries, "Hello", options);
        assert_eq!(results.len(), 1);
    }
    
    #[test]
    fn test_search_with_limit() {
        let entries = vec![
            create_test_entry("1", "Hello world"),
            create_test_entry("2", "Hello there"),
            create_test_entry("3", "Hello again"),
        ];
        
        let options = SearchOptions {
            limit: Some(2),
            ..Default::default()
        };
        
        let results = search_entries_with_options(&entries, "Hello", options);
        assert_eq!(results.len(), 2);
    }
    
    #[test]
    fn test_extract_context() {
        let text = "This is a long text with Hello world in the middle and more text after";
        let context = extract_context(text, "Hello", false);
        assert!(context.contains("Hello"));
        assert!(context.starts_with("...") || context.starts_with("This"));
    }
}
