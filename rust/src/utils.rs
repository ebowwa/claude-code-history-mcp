//! Utility functions for time formatting, path handling, and other helpers

use chrono::{DateTime, Local, TimeZone, Utc};

/// Format a timestamp into human-readable formats
///
/// Returns (formatted_time, time_ago, local_date)
pub fn format_timestamp(timestamp: &str) -> (String, String, String) {
    let dt = parse_timestamp(timestamp);

    // Format in local timezone (Asia/Tokyo style for consistency with TS)
    let formatted_time = dt
        .with_timezone(&Local)
        .format("%Y/%m/%d %H:%M:%S")
        .to_string();

    // Calculate time ago
    let time_ago = get_time_ago(&dt);

    // Local date in YYYY-MM-DD format
    let local_date = dt.with_timezone(&Local).format("%Y-%m-%d").to_string();

    (formatted_time, time_ago, local_date)
}

/// Parse ISO timestamp string into DateTime
pub fn parse_timestamp(timestamp: &str) -> DateTime<Utc> {
    // Try parsing as ISO 8601
    if let Ok(dt) = DateTime::parse_from_rfc3339(timestamp) {
        return dt.with_timezone(&Utc);
    }

    // Fallback to current time if parsing fails
    Utc::now()
}

/// Calculate human-readable "time ago" string
pub fn get_time_ago(dt: &DateTime<Utc>) -> String {
    let now = Utc::now();
    let diff = now.signed_duration_since(*dt);

    let mins = diff.num_minutes();
    let hours = diff.num_hours();
    let days = diff.num_days();

    if mins < 1 {
        "just now".to_string()
    } else if mins < 60 {
        format!("{}m ago", mins)
    } else if hours < 24 {
        format!("{}h ago", hours)
    } else if days < 7 {
        format!("{}d ago", days)
    } else if days < 30 {
        format!("{}w ago", days / 7)
    } else if days < 365 {
        format!("{}mo ago", days / 30)
    } else {
        format!("{}y ago", days / 365)
    }
}

/// Format duration in milliseconds to human-readable string
pub fn format_duration(ms: i64) -> String {
    if ms < 1000 {
        return format!("{}ms", ms);
    }

    let seconds = ms / 1000;
    if seconds < 60 {
        return format!("{}s", seconds);
    }

    let minutes = seconds / 60;
    let remaining_seconds = seconds % 60;
    if minutes < 60 {
        if remaining_seconds > 0 {
            return format!("{}m {}s", minutes, remaining_seconds);
        }
        return format!("{}m", minutes);
    }

    let hours = minutes / 60;
    let remaining_minutes = minutes % 60;
    if hours < 24 {
        if remaining_minutes > 0 {
            return format!("{}h {}m", hours, remaining_minutes);
        }
        return format!("{}h", hours);
    }

    let days = hours / 24;
    let remaining_hours = hours % 24;
    if remaining_hours > 0 {
        format!("{}d {}h", days, remaining_hours)
    } else {
        format!("{}d", days)
    }
}

/// Normalize a date string to ISO format with timezone support
///
/// Takes a date like "2026-02-26" and converts it to ISO format
/// considering the timezone.
pub fn normalize_date(date_string: &str, is_end_date: bool, timezone: Option<&str>) -> String {
    // If already ISO format, return as-is
    if date_string.contains('T') {
        return date_string.to_string();
    }

    let time_str = if is_end_date {
        "23:59:59.999"
    } else {
        "00:00:00.000"
    };

    // For UTC, simple format
    if timezone == Some("UTC") {
        return format!("{}T{}Z", date_string, time_str);
    }

    // For other timezones, we need to calculate the offset
    // This is a simplified version - full implementation would use chrono-tz
    // For now, use local timezone
    let parts: Vec<_> = date_string.split('-').collect();
    if parts.len() != 3 {
        return format!("{}T{}Z", date_string, time_str);
    }

    let year: i32 = parts[0].parse().unwrap_or(1970);
    let month: u32 = parts[1].parse().unwrap_or(1);
    let day: u32 = parts[2].parse().unwrap_or(1);

    let hour = if is_end_date { 23 } else { 0 };
    let minute = if is_end_date { 59 } else { 0 };
    let second = if is_end_date { 59 } else { 0 };

    // Create local datetime and convert to UTC
    Local
        .with_ymd_and_hms(year, month, day, hour, minute, second)
        .single()
        .map(|dt| dt.with_timezone(&Utc).to_rfc3339())
        .unwrap_or_else(|| format!("{}T{}Z", date_string, time_str))
}

/// Decode project path from directory name
///
/// Converts "-Users-ebowwa-Desktop-codespaces" to "/Users/ebowwa/Desktop/codespaces"
pub fn decode_project_path(project_dir: &str) -> String {
    project_dir
        .replace('-', "/")
        .trim_start_matches('/')
        .to_string()
}

/// Encode project path to directory name
///
/// Converts "/Users/ebowwa/Desktop/codespaces" to "-Users-ebowwa-Desktop-codespaces"
pub fn encode_project_path(project_path: &str) -> String {
    format!("-{}", project_path.replace('/', "-"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_duration() {
        assert_eq!(format_duration(500), "500ms");
        assert_eq!(format_duration(5000), "5s");
        assert_eq!(format_duration(65000), "1m 5s");
        assert_eq!(format_duration(3600000), "1h");
        assert_eq!(format_duration(3661000), "1h 1m");
        assert_eq!(format_duration(90061000), "1d 1h");
    }

    #[test]
    fn test_decode_project_path() {
        assert_eq!(
            decode_project_path("-Users-ebowwa-Desktop-codespaces"),
            "Users/ebowwa/Desktop/codespaces"
        );
        assert_eq!(decode_project_path("simple-path"), "simple/path");
    }

    #[test]
    fn test_encode_project_path() {
        assert_eq!(
            encode_project_path("/Users/ebowwa/Desktop/codespaces"),
            "-Users-ebowwa-Desktop-codespaces"
        );
    }

    #[test]
    fn test_get_time_ago() {
        let now = Utc::now();
        let one_min_ago = now - chrono::Duration::seconds(30);
        let one_hour_ago = now - chrono::Duration::hours(1);
        let one_day_ago = now - chrono::Duration::days(1);

        assert!(get_time_ago(&one_min_ago).contains("m ago") || get_time_ago(&one_min_ago) == "just now");
        assert!(get_time_ago(&one_hour_ago).contains("h ago"));
        assert!(get_time_ago(&one_day_ago).contains("d ago"));
    }
}
