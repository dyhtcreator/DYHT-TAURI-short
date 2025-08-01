import React, { useState } from "react";
import { useAudioBuffer } from "../hooks/useAudioBuffer";
import LinearWaveform from "./Waveform";
import CircularWaveform from "./CircularWaveform";

// SVG Bat Logo (blue accent)
const BatLogo = ({ size = 64 }) => (
  <svg
    width={size}
    height={size / 4}
    viewBox="0 0 64 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block", margin: "0 auto" }}
  >
    <path
      d="M2 15 Q7 2 16 8 Q32 2 48 8 Q57 2 62 15 Q45 5 32 14 Q19 5 2 15"
      fill="#222"
      stroke="#38B6FF"
      strokeWidth="1"
    />
  </svg>
);

export default function CoolDashboardMockup() {
  const [selectedTrigger, setSelectedTrigger] = useState("");
  const [customPhrase, setCustomPhrase] = useState("");
  const [manualTriggerActive, setManualTriggerActive] = useState(false);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [waveformType, setWaveformType] = useState<'linear' | 'circular'>('linear');
  
  const { audioData, isRecording, startRecording, stopRecording } = useAudioBuffer();

  const handleManualTrigger = () => {
    setManualTriggerActive(true);
    const timestamp = new Date().toLocaleTimeString();
    setTranscripts(prev => [...prev, `Manual trigger activated at ${timestamp}`]);
    
    // Reset after 2 seconds
    setTimeout(() => setManualTriggerActive(false), 2000);
  };

  const handleSetTrigger = () => {
    if (customPhrase.trim()) {
      const timestamp = new Date().toLocaleTimeString();
      setTranscripts(prev => [...prev, `Trigger phrase set: "${customPhrase}" at ${timestamp}`]);
    }
  };

  const handleSoundTriggerChange = (value: string) => {
    setSelectedTrigger(value);
    if (value) {
      const timestamp = new Date().toLocaleTimeString();
      setTranscripts(prev => [...prev, `Sound trigger activated: ${value} at ${timestamp}`]);
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #232526 0%, #0f2027 100%)",
        minHeight: "100vh",
        color: "#eee",
        fontFamily: "Montserrat, Arial, sans-serif",
        padding: "36px",
        position: "relative",
      }}
    >
      <BatLogo size={128} />
      <h1
        style={{
          textAlign: "center",
          fontSize: "2.6rem",
          fontWeight: "800",
          letterSpacing: "2px",
          color: "#38B6FF",
          marginTop: "12px",
          textShadow: "0 2px 8px #000",
        }}
      >
        Dwight Tauri Dashboard
      </h1>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "32px",
          gap: "32px",
        }}
      >
        {/* Audio Input Panel */}
        <div style={{ flex: 1 }}>
          <h2 style={{ color: "#38B6FF", marginBottom: "8px" }}>Audio Input Panel</h2>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            style={{
              background: isRecording ? "#ff4444" : "#222",
              color: isRecording ? "#fff" : "#38B6FF",
              border: `2px solid ${isRecording ? "#ff4444" : "#38B6FF"}`,
              borderRadius: "8px",
              padding: "8px 18px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 2px 8px #0007",
              marginBottom: "20px",
            }}
          >
            {isRecording ? "Stop Recording" : "Start Recording"}
          </button>
          
          <div style={{ marginBottom: "16px" }}>
            <button
              onClick={() => setWaveformType(waveformType === 'linear' ? 'circular' : 'linear')}
              style={{
                background: "#333",
                color: "#38B6FF",
                border: "1px solid #38B6FF",
                borderRadius: "6px",
                padding: "4px 12px",
                fontSize: "0.9rem",
                cursor: "pointer",
                marginBottom: "8px"
              }}
            >
              Switch to {waveformType === 'linear' ? 'Circular' : 'Linear'} Waveform
            </button>
          </div>
          
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div
              style={{
                background: "#191919",
                border: "1.5px solid #38B6FF",
                borderRadius: "10px",
                width: "110px",
                height: "90px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#38B6FF",
                fontWeight: "bold",
                boxShadow: "0 2px 8px #0008",
              }}
            >
              {isRecording ? "🔴 REC" : "Recorder"}
            </div>
            <div
              style={{
                background: "#191919",
                border: "1.5px solid #38B6FF",
                borderRadius: "10px",
                width: waveformType === 'circular' ? "130px" : "250px",
                height: "90px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px #0008",
                overflow: "hidden",
                padding: "8px"
              }}
            >
              {waveformType === 'linear' ? (
                <LinearWaveform audioData={audioData} width={220} height={60} />
              ) : (
                <CircularWaveform audioData={audioData} size={80} />
              )}
            </div>
          </div>
        </div>

        {/* Triggers Panel (center) */}
        <div
          style={{
            flex: 1.3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#191919",
            border: "2px solid #38B6FF",
            borderRadius: "18px",
            padding: "28px",
            boxShadow: "0 2px 12px #0008",
            minHeight: "320px",
          }}
        >
          <h2 style={{ color: "#38B6FF", marginBottom: "18px", letterSpacing: "1px" }}>
            Trigger Control Panel
          </h2>
          <button
            onClick={handleManualTrigger}
            style={{
              background: manualTriggerActive ? "#ff6b00" : "#38B6FF",
              color: "#222",
              border: "none",
              borderRadius: "10px",
              padding: "10px 24px",
              fontWeight: "bold",
              fontSize: "1.1rem",
              marginBottom: "22px",
              cursor: "pointer",
              boxShadow: "0 2px 8px #0007",
              transform: manualTriggerActive ? "scale(1.05)" : "scale(1)",
              transition: "all 0.2s ease"
            }}
          >
            {manualTriggerActive ? "TRIGGERED!" : "Manual Trigger"}
          </button>
          <div style={{ marginBottom: "22px", width: "100%" }}>
            <span style={{ color: "#38B6FF", fontWeight: "bold", marginRight: "10px" }}>
              Sound Triggers:
            </span>
            <select
              style={{
                background: "#222",
                color: "#38B6FF",
                border: "1.5px solid #38B6FF",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "1rem",
              }}
              value={selectedTrigger}
              onChange={(e) => handleSoundTriggerChange(e.target.value)}
            >
              <option value="">Pick a sound...</option>
              <option value="baby">Baby Crying</option>
              <option value="car">Car Screeching</option>
              <option value="gunshot">Gunshots</option>
              <option value="glass">Glass Breaking</option>
            </select>
          </div>
          <div style={{ width: "100%" }}>
            <span style={{ color: "#38B6FF", fontWeight: "bold", marginRight: "10px" }}>
              Vocal Trigger Phrase:
            </span>
            <input
              type="text"
              placeholder="Type a word or phrase..."
              style={{
                background: "#222",
                color: "#38B6FF",
                border: "1.5px solid #38B6FF",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "1rem",
                width: "56%",
                marginRight: "10px",
              }}
              value={customPhrase}
              onChange={(e) => setCustomPhrase(e.target.value)}
            />
            <button
              onClick={handleSetTrigger}
              style={{
                background: "#38B6FF",
                color: "#222",
                border: "none",
                borderRadius: "6px",
                padding: "8px 16px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: "0 2px 8px #0007",
              }}
            >
              Set Trigger
            </button>
          </div>
        </div>

        {/* Transcript History */}
        <div style={{ flex: 1 }}>
          <h2 style={{ color: "#38B6FF", marginBottom: "8px" }}>Transcript History</h2>
          <div
            style={{
              background: "#191919",
              border: "2px solid #38B6FF",
              borderRadius: "12px",
              padding: "18px",
              boxShadow: "0 2px 8px #0008",
              color: "#38B6FF",
              minHeight: "200px",
              maxHeight: "300px",
              overflowY: "auto"
            }}
          >
            {transcripts.length === 0 ? (
              "No transcripts yet."
            ) : (
              transcripts.map((transcript, index) => (
                <div key={index} style={{ marginBottom: "8px", fontSize: "0.9rem" }}>
                  {transcript}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Transcript + Transcription Panel - moved below main row */}
      <div
        style={{
          display: "flex",
          gap: "24px",
          marginTop: "28px",
        }}
      >
        <div
          style={{
            background: "#191919",
            border: "2px solid #38B6FF",
            borderRadius: "12px",
            padding: "18px",
            boxShadow: "0 2px 8px #0008",
            minWidth: "160px",
            flex: 1,
          }}
        >
          <h3 style={{ color: "#38B6FF" }}>Live Transcript</h3>
          <div style={{ color: "#ccc", fontSize: "0.9rem", minHeight: "60px" }}>
            {isRecording ? "Listening for audio..." : "Start recording to see transcript"}
          </div>
        </div>
        <div
          style={{
            background: "#191919",
            border: "2px solid #38B6FF",
            borderRadius: "12px",
            padding: "18px",
            boxShadow: "0 2px 8px #0008",
            flex: 2,
          }}
        >
          <h3 style={{ color: "#38B6FF" }}>Transcription Panel</h3>
          <input
            type="file"
            accept="audio/*"
            style={{
              marginTop: "8px",
              marginRight: "12px",
              background: "#222",
              color: "#38B6FF",
              border: "1px solid #38B6FF",
              borderRadius: "6px",
              padding: "6px",
            }}
          />
          <button
            style={{
              background: isRecording ? "#38B6FF" : "#666",
              color: isRecording ? "#191919" : "#ccc",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              fontWeight: "bold",
              marginLeft: "10px",
              cursor: isRecording ? "pointer" : "not-allowed",
              boxShadow: "0 2px 8px #0007",
            }}
            disabled={!isRecording}
          >
            Transcribe
          </button>
        </div>
      </div>

      {/* Bat logo watermark in the bottom right */}
      <div
        style={{
          position: "fixed",
          bottom: "18px",
          right: "38px",
          opacity: 0.18,
          pointerEvents: "none",
        }}
      >
        <BatLogo size={120} />
      </div>
    </div>
  );
}