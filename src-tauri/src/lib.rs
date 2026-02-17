mod state;
use state::AppState;
use tauri::{App, Manager, Listener, Emitter};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState, Code, Modifiers};
use std::sync::Mutex;
use enigo::{Enigo, Keyboard, Settings};

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
        .plugin(tauri_plugin_global_shortcut::Builder::new().with_handler(move |app, shortcut, event| {
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
            
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let toggle_i = MenuItem::with_id(app, "toggle", "Hide/Show Avatar", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle_i, &quit_i])?;
            
            let _ = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(true)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app: &tauri::AppHandle, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
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
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let current_dir = std::env::current_dir().unwrap();
                // In dev, we are likely in src-tauri, so go up one level
                let script_path = if current_dir.ends_with("src-tauri") {
                     current_dir.parent().unwrap().join("python-core/service.py")
                } else {
                     current_dir.join("python-core/service.py")
                }; 
                println!("Launching python script at: {:?}", script_path);

                let (mut rx, child) = app_handle.shell().command("python")
                    .args([
                        "-u",
                        script_path.to_str().unwrap()
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
                       println!("Python Err: {}", String::from_utf8_lossy(&line));
                   }
                }
            });
            
            // --- Register Hotkey ---
            use tauri_plugin_global_shortcut::Shortcut;
            use std::str::FromStr;
            
            if let Ok(shortcut) = Shortcut::from_str("Ctrl+Shift+M") {
                 app.global_shortcut().register(shortcut).expect("Failed to register global shortcut");
            } else {
                println!("Failed to parse shortcut string");
            }
            
            Ok(())
        })
        .manage(AppState { sidecar_process: Mutex::new(None) })
        .invoke_handler(tauri::generate_handler![greet, start_recording, stop_recording])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
