use std::fmt;

/// User-facing application errors that are safe to return to the frontend.
#[derive(Debug)]
pub enum AppError {
    NotFound(String),
    Validation(String),
    Database(String),
    FileSystem(String),
    Git(String),
    Network(String),
    Internal(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::NotFound(msg) => write!(f, "{}", msg),
            AppError::Validation(msg) => write!(f, "Invalid input: {}", msg),
            AppError::Database(msg) => write!(f, "Database error: {}", msg),
            AppError::FileSystem(msg) => write!(f, "File operation failed: {}", msg),
            AppError::Git(msg) => write!(f, "Git operation failed: {}", msg),
            AppError::Network(msg) => write!(f, "Network error: {}", msg),
            AppError::Internal(_) => write!(f, "An internal error occurred. Please try again."),
        }
    }
}

impl AppError {
    /// Convert any error into a user-safe AppError, logging the internal details.
    pub fn from_internal<E: std::error::Error>(context: &str, e: E) -> Self {
        tracing::error!(context = context, error = %e, "Internal error");
        AppError::Internal(format!("{}: {}", context, e))
    }

    pub fn not_found(msg: impl Into<String>) -> Self {
        AppError::NotFound(msg.into())
    }

    pub fn validation(msg: impl Into<String>) -> Self {
        AppError::Validation(msg.into())
    }

    pub fn database(msg: impl Into<String>) -> Self {
        AppError::Database(msg.into())
    }

    pub fn filesystem(msg: impl Into<String>) -> Self {
        AppError::FileSystem(msg.into())
    }

    pub fn git(msg: impl Into<String>) -> Self {
        AppError::Git(msg.into())
    }

    pub fn network(msg: impl Into<String>) -> Self {
        AppError::Network(msg.into())
    }
}

/// Sanitize any error into a user-safe string message.
/// Internal details are logged to stderr but not exposed to the frontend.
pub fn sanitize_error<E: std::fmt::Debug + std::fmt::Display>(context: &str, e: E) -> String {
    tracing::error!(context = context, error = ?e, "Operation failed");
    format!("Operation failed: {}. Please try again.", context)
}
