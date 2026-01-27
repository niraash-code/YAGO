pub mod error;
pub mod launcher;
pub mod manual_map;
pub mod monitor;
pub mod patcher;
pub mod sandbox;
pub mod tuner;

#[cfg(target_os = "windows")]
pub mod windows;

#[cfg(target_os = "linux")]
pub mod linux;

pub use error::{MarshalError, Result};
pub use launcher::{InjectionMethod, LaunchOptions, Launcher, RunnerConfig, RunnerType};
pub use monitor::Monitor;
pub use patcher::MemoryPatcher;
pub use sandbox::{SandboxConfig, SandboxManager};
pub use tuner::Tuner;

#[cfg(target_os = "linux")]
pub use linux::{launch_with_proton, LaunchConfig};
