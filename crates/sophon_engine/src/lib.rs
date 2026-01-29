pub mod downloader;
pub mod error;
pub mod protocol;
pub mod provider;
pub mod verifier;
pub mod client;
pub mod orchestrator;
pub mod scanner;
pub mod patcher;
pub mod journal;

pub use client::SophonClient;
pub use orchestrator::{ChunkOrchestrator, OrchestratorEvent};
pub use scanner::{Scanner, ScanMode, DivergenceMap};
pub use downloader::{DownloadProgress, DownloadStatus, DownloadTask, Downloader};
pub use error::{Result, SophonError};
pub use protocol::{ChunkInfo, SophonManifest, SophonProtocol};
pub use provider::{GameInfo, GamePackage, Provider};
pub use verifier::Verifier;

// This is where Protobuf generated code will eventually live
// pub mod proto {
//     include!(concat!(env!("OUT_DIR"), "/sophon.rs"));
// }
