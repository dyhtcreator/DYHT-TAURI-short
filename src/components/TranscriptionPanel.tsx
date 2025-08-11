import React, { useState } from "react";
import { autoSaveTranscript } from "../db";

export default function TranscriptionPanel() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAudioFile(file);
    console.log("File selected:", file?.name || "none");
  };

  const handleMockTranscription = async () => {
    setLoading(true);
    
    try {
      // Mock transcription for testing autosave
      const mockTranscript = `Mock transcription created at ${new Date().toLocaleTimeString()}`;
      setTranscript(mockTranscript);
      
      // AUTO-SAVE: Immediately save the transcript to database
      try {
        await autoSaveTranscript(mockTranscript, "mock-audio.wav");
        console.log("Mock transcript auto-saved successfully");
      } catch (error) {
        console.error("Failed to auto-save mock transcript:", error);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Mock transcription failed:", error);
      setLoading(false);
    }
  };

  const handleTranscribe = async () => {
    if (!audioFile) return;
    setLoading(true);

    try {
      // In a real app, you'd call the Tauri backend here.
      // For now, mock transcription:
      setTimeout(async () => {
        const mockTranscript = `(Mock transcript) Audio file: ${audioFile.name}`;
        setTranscript(mockTranscript);
        
        // AUTO-SAVE: Immediately save the transcript to database
        try {
          await autoSaveTranscript(mockTranscript, audioFile.name);
          console.log("Transcript auto-saved successfully");
        } catch (error) {
          console.error("Failed to auto-save transcript:", error);
        }
        
        setLoading(false);
      }, 1200);
    } catch (error) {
      console.error("Transcription failed:", error);
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Transcription Panel</h2>
      <input type="file" accept="audio/*" onChange={handleFileChange} />
      <button
        onClick={handleTranscribe}
        disabled={!audioFile || loading}
        style={{ marginLeft: "1em" }}
      >
        {loading ? "Transcribing..." : "Transcribe"}
      </button>
      <button
        onClick={handleMockTranscription}
        disabled={loading}
        style={{ marginLeft: "1em", background: "#28a745", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px" }}
      >
        {loading ? "Creating..." : "Create Mock Transcript"}
      </button>
      {transcript && (
        <div style={{ marginTop: "1em" }}>
          <h3>Transcript:</h3>
          <pre style={{ background: "#f5f5f5", padding: "0.5em" }}>
            {transcript}
          </pre>
          <small style={{ color: "#666" }}>✓ Auto-saved to database</small>
        </div>
      )}
    </div>
  );
}