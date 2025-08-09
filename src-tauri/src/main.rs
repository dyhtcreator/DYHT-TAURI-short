#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{Manager, WindowEvent};

mod whisper;
mod database;
mod ai;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Initialize database on startup
            let config = app.config();
            match database::Database::new(&config) {
                Ok(_) => println!("Database initialized successfully"),
                Err(e) => eprintln!("Failed to initialize database: {}", e),
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            whisper::transcribe_audio,
            whisper::analyze_audio_features,
            ai::chat_with_dwight,
            ai::analyze_audio_intelligence,
            database_commands::save_audio_record,
            database_commands::get_audio_records,
            database_commands::save_trigger,
            database_commands::get_triggers
        ])
        .on_window_event(|event| {
            if let WindowEvent::CloseRequested { .. } = event.event() {
                // Handle cleanup if needed
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri app");
}

mod database_commands {
    use tauri::command;
    use crate::database::{Database, AudioRecord, SoundTrigger};

    #[command]
    pub async fn save_audio_record(
        title: String,
        file_path: String,
        transcript: Option<String>,
        duration: f64,
        triggers: Option<String>,
        app_handle: tauri::AppHandle,
    ) -> Result<i64, String> {
        let config = app_handle.config();
        let db = Database::new(&config).map_err(|e| format!("Database error: {}", e))?;
        
        let record = AudioRecord {
            id: None,
            title,
            file_path,
            transcript,
            duration,
            created_at: String::new(),
            triggers,
        };
        
        db.save_audio_record(&record).map_err(|e| format!("Database error: {}", e))
    }

    #[command]
    pub async fn get_audio_records(app_handle: tauri::AppHandle) -> Result<Vec<AudioRecord>, String> {
        let config = app_handle.config();
        let db = Database::new(&config).map_err(|e| format!("Database error: {}", e))?;
        
        db.get_all_audio_records().map_err(|e| format!("Database error: {}", e))
    }

    #[command]
    pub async fn save_trigger(
        trigger_type: String,
        trigger_value: String,
        app_handle: tauri::AppHandle,
    ) -> Result<i64, String> {
        let config = app_handle.config();
        let db = Database::new(&config).map_err(|e| format!("Database error: {}", e))?;

        let trigger = SoundTrigger {
            id: None,
            trigger_type,
            trigger_value,
            is_active: true,
            created_at: String::new(),
        };
        
        db.save_trigger(&trigger).map_err(|e| format!("Database error: {}", e))
    }

    #[command]
    pub async fn get_triggers(app_handle: tauri::AppHandle) -> Result<Vec<SoundTrigger>, String> {
        let config = app_handle.config();
        let db = Database::new(&config).map_err(|e| format!("Database error: {}", e))?;
        
        db.get_active_triggers().map_err(|e| format!("Database error: {}", e))
    }
}