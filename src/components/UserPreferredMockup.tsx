import React, { useState, useEffect, useRef } from "react";

// Cloud image background - matches your filename and location
const CLOUD_BG_URL = "/myclouds.svg";

// Theme colors
const colors = {
  cobalt: "#38B6FF",
  black: "#181a1b", 
  dark: "#232526",
  accent: "#0f2027",
  gray: "#222",
  text: "#eee",
  border: "#222d",
};

// SVG Bat logo (center + watermark)
function BatLogo({ size = 72 }) {
  return (
    <svg
      width={size}
      height={size / 4}
      viewBox="0 0 72 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", margin: "0 auto" }}
    >
      <path
        d="M2 17 Q8 2 18 9 Q36 2 54 9 Q64 2 70 17 Q50 6 36 16 Q22 6 2 17"
        fill={colors.black}
        stroke={colors.cobalt}
        strokeWidth="2"
      />
    </svg>
  );
}

// Animated circular waveform (magic!)
const CircularWaveform = ({ size = 120, animate }) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!animate) return;
    const timer = setInterval(() => setTick(t => t + 1), 45);
    return () => clearInterval(timer);
  }, [animate]);
  
  const points = [];
  const segments = 16;
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const base = size / 2;
    const radius =
      base - 22 +
      14 * Math.abs(Math.sin(angle * 3 + tick / 15) * Math.cos(angle + tick / 8)) +
      9 * Math.abs(Math.sin(tick / 5 + angle * 2));
    points.push({
      x1: base + 22 * Math.cos(angle),
      y1: base + 22 * Math.sin(angle),
      x2: base + (22 + radius) * Math.cos(angle),
      y2: base + (22 + radius) * Math.sin(angle),
      color: colors.cobalt,
    });
  }
  
  return (
    <svg width={size} height={size}>
      <circle 
        cx={size / 2} 
        cy={size / 2} 
        r={28} 
        fill={colors.black} 
        stroke={colors.cobalt}
        strokeWidth="2"
      />
      {points.map((point, i) => (
        <line
          key={i}
          x1={point.x1}
          y1={point.y1}
          x2={point.x2}
          y2={point.y2}
          stroke={point.color}
          strokeWidth="2"
          opacity={0.8}
        />
      ))}
    </svg>
  );
};

export default function UserPreferredMockup() {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState("");
  const [customPhrase, setCustomPhrase] = useState("");
  const [manualTriggerActive, setManualTriggerActive] = useState(false);
  const [transcripts, setTranscripts] = useState<string[]>([]);

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handleManualTrigger = () => {
    setManualTriggerActive(true);
    const timestamp = new Date().toLocaleTimeString();
    setTranscripts(prev => [...prev, `Manual trigger activated at ${timestamp}`]);
    
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
        backgroundImage: `url(${CLOUD_BG_URL})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: colors.dark, // fallback if image doesn't load
        minHeight: "100vh",
        color: colors.text,
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
          color: colors.cobalt,
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
          <h2 style={{ color: colors.cobalt, marginBottom: "8px" }}>Audio Input Panel</h2>
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            style={{
              background: isRecording ? "#ff4444" : colors.gray,
              color: isRecording ? "#fff" : colors.cobalt,
              border: `2px solid ${isRecording ? "#ff4444" : colors.cobalt}`,
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
          
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div
              style={{
                background: colors.black,
                border: `1.5px solid ${colors.cobalt}`,
                borderRadius: "10px",
                width: "110px",
                height: "90px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.cobalt,
                fontWeight: "bold",
                boxShadow: "0 2px 8px #0008",
              }}
            >
              {isRecording ? "🔴 REC" : "Recorder"}
            </div>
            <div
              style={{
                background: colors.black,
                border: `1.5px solid ${colors.cobalt}`,
                borderRadius: "10px",
                width: "130px",
                height: "90px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px #0008",
                overflow: "hidden",
                padding: "8px"
              }}
            >
              <CircularWaveform size={80} animate={isRecording} />
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
            background: colors.black,
            border: `2px solid ${colors.cobalt}`,
            borderRadius: "18px",
            padding: "28px",
            boxShadow: "0 2px 12px #0008",
            minHeight: "320px",
          }}
        >
          <h2 style={{ color: colors.cobalt, marginBottom: "18px", letterSpacing: "1px" }}>
            Trigger Control Panel
          </h2>
          <button
            onClick={handleManualTrigger}
            style={{
              background: manualTriggerActive ? "#ff6b00" : colors.cobalt,
              color: colors.gray,
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
            <span style={{ color: colors.cobalt, fontWeight: "bold", marginRight: "10px" }}>
              Sound Triggers:
            </span>
            <select
              style={{
                background: colors.gray,
                color: colors.cobalt,
                border: `1.5px solid ${colors.cobalt}`,
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
            <span style={{ color: colors.cobalt, fontWeight: "bold", marginRight: "10px" }}>
              Vocal Trigger Phrase:
            </span>
            <input
              type="text"
              placeholder="Type a word or phrase..."
              style={{
                background: colors.gray,
                color: colors.cobalt,
                border: `1.5px solid ${colors.cobalt}`,
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
                background: colors.cobalt,
                color: colors.gray,
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
          <h2 style={{ color: colors.cobalt, marginBottom: "8px" }}>Transcript History</h2>
          <div
            style={{
              background: colors.black,
              border: `2px solid ${colors.cobalt}`,
              borderRadius: "12px",
              padding: "18px",
              boxShadow: "0 2px 8px #0008",
              color: colors.cobalt,
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
            background: colors.black,
            border: `2px solid ${colors.cobalt}`,
            borderRadius: "12px",
            padding: "18px",
            boxShadow: "0 2px 8px #0008",
            minWidth: "160px",
            flex: 1,
          }}
        >
          <h3 style={{ color: colors.cobalt }}>Transcript</h3>
          <div style={{ color: "#ccc", fontSize: "0.9rem", minHeight: "60px" }}>
            {isRecording ? "Listening for audio..." : "Start recording to see transcript"}
          </div>
        </div>
        <div
          style={{
            background: colors.black,
            border: `2px solid ${colors.cobalt}`,
            borderRadius: "12px",
            padding: "18px",
            boxShadow: "0 2px 8px #0008",
            flex: 2,
          }}
        >
          <h3 style={{ color: colors.cobalt }}>Transcription Panel</h3>
          <input
            type="file"
            accept="audio/*"
            style={{
              marginTop: "8px",
              marginRight: "12px",
              background: colors.gray,
              color: colors.cobalt,
              border: `1px solid ${colors.cobalt}`,
              borderRadius: "6px",
              padding: "6px",
            }}
          />
          <button
            style={{
              background: isRecording ? colors.cobalt : "#666",
              color: isRecording ? colors.black : "#ccc",
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