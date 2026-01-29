use crate::error::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tokio::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PatchStatus {
    Pending,
    Downloaded,
    Applied,
    Verified,
    Failed(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatchTarget {
    pub relative_path: PathBuf,
    pub offset: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatchEntry {
    pub chunk_id: String,
    pub status: PatchStatus,
    pub targets: Vec<PatchTarget>,
    pub retry_count: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatchJournal {
    pub game_id: String,
    pub target_version: String,
    pub entries: Vec<PatchEntry>,
    pub started_at: DateTime<Utc>,
}

pub struct JournalManager {
    journal_path: PathBuf,
}

impl JournalManager {
    pub fn new(app_data_dir: &Path, game_id: &str) -> Self {
        Self {
            journal_path: app_data_dir.join("journals").join(format!("{}_patch.json", game_id)),
        }
    }

    pub async fn load(&self) -> Result<Option<PatchJournal>> {
        if !self.journal_path.exists() {
            return Ok(None);
        }

        let content = fs::read_to_string(&self.journal_path).await?;
        let journal: PatchJournal = serde_json::from_str(&content)
            .map_err(|e| crate::error::SophonError::Serialization(e.to_string()))?;
        
        Ok(Some(journal))
    }

    pub async fn save(&self, journal: &PatchJournal) -> Result<()> {
        if let Some(parent) = self.journal_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        let content = serde_json::to_string_pretty(journal)
            .map_err(|e| crate::error::SophonError::Serialization(e.to_string()))?;
        
        fs::write(&self.journal_path, content).await?;
        Ok(())
    }

    pub async fn delete(&self) -> Result<()> {
        if self.journal_path.exists() {
            fs::remove_file(&self.journal_path).await?;
        }
        Ok(())
    }

    pub fn update_entry_status(journal: &mut PatchJournal, chunk_id: &str, status: PatchStatus) {
        if let Some(entry) = journal.entries.iter_mut().find(|e| e.chunk_id == chunk_id) {
            entry.status = status;
        }
    }
}
