use tauri::command;

#[command]
pub async fn transcribe_audio(file_path: String) -> Result<String, String> {
    // Placeholder: Replace with actual Whisper model integration
    // For now, just echo the file path as the "transcript"
    Ok(format!("(Mock transcript) Received file: {}", file_path))
}