import React, { useState, useEffect } from "react";
import { autoSaveSetting, getSetting, getTranscripts } from "../db";
import type { Transcript } from "../db/schema";

// Mini component for showing recent transcripts in dashboard
function TranscriptHistoryMini() {
  const [recentTranscripts, setRecentTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecentTranscripts = async () => {
      try {
        const transcripts = await getTranscripts();
        setRecentTranscripts(transcripts.slice(0, 3)); // Show only latest 3
      } catch (error) {
        console.error("Failed to load recent transcripts:", error);
      } finally {
        setLoading(false);
      }
    };

    loadRecentTranscripts();
    
    // Auto-refresh every 3 seconds
    const interval = setInterval(loadRecentTranscripts, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <p style={{ color: "#38B6FF", fontSize: "0.9em" }}>Loading...</p>;
  }

  if (recentTranscripts.length === 0) {
    return <p style={{ color: "#38B6FF", fontSize: "0.9em" }}>No transcripts yet.</p>;
  }

  return (
    <div style={{ fontSize: "0.8em" }}>
      {recentTranscripts.map((transcript) => (
        <div key={transcript.id} style={{ marginBottom: "8px", borderBottom: "1px solid #333", paddingBottom: "6px" }}>
          <div style={{ color: "#666", fontSize: "0.8em", marginBottom: "2px" }}>
            {new Date(transcript.timestamp).toLocaleTimeString()}
          </div>
          <div style={{ color: "#38B6FF" }}>
            {transcript.content.length > 60 
              ? transcript.content.substring(0, 60) + "..." 
              : transcript.content}
          </div>
        </div>
      ))}
      {recentTranscripts.length > 0 && (
        <div style={{ color: "#666", fontSize: "0.7em", marginTop: "6px" }}>
          Showing {recentTranscripts.length} most recent
        </div>
      )}
    </div>
  );
}

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

// SVG Techy Waveform (blue accent)
const TechyWaveform = ({ width = 220, height = 60 }) => (
  <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    <rect x="0" y="0" width={width} height={height} fill="#191919" rx="8" />
    {/* Example waveform bars */}
    {[8, 24, 36, 52, 68, 80, 92, 104, 120, 136, 148, 164, 180, 196, 208].map((x, i) => (
      <rect
        key={i}
        x={x}
        y={height / 2 - (i % 2 === 0 ? 18 : 32)}
        width="8"
        height={i % 2 === 0 ? 36 : 18}
        rx="2"
        fill="#38B6FF"
        opacity={0.7}
      />
    ))}
    {/* "Live" line */}
    <rect
      x={width - 12}
      y={height / 2 - 24}
      width="4"
      height="48"
      rx="2"
      fill="#38B6FF"
      opacity={1}
    />
  </svg>
);

export default function CoolDashboardMockup() {
  const [selectedTrigger, setSelectedTrigger] = useState("");
  const [customPhrase, setCustomPhrase] = useState("");
  const [loading, setLoading] = useState(true);

  // Load saved settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const trigger = await getSetting("selectedTrigger");
        const phrase = await getSetting("customPhrase");
        
        if (trigger) setSelectedTrigger(trigger.value);
        if (phrase) setCustomPhrase(phrase.value);
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // AUTO-SAVE: Save trigger selection immediately when changed
  const handleTriggerChange = async (value: string) => {
    setSelectedTrigger(value);
    try {
      await autoSaveSetting("selectedTrigger", value);
    } catch (error) {
      console.error("Failed to auto-save trigger selection:", error);
    }
  };

  // AUTO-SAVE: Save custom phrase immediately when changed
  const handlePhraseChange = async (value: string) => {
    setCustomPhrase(value);
    try {
      await autoSaveSetting("customPhrase", value);
    } catch (error) {
      console.error("Failed to auto-save custom phrase:", error);
    }
  };

  const handleSetTrigger = async () => {
    if (!customPhrase.trim()) return;
    
    try {
      // AUTO-SAVE: Save the trigger as an active vocal trigger
      await autoSaveSetting("activeTriggerPhrase", customPhrase);
      console.log(`Set vocal trigger: "${customPhrase}"`);
    } catch (error) {
      console.error("Failed to save trigger phrase:", error);
    }
  };

  if (loading) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #232526 0%, #0f2027 100%)",
        minHeight: "100vh",
        color: "#eee",
        fontFamily: "Montserrat, Arial, sans-serif",
        padding: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ textAlign: "center" }}>
          <BatLogo size={128} />
          <p style={{ color: "#38B6FF", marginTop: "20px" }}>Loading saved settings...</p>
        </div>
      </div>
    );
  }

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
            style={{
              background: "#222",
              color: "#38B6FF",
              border: "2px solid #38B6FF",
              borderRadius: "8px",
              padding: "8px 18px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 2px 8px #0007",
              marginBottom: "20px",
            }}
          >
            Start Recording
          </button>
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
              Recorder
            </div>
            <div
              style={{
                background: "#191919",
                border: "1.5px solid #38B6FF",
                borderRadius: "10px",
                width: "130px",
                height: "90px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px #0008",
                overflow: "hidden",
              }}
            >
              <TechyWaveform width={120} height={60} />
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
            style={{
              background: "#38B6FF",
              color: "#222",
              border: "none",
              borderRadius: "10px",
              padding: "10px 24px",
              fontWeight: "bold",
              fontSize: "1.1rem",
              marginBottom: "22px",
              cursor: "pointer",
              boxShadow: "0 2px 8px #0007",
            }}
          >
            Manual Trigger
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
              onChange={(e) => handleTriggerChange(e.target.value)}
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
              onChange={(e) => handlePhraseChange(e.target.value)}
            />
            <button
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
              onClick={handleSetTrigger}
            >
              Set Trigger
            </button>
          </div>
        </div>

        {/* Transcript History */}
        <div style={{ flex: 1 }}>
          <h2 style={{ color: "#38B6FF", marginBottom: "8px" }}>
            Transcript History 
            <small style={{ color: "#666", fontSize: "0.8em", marginLeft: "8px" }}>
              (Auto-saved)
            </small>
          </h2>
          <div
            style={{
              background: "#191919",
              border: "2px solid #38B6FF",
              borderRadius: "12px",
              padding: "18px",
              boxShadow: "0 2px 8px #0008",
              color: "#38B6FF",
              minHeight: "90px",
              maxHeight: "200px",
              overflow: "auto",
            }}
          >
            <TranscriptHistoryMini />
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
          <h3 style={{ color: "#38B6FF" }}>Transcript</h3>
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
              background: "#38B6FF",
              color: "#191919",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              fontWeight: "bold",
              marginLeft: "10px",
              cursor: "pointer",
              boxShadow: "0 2px 8px #0007",
            }}
            disabled
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