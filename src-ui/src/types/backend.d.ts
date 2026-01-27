export interface ConflictEntry {
  winning_mod: string; // UUID
  losing_mod: string; // UUID
  hash: string; // The collision key
}

export interface ConflictReport {
  overwritten_hashes: Record<string, string[]>; // Hash -> List of Mod UUIDs
}

export interface DownloadProgress {
  task_id: string;
  progress: number; // 0.0 to 100.0
  downloaded: number; // bytes
  total: number; // bytes
  speed: string;
  eta: string;
}

export interface DeploymentResult {
  success: boolean; // Derived from Result<Ok> vs Err
  report?: ConflictReport;
}
