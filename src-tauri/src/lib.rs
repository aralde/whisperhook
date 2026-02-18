mod state;
use state::AppState;
use tauri::{App, Manager, Listener, Emitter};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState, Code, Modifiers};
use std::sync::Mutex;
use enigo::{Enigo, Keyboard, Settings};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;


#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn start_recording(app: tauri::AppHandle) {
    let _ = app.emit("app-status", "recording");
    let state = app.state::<AppState>();
    let mut sidecar = state.sidecar_process.lock().unwrap();
    if let Some(child) = sidecar.as_mut() {
        let _ = child.write(b"start_record\n");
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct AppSettings {
    model: String, // "tiny", "base", "small", "medium", "large-v3"
    device: String, // "cpu", "cuda"

}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            model: "base".to_string(),
            device: "cpu".to_string(),
        }
    }
}

fn get_settings_path(app: &tauri::AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap().join("settings.json")
}

fn load_settings(app: &tauri::AppHandle) -> AppSettings {
    let path = get_settings_path(app);
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(mut settings) = serde_json::from_str::<AppSettings>(&content) {
                if settings.model == "large-v3" {
                    settings.model = "base".to_string();
                }
                return settings;
            }
        }
    }
    AppSettings::default()
}

#[tauri::command]
fn get_settings(app: tauri::AppHandle) -> AppSettings {
    load_settings(&app)
}

fn spawn_sidecar(app: &tauri::AppHandle) {
    let app_handle = app.clone();
    
    // Kill existing sidecar if any
    {
        let state = app_handle.state::<AppState>();
        let mut sidecar = state.sidecar_process.lock().unwrap();
        if let Some(child) = sidecar.as_mut() {
            let _ = child.write(b"exit\n"); // Graceful exit request
            // We could also try child.kill() if available, but "exit" is safer for our python script
        }
        *sidecar = None;
    }

    tauri::async_runtime::spawn(async move {
        let current_dir = std::env::current_dir().unwrap();
        // In dev, we are likely in src-tauri, so go up one level
        let script_path = if current_dir.ends_with("src-tauri") {
                current_dir.parent().unwrap().join("python-core/service.py")
        } else {
                current_dir.join("python-core/service.py")
        }; 
        println!("Launching python script at: {:?}", script_path);
        
        let settings = load_settings(&app_handle);
        println!("Loading with settings: {:?}", settings);

        let (mut rx, child) = app_handle.shell().command("python")
            .args([
                "-u",
                script_path.to_str().unwrap(),
                "--model", &settings.model,
                "--device", &settings.device
            ])
            .spawn()
            .expect("Failed to spawn python sidecar");
        
        // Store child
        {
            let state = app_handle.state::<AppState>();
            *state.sidecar_process.lock().unwrap() = Some(child);
        }
        
        // Read stdout
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Stdout(line) = event {
                let text = String::from_utf8_lossy(&line);
                println!("Python: {}", text);
                
                // Try to parse as JSON
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                    if let Some(t) = json.get("text") {
                        if let Some(s) = t.as_str() {
                                if !s.is_empty() {
                                    println!("Injecting text: {}", s);
                                    let _ = app_handle.emit("app-status", "done");
                                    let _ = app_handle.emit("transcription", s); 
                                    
                                    match Enigo::new(&Settings::default()) {
                                        Ok(mut enigo) => {
                                            let _ = enigo.text(s);
                                        },
                                        Err(e) => {
                                            println!("Failed to init Enigo: {:?}", e);
                                        }
                                    }
                                    // Window stays visible. "Done" state in UI will handle visuals.
                                }
                        }
                    } else if let Some(error) = json.get("error") {
                        if let Some(e) = error.as_str() {
                            println!("Python Error Event: {}", e);
                            let _ = app_handle.emit("app-status", "error");
                            let _ = app_handle.emit("app-error", e);
                        }
                    } else if let Some(status) = json.get("status") {
                            if let Some(s) = status.as_str() {
                                    // FILTER: Ignore 'recording_stopped' to prevent UI flicker
                                    if s != "recording_stopped" {
                                        let _ = app_handle.emit("app-status", s);
                                    }
                            }
                    }
                }
            } else if let CommandEvent::Stderr(line) = event {
                let err_msg = String::from_utf8_lossy(&line);
                let trimmed = err_msg.trim();
                if !trimmed.is_empty() {
                    println!("Python Err: {}", trimmed);
                    let _ = app_handle.emit("app-status", "error");
                    let _ = app_handle.emit("app-error", trimmed.to_string());
                }
            }
        }
    });
}

#[tauri::command]
fn save_settings(app: tauri::AppHandle, settings: AppSettings) {
    let path = get_settings_path(&app);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let _ = fs::write(path, serde_json::to_string_pretty(&settings).unwrap());
    
    // Restart sidecar with new settings
    spawn_sidecar(&app);
}

#[tauri::command]
fn stop_recording(app: tauri::AppHandle) {
    let _ = app.emit("app-status", "transcribing");
    let state = app.state::<AppState>();
    let mut sidecar = state.sidecar_process.lock().unwrap();
    if let Some(child) = sidecar.as_mut() {
        let _ = child.write(b"stop_record\n");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "settings" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .plugin(tauri_plugin_global_shortcut::Builder::new().with_handler(move |app, _shortcut, event| {
             if event.state() == ShortcutState::Pressed {
                 // Ensure top-most
                 if let Some(window) = app.get_webview_window("main") {
                      let _ = window.set_always_on_top(true);
                 }
                 
                 let _ = app.emit("app-status", "recording");

                 let state = app.state::<AppState>();
                 let mut sidecar = state.sidecar_process.lock().unwrap();
                 if let Some(child) = sidecar.as_mut() {
                     let _ = child.write(b"start_record\n");
                 }
             } else if event.state() == ShortcutState::Released {
                 let _ = app.emit("app-status", "transcribing");
                 let state = app.state::<AppState>();
                 let mut sidecar = state.sidecar_process.lock().unwrap();
                 if let Some(child) = sidecar.as_mut() {
                     let _ = child.write(b"stop_record\n");
                 }
             }
        }).build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // --- System Tray ---
            use tauri::menu::{Menu, MenuItem};
            use tauri::tray::TrayIconBuilder;
            
            let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let toggle_i = MenuItem::with_id(app, "toggle", "Hide/Show Avatar", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle_i, &settings_i, &quit_i])?;
            
            let _ = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(true)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app: &tauri::AppHandle, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "settings" => {
                            if let Some(window) = app.get_webview_window("settings") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            } else {
                                // Should be created via config, but if not found, maybe log or try create
                                println!("Settings window not found");
                            }
                        }
                        "toggle" => {
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // --- Force Window Configuration ---
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize { width: 250.0, height: 250.0 }));
                let _ = window.set_resizable(false);
                let _ = window.unmaximize();
                let _ = window.set_decorations(false);
                // Ensure it's always on top and visible on startup
                let _ = window.set_always_on_top(true);
            }

            // --- Spawn Python Sidecar ---
            spawn_sidecar(app.handle());
            
            // --- Register Hotkey ---
            use tauri_plugin_global_shortcut::Shortcut;
            use std::str::FromStr;
            
             if let Ok(shortcut) = Shortcut::from_str("Ctrl+Shift+M") {
                  if let Err(e) = app.global_shortcut().register(shortcut) {
                      println!("Failed to register global shortcut: {:?}", e);
                  }
             } else {
                 println!("Failed to parse shortcut string");
             }
            
            Ok(())
        })
        .manage(AppState { sidecar_process: Mutex::new(None) })
        .invoke_handler(tauri::generate_handler![greet, start_recording, stop_recording, get_settings, save_settings])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
