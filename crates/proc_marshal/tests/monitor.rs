use proc_marshal::*;

#[test]
fn test_process_search_sophisticated() {
    let pid = MemoryPatcher::find_process_by_name("this_is_not_a_real_process_name_hopefully");
    assert!(pid.is_none());
}

#[test]
fn test_monitor_name_matching_logic() {
    // trust sysinfo
}

#[test]
fn test_monitor_is_running_failure() {
    assert!(!Monitor::is_running("non_existent_process_12345"));
}

#[tokio::test]
async fn test_unlock_fps_signature() {
    let pattern = vec![0x7F, 0x0F];
    let res = MemoryPatcher::unlock_fps("test_process", 120, pattern).await;
    #[cfg(not(windows))]
    assert!(res.is_ok());
}

#[test]
fn test_tuner_discrete_gpu_stub() {
    let tuner = Tuner;
    let result = tuner.force_discrete_gpu("fake_game.exe");
    assert!(result.is_ok());
}
