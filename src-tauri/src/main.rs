#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{Manager, WindowEvent};
use std::sync::Arc;

mod whisper;
mod vision;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // You can set up global state or initialize backend here
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            whisper::transcribe_audio,
            vision::describe_image
        ])
        .on_window_event(|event| {
            if let WindowEvent::CloseRequested { .. } = event.event() {
                // Handle cleanup if needed
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri app");
}