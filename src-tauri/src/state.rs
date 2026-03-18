use std::sync::Mutex;
use tauri_plugin_shell::process::CommandChild;

pub struct AppState {
    pub sidecar_process: Mutex<Option<CommandChild>>,
    pub realtime_active: Mutex<bool>,
}
