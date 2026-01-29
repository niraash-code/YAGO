pub mod client;
pub mod downloader;
pub mod error;
pub mod journal;
pub mod orchestrator;
pub mod patcher;
pub mod protocol;
pub mod provider;
pub mod scanner;
pub mod verifier;

pub use client::SophonClient;
pub use downloader::{DownloadProgress, DownloadStatus, DownloadTask, Downloader};
pub use error::{Result, SophonError};
pub use journal::{JournalManager, PatchEntry, PatchJournal, PatchStatus, PatchTarget};
pub use orchestrator::{ChunkOrchestrator, OrchestratorEvent};
pub use protocol::{
    ChunkInfo, DiffPackage, FileChunkReference, ManifestFile, ManifestStats, SophonManifest,
    SophonProtocol,
};
pub use provider::{GameInfo, GamePackage, Provider};
pub use scanner::{DivergenceMap, ScanMode, Scanner};
pub use verifier::Verifier;

// This is where Protobuf generated code will eventually live
// pub mod proto {
//     include!(concat!(env!("OUT_DIR"), "/sophon.rs"));
// }
