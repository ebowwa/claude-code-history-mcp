//! Claude Code History Parser - Rust Implementation
//!
//! High-performance Rust implementation of Claude Code conversation history parser
//! with native Node.js/Bun bindings via napi-rs.
//!
//! # Features
//!
//! - Memory-mapped file I/O for fast large file handling
//! - Parallel processing with rayon
//! - Zero-copy parsing where possible
//! - Full TypeScript API compatibility
//!
//! # Example
//!
//! ```rust
//! use claudecodehistory_rs::{ClaudeCodeHistoryService, HistoryQueryOptions};
//!
//! let service = ClaudeCodeHistoryService::new(None);
//! let history = service.get_conversation_history(HistoryQueryOptions::default());
//! ```

pub mod parser;
pub mod types;
pub mod utils;

pub use types::*;
pub use utils::*;

use std::path::PathBuf;
use std::process::Command;
use walkdir::WalkDir;

/// Main service class for accessing Claude Code conversation history
///
/// This is the Rust equivalent of `ClaudeCodeHistoryService` from the TypeScript implementation.
pub struct ClaudeCodeHistoryService {
    claude_dir: PathBuf,
}

impl ClaudeCodeHistoryService {
    /// Create a new history service instance
    ///
    /// # Arguments
    /// * `claude_dir` - Optional path to Claude directory (defaults to ~/.claude)
    pub fn new(claude_dir: Option<&str>) -> Self {
        let claude_dir = match claude_dir {
            Some(path) => PathBuf::from(path),
            None => dirs::home_dir()
                .expect("Could not find home directory")
                .join(".claude"),
        };

        Self { claude_dir }
    }

    /// Get conversation history with optional filtering and pagination
    ///
    /// # Arguments
    /// * `options` - Query options including session_id, date range, pagination
    pub fn get_conversation_history(
        &self,
        options: HistoryQueryOptions,
    ) -> Result<PaginatedConversationResponse, Box<dyn std::error::Error>> {
        let limit = options.limit.unwrap_or(20);
        let offset = options.offset.unwrap_or(0);

        // Normalize dates
        let start_date = options
            .start_date
            .as_ref()
            .map(|d| normalize_date(d, false, options.timezone.as_deref()));
        let end_date = options
            .end_date
            .as_ref()
            .map(|d| normalize_date(d, true, options.timezone.as_deref()));

        // Determine allowed message types
        let allowed_types = options.message_types.clone().unwrap_or_else(|| {
            vec![MessageType::User]
        });

        // Load all entries
        let mut all_entries = self.load_history_entries(start_date.as_deref(), end_date.as_deref())?;

        // Filter by session ID if specified
        if let Some(ref session_id) = options.session_id {
            all_entries.retain(|e| &e.session_id == session_id);
        }

        // Filter by message types
        all_entries.retain(|e| allowed_types.contains(&e.entry_type));

        // Filter by date range
        if let Some(ref start) = start_date {
            all_entries.retain(|e| e.timestamp >= *start);
        }
        if let Some(ref end) = end_date {
            all_entries.retain(|e| e.timestamp <= *end);
        }

        // Sort by timestamp (newest first)
        all_entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

        // Calculate pagination
        let total_count = all_entries.len();
        let has_more = offset + limit < total_count;
        let paginated_entries: Vec<_> = all_entries.into_iter().skip(offset).take(limit).collect();

        Ok(PaginatedConversationResponse {
            entries: paginated_entries,
            pagination: Pagination {
                total_count,
                limit,
                offset,
                has_more,
            },
        })
    }

    /// Search conversations for a query string
    ///
    /// # Arguments
    /// * `query` - Search query string
    /// * `options` - Search options including filters
    pub fn search_conversations(
        &self,
        query: &str,
        options: SearchOptions,
    ) -> Result<Vec<ConversationEntry>, Box<dyn std::error::Error>> {
        let limit = options.limit.unwrap_or(30);

        // Normalize dates
        let start_date = options
            .start_date
            .as_ref()
            .map(|d| normalize_date(d, false, options.timezone.as_deref()));
        let end_date = options
            .end_date
            .as_ref()
            .map(|d| normalize_date(d, true, options.timezone.as_deref()));

        // Load all entries
        let all_entries = self.load_history_entries(start_date.as_deref(), end_date.as_deref())?;

        let query_lower = query.to_lowercase();

        let mut matched_entries: Vec<_> = all_entries
            .into_iter()
            .filter(|e| e.content.to_lowercase().contains(&query_lower))
            .collect();

        // Filter by project path if specified
        if let Some(ref project_path) = options.project_path {
            matched_entries.retain(|e| &e.project_path == project_path);
        }

        // Filter by date range
        if let Some(ref start) = start_date {
            matched_entries.retain(|e| e.timestamp >= *start);
        }
        if let Some(ref end) = end_date {
            matched_entries.retain(|e| e.timestamp <= *end);
        }

        // Sort and limit
        matched_entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        matched_entries.truncate(limit);

        Ok(matched_entries)
    }

    /// List all projects with Claude Code history
    pub fn list_projects(&self) -> Result<Vec<ProjectInfo>, Box<dyn std::error::Error>> {
        let projects_dir = self.claude_dir.join("projects");

        if !projects_dir.exists() {
            return Ok(Vec::new());
        }

        let mut projects: Vec<ProjectInfo> = Vec::new();

        for entry in WalkDir::new(&projects_dir).max_depth(1) {
            let entry = entry?;
            let path = entry.path();

            if path == projects_dir {
                continue;
            }

            if path.is_dir() {
                let project_dir = path.file_name().unwrap().to_string_lossy();
                let decoded_path = decode_project_path(&project_dir);

                let mut session_count = 0;
                let mut message_count = 0;
                let mut last_activity = String::from("1970-01-01T00:00:00.000Z");

                // Count sessions and messages
                for file_entry in WalkDir::new(path).max_depth(1) {
                    let file_entry = file_entry?;
                    let file_path = file_entry.path();

                    if file_path.extension().map_or(false, |ext| ext == "jsonl") {
                        session_count += 1;

                        // Get file modification time
                        if let Ok(metadata) = std::fs::metadata(file_path) {
                            if let Ok(modified) = metadata.modified() {
                                let modified_str = modified
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .map(|d| {
                                        let dt = chrono::DateTime::from_timestamp(d.as_secs() as i64, 0)
                                            .unwrap_or_default();
                                        dt.to_rfc3339()
                                    })
                                    .unwrap_or_default();

                                if modified_str > last_activity {
                                    last_activity = modified_str;
                                }
                            }
                        }

                        // Count messages (fast line count)
                        if let Ok(content) = std::fs::read_to_string(file_path) {
                            message_count += content.lines().filter(|l| !l.trim().is_empty()).count();
                        }
                    }
                }

                projects.push(ProjectInfo {
                    project_path: decoded_path,
                    session_count,
                    message_count,
                    last_activity_time: last_activity,
                });
            }
        }

        Ok(projects)
    }

    /// List sessions with optional filtering
    ///
    /// Uses the fast parser for improved performance
    pub fn list_sessions(
        &self,
        options: SessionListOptions,
    ) -> Result<Vec<SessionInfo>, Box<dyn std::error::Error>> {
        let projects_dir = self.claude_dir.join("projects");

        if !projects_dir.exists() {
            return Ok(Vec::new());
        }

        // Normalize dates
        let start_date = options
            .start_date
            .as_ref()
            .map(|d| normalize_date(d, false, options.timezone.as_deref()));
        let end_date = options
            .end_date
            .as_ref()
            .map(|d| normalize_date(d, true, options.timezone.as_deref()));

        let mut sessions: Vec<SessionInfo> = Vec::new();

        for entry in WalkDir::new(&projects_dir).max_depth(1) {
            let entry = entry?;
            let project_path = entry.path();

            if project_path == projects_dir {
                continue;
            }

            if project_path.is_dir() {
                let project_dir = project_path.file_name().unwrap().to_string_lossy();
                let decoded_path = decode_project_path(&project_dir);

                // Filter by project path if specified
                if let Some(ref filter_path) = options.project_path {
                    if &decoded_path != filter_path {
                        continue;
                    }
                }

                // Use fast parser
                let parsed_entries = parser::parse_dir_fast(&project_path.to_string_lossy());

                // Group by session_id
                let mut session_map: std::collections::HashMap<String, Vec<_>> =
                    std::collections::HashMap::new();

                for entry in parsed_entries {
                    if entry.session_id.is_empty() {
                        continue;
                    }

                    // Apply date filtering
                    if let Some(ref start) = start_date {
                        if entry.timestamp < *start {
                            continue;
                        }
                    }
                    if let Some(ref end) = end_date {
                        if entry.timestamp > *end {
                            continue;
                        }
                    }

                    session_map
                        .entry(entry.session_id.clone())
                        .or_default()
                        .push(entry);
                }

                // Convert to SessionInfo
                for (session_id, mut entries) in session_map {
                    if entries.is_empty() {
                        continue;
                    }

                    // Sort by timestamp
                    entries.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));

                    let session_start = entries.last().unwrap().timestamp.clone();
                    let session_end = entries.first().unwrap().timestamp.clone();

                    // Filter by date range
                    if let Some(ref start) = &start_date {
                        if &session_end < start {
                            continue;
                        }
                    }
                    if let Some(ref end) = &end_date {
                        if &session_start > end {
                            continue;
                        }
                    }

                    // Count message types
                    let user_count = entries
                        .iter()
                        .filter(|e| e.role.to_lowercase() == "user")
                        .count();
                    let assistant_count = entries
                        .iter()
                        .filter(|e| e.role.to_lowercase() == "assistant")
                        .count();

                    // Calculate duration
                    let start_dt = parse_timestamp(&session_start);
                    let end_dt = parse_timestamp(&session_end);
                    let duration_ms = (end_dt - start_dt).num_milliseconds();

                    // Find first user message
                    let first_user_entry = entries
                        .iter()
                        .rev()
                        .find(|e| e.role.to_lowercase() == "user");
                    let first_user_message = first_user_entry.and_then(|e| {
                        if e.content.len() > 100 {
                            Some(format!("{}...", &e.content[..100]))
                        } else {
                            Some(e.content.clone())
                        }
                    });

                    // Extract project name
                    let project_name = decoded_path.split('/').last().unwrap_or(&decoded_path);

                    sessions.push(SessionInfo {
                        session_id,
                        project_path: decoded_path.clone(),
                        start_time: session_start,
                        end_time: session_end,
                        message_count: entries.len(),
                        user_message_count: user_count,
                        assistant_message_count: assistant_count,
                        first_user_message,
                        duration_ms: Some(duration_ms as u64),
                        duration_formatted: Some(format_duration(duration_ms)),
                        has_errors: Some(false), // Would need to scan for errors
                        project_name: Some(project_name.to_string()),
                    });
                }
            }
        }

        // Sort by start time (newest first)
        sessions.sort_by(|a, b| b.start_time.cmp(&a.start_time));

        Ok(sessions)
    }

    /// Get recent activity across all projects
    pub fn get_recent_activity(
        &self,
        options: RecentActivityOptions,
    ) -> Result<Vec<RecentActivityItem>, Box<dyn std::error::Error>> {
        let limit = options.limit.unwrap_or(10);
        let include_summaries = options.include_summaries.unwrap_or(true);

        // Get all sessions
        let all_sessions = self.list_sessions(SessionListOptions::default())?;

        // Take most recent
        let recent_sessions: Vec<_> = all_sessions.into_iter().take(limit).collect();

        let mut activities: Vec<RecentActivityItem> = Vec::new();

        for session in recent_sessions {
            let done = if include_summaries {
                self.generate_session_summary(&session.session_id).ok()
            } else {
                None
            };

            activities.push(RecentActivityItem {
                session_id: session.session_id,
                project_path: session.project_path,
                project_name: session.project_name.unwrap_or_default(),
                timestamp: session.start_time.clone(),
                asked: session.first_user_message.unwrap_or_else(|| "No user message found".to_string()),
                done,
                time_ago: get_time_ago(&parse_timestamp(&session.start_time)),
            });
        }

        Ok(activities)
    }

    /// Get the current active Claude Code session
    pub fn get_current_session(&self) -> Result<Option<CurrentSessionInfo>, Box<dyn std::error::Error>> {
        let history_path = self.claude_dir.join("history.jsonl");

        if !history_path.exists() {
            return Ok(None);
        }

        // Read last line
        let content = std::fs::read_to_string(&history_path)?;
        let last_line = content.lines().last();

        match last_line {
            Some(line) if !line.is_empty() => {
                let entry: serde_json::Value = serde_json::from_str(line)?;

                let timestamp = entry["timestamp"].as_str().map(|s| s.to_string())
                    .or_else(|| entry["timestamp"].as_i64().map(|t| {
                        chrono::DateTime::from_timestamp(t, 0)
                            .unwrap_or_default()
                            .to_rfc3339()
                    }));

                Ok(Some(CurrentSessionInfo {
                    session_id: entry["sessionId"].as_str().unwrap_or("").to_string(),
                    timestamp: timestamp.unwrap_or_default(),
                    project_path: entry["project"].as_str().map(|s| s.to_string()),
                    display: entry["display"].as_str().map(|s| s.to_string()),
                }))
            }
            _ => Ok(None),
        }
    }

    /// Get session by process ID
    pub fn get_session_by_pid(&self, pid: u32) -> Result<Option<SessionProcessInfo>, Box<dyn std::error::Error>> {
        // Use ps command to get process info
        let output = Command::new("ps")
            .args(["-p", &pid.to_string(), "-o", "pid,ppid,command"])
            .output()?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let lines: Vec<_> = stdout.lines().collect();

        if lines.len() < 2 {
            return Ok(None);
        }

        let parts: Vec<_> = lines[1].split_whitespace().collect();
        if parts.len() < 3 {
            return Ok(None);
        }

        let process_pid: u32 = parts[0].parse()?;
        let command = parts[2..].join(" ");

        // Check if this is a Claude Code process
        if !command.to_lowercase().contains("claude") {
            return Ok(None);
        }

        // Extract session ID
        let session_id = self.extract_session_id_from_process(process_pid)?;

        // Check if process is alive
        let alive = self.is_process_alive(process_pid);

        Ok(Some(SessionProcessInfo {
            session_id,
            pid: process_pid,
            command,
            alive,
        }))
    }

    /// List all session UUIDs from session-env directory
    pub fn list_all_session_uuids(&self) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let session_env_dir = self.claude_dir.join("session-env");

        if !session_env_dir.exists() {
            return Ok(Vec::new());
        }

        let uuids: Vec<String> = std::fs::read_dir(&session_env_dir)?
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.file_type().map_or(false, |t| t.is_dir()))
            .filter_map(|entry| {
                let name = entry.file_name().to_string_lossy().to_string();
                // UUID v4 pattern
                let uuid_pattern = regex::Regex::new(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$").unwrap();
                if uuid_pattern.is_match(&name) {
                    Some(name)
                } else {
                    None
                }
            })
            .collect();

        Ok(uuids)
    }

    // Private helper methods

    fn load_history_entries(
        &self,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<Vec<ConversationEntry>, Box<dyn std::error::Error>> {
        let projects_dir = self.claude_dir.join("projects");
        let mut entries: Vec<ConversationEntry> = Vec::new();

        if !projects_dir.exists() {
            return Ok(entries);
        }

        for entry in WalkDir::new(&projects_dir).max_depth(1) {
            let entry = entry?;
            let project_path = entry.path();

            if project_path == projects_dir {
                continue;
            }

            if project_path.is_dir() {
                let project_dir = project_path.file_name().unwrap().to_string_lossy();

                for file_entry in WalkDir::new(project_path).max_depth(1) {
                    let file_entry = file_entry?;
                    let file_path = file_entry.path();

                    if file_path.extension().map_or(false, |ext| ext == "jsonl") {
                        // Pre-filter by file modification time
                        if self.should_skip_file(file_path, start_date, end_date)? {
                            continue;
                        }

                        let session_entries = parser::parse_jsonl_file(
                            file_path,
                            &project_dir,
                            start_date,
                            end_date,
                        );
                        entries.extend(session_entries);
                    }
                }
            }
        }

        Ok(entries)
    }

    fn should_skip_file(
        &self,
        file_path: &std::path::Path,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        if start_date.is_none() && end_date.is_none() {
            return Ok(false);
        }

        let metadata = std::fs::metadata(file_path)?;
        let modified = metadata.modified()?;
        let created = metadata.created()?;

        let modified_str = modified
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| {
                chrono::DateTime::from_timestamp(d.as_secs() as i64, 0)
                    .unwrap_or_default()
                    .to_rfc3339()
            })
            .unwrap_or_default();

        let created_str = created
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| {
                chrono::DateTime::from_timestamp(d.as_secs() as i64, 0)
                    .unwrap_or_default()
                    .to_rfc3339()
            })
            .unwrap_or_default();

        let oldest = if created_str < modified_str {
            &created_str
        } else {
            &modified_str
        };

        let newest = &modified_str;

        // Skip if file's oldest time is after end_date
        if let Some(end) = end_date {
            if oldest.as_str() > end {
                return Ok(true);
            }
        }

        // Skip if file's newest time is before start_date
        if let Some(start) = start_date {
            if newest.as_str() < start {
                return Ok(true);
            }
        }

        Ok(false)
    }

    fn generate_session_summary(&self, session_id: &str) -> Result<String, Box<dyn std::error::Error>> {
        let result = self.get_conversation_history(HistoryQueryOptions {
            session_id: Some(session_id.to_string()),
            limit: Some(50),
            message_types: Some(vec![MessageType::Assistant]),
            ..Default::default()
        })?;

        if result.entries.is_empty() {
            return Ok(String::new());
        }

        // Get first assistant response
        let first_assistant = result.entries.last();

        match first_assistant {
            Some(entry) => {
                let content = &entry.content;
                if content.len() > 150 {
                    Ok(format!("{}...", &content[..150]))
                } else {
                    Ok(content.clone())
                }
            }
            None => Ok(String::new()),
        }
    }

    fn extract_session_id_from_process(&self, _pid: u32) -> Result<String, Box<dyn std::error::Error>> {
        // Try to get session ID from current session
        if let Ok(Some(session)) = self.get_current_session() {
            return Ok(session.session_id);
        }
        Ok(String::new())
    }

    fn is_process_alive(&self, pid: u32) -> bool {
        // Send signal 0 to check if process exists
        #[cfg(feature = "libc")]
        unsafe {
            libc::kill(pid as i32, 0) == 0
        }
        #[cfg(not(feature = "libc"))]
        {
            // Fallback: use kill command
            std::process::Command::new("kill")
                .args(["-0", &pid.to_string()])
                .status()
                .map(|s| s.success())
                .unwrap_or(false)
        }
    }
}

// NAPI bindings for Node.js/Bun
#[cfg(feature = "napi")]
mod napi_bindings {
    use super::*;
    use napi_derive::napi;

    #[napi(js_name = "ClaudeCodeHistoryService")]
    pub struct JsClaudeCodeHistoryService {
        inner: ClaudeCodeHistoryService,
    }

    #[napi]
    impl JsClaudeCodeHistoryService {
        #[napi(constructor)]
        pub fn new(claude_dir: Option<String>) -> Self {
            Self {
                inner: ClaudeCodeHistoryService::new(claude_dir.as_deref()),
            }
        }

        #[napi]
        pub async fn get_conversation_history(
            &self,
            options: Option<HistoryQueryOptions>,
        ) -> napi::Result<PaginatedConversationResponse> {
            self.inner
                .get_conversation_history(options.unwrap_or_default())
                .map_err(|e| napi::Error::from_reason(e.to_string()))
        }

        #[napi]
        pub async fn search_conversations(
            &self,
            query: String,
            options: Option<SearchOptions>,
        ) -> napi::Result<Vec<ConversationEntry>> {
            self.inner
                .search_conversations(&query, options.unwrap_or_default())
                .map_err(|e| napi::Error::from_reason(e.to_string()))
        }

        #[napi]
        pub async fn list_projects(&self) -> napi::Result<Vec<ProjectInfo>> {
            self.inner
                .list_projects()
                .map_err(|e| napi::Error::from_reason(e.to_string()))
        }

        #[napi]
        pub async fn list_sessions(
            &self,
            options: Option<SessionListOptions>,
        ) -> napi::Result<Vec<SessionInfo>> {
            self.inner
                .list_sessions(options.unwrap_or_default())
                .map_err(|e| napi::Error::from_reason(e.to_string()))
        }

        #[napi]
        pub async fn get_recent_activity(
            &self,
            options: Option<RecentActivityOptions>,
        ) -> napi::Result<Vec<RecentActivityItem>> {
            self.inner
                .get_recent_activity(options.unwrap_or_default())
                .map_err(|e| napi::Error::from_reason(e.to_string()))
        }

        #[napi]
        pub async fn get_current_session(&self) -> napi::Result<Option<CurrentSessionInfo>> {
            self.inner
                .get_current_session()
                .map_err(|e| napi::Error::from_reason(e.to_string()))
        }

        #[napi]
        pub async fn get_session_by_pid(&self, pid: u32) -> napi::Result<Option<SessionProcessInfo>> {
            self.inner
                .get_session_by_pid(pid)
                .map_err(|e| napi::Error::from_reason(e.to_string()))
        }

        #[napi]
        pub async fn list_all_session_uuids(&self) -> napi::Result<Vec<String>> {
            self.inner
                .list_all_session_uuids()
                .map_err(|e| napi::Error::from_reason(e.to_string()))
        }
    }

    // Fast parser exports (matching @ebowwa/jsonl-hft API)
    #[napi]
    pub fn parse_dir_fast(dir_path: String) -> napi::Result<Vec<serde_json::Value>> {
        let entries = parser::parse_dir_fast(&dir_path);
        entries
            .into_iter()
            .map(|e| serde_json::to_value(e).map_err(|e| napi::Error::from_reason(e.to_string())))
            .collect()
    }
}

// Re-export napi bindings when feature is enabled
#[cfg(feature = "napi")]
pub use napi_bindings::*;
