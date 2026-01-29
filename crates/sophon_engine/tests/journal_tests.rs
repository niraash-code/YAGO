use sophon_engine::journal::{JournalManager, PatchJournal, PatchStatus, PatchEntry};
use chrono::Utc;
use tempfile::tempdir;

#[tokio::test]
async fn test_journal_persistence() {
    let dir = tempdir().unwrap();
    let game_id = "test_game";
    let manager = JournalManager::new(dir.path(), game_id);

    // 1. Load non-existent
    let journal = manager.load().await.unwrap();
    assert!(journal.is_none());

    // 2. Save
    let journal_data = PatchJournal {
        game_id: game_id.to_string(),
        target_version: "1.0.1".to_string(),
        entries: vec![
            PatchEntry {
                chunk_id: "chunk_a".to_string(),
                status: PatchStatus::Applied,
                targets: vec![],
                retry_count: 0,
            }
        ],
        started_at: Utc::now(),
    };

    manager.save(&journal_data).await.unwrap();

    // 3. Load existing
    let loaded = manager.load().await.unwrap().unwrap();
    assert_eq!(loaded.game_id, "test_game");
    assert_eq!(loaded.entries.len(), 1);
    assert!(matches!(loaded.entries[0].status, PatchStatus::Applied));

    // 4. Update status helper (Need to update struct directly as JournalManager only has static update helper which takes &mut PatchJournal)
    let mut journal_to_modify = loaded.clone();
    JournalManager::update_entry_status(&mut journal_to_modify, "chunk_a", PatchStatus::Verified);
    assert!(matches!(journal_to_modify.entries[0].status, PatchStatus::Verified));

    // 5. Delete
    manager.delete().await.unwrap();
    let deleted = manager.load().await.unwrap();
    assert!(deleted.is_none());
}
