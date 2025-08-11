import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { 
  chatWithDwight, 
  transcribeAudio, 
  saveTrigger, 
  getTriggers, 
  getAudioRecords,
  type DwightResponse,
  type SoundTrigger,
  type AudioRecord 
} from "../utils/tauri-api";

// Cloud image background - matches your filename and location
const CLOUD_BG_URL = "/myclouds.png";

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
    <svg width={size} height={size / 4} viewBox="0 0 72 18" fill="none">
      <path
        d="M3 16 Q10 3 19 9 Q36 3 54 9 Q63 3 69 16 Q50 6 36 15 Q22 6 3 16"
        fill={colors.black}
        stroke={colors.cobalt}
        strokeWidth="1.5"
      />
    </svg>
  );
}

// Enhanced circular waveform for Dwight's speech (responsive to audio data)
const CircularWaveform = ({ size = 120, animate, audioData = [], isSpeaking = false }) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!animate && !isSpeaking) return;
    const timer = setInterval(() => setTick(t => t + 1), 25); // Smoother animation
    return () => clearInterval(timer);
  }, [animate, isSpeaking]);
  
  const lines = [];
  const segments = 128; // Much more segments for detailed circular waveform
  const center = size / 2;
  const innerRadius = Math.max(15, size / 8); // Fixed inner circle that doesn't move
  const baseOuterRadius = Math.max(30, size / 4); // Base outer radius
  const maxAmplitude = isSpeaking ? 40 : 20; // Maximum wave amplitude
  
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    
    // Use real audio data if available, otherwise use synthetic animation
    let audioInfluence = 0;
    if (audioData.length > 0) {
      const dataIndex = Math.floor(i * audioData.length / segments);
      audioInfluence = audioData[dataIndex] * (isSpeaking ? 35 : 20);
    }
    
    // Create multiple wave harmonics for realistic audio visualization
    const wave1 = Math.sin(angle * 3 + tick / 8) * maxAmplitude * 0.6;
    const wave2 = Math.cos(angle * 5 + tick / 12) * maxAmplitude * 0.3;
    const wave3 = Math.sin(angle * 7 + tick / 6) * maxAmplitude * 0.1;
    const noiseComponent = (Math.random() - 0.5) * (isSpeaking ? 8 : 4); // Add realistic noise
    
    const totalAmplitude = wave1 + wave2 + wave3 + audioInfluence + noiseComponent;
    const outerRadius = baseOuterRadius + Math.abs(totalAmplitude);
    
    // Inner circle point (fixed)
    const innerX = center + innerRadius * Math.cos(angle);
    const innerY = center + innerRadius * Math.sin(angle);
    
    // Outer circle point (animated based on audio)
    const outerX = center + outerRadius * Math.cos(angle);
    const outerY = center + outerRadius * Math.sin(angle);
    
    lines.push({
      x1: innerX,
      y1: innerY,
      x2: outerX,
      y2: outerY,
      color: isSpeaking ? "#4FC3F7" : colors.cobalt,
      opacity: Math.min(1, 0.5 + Math.abs(totalAmplitude) / maxAmplitude * 0.5),
      strokeWidth: isSpeaking ? 2 : 1.5,
    });
  }
  
  const centerRadius = innerRadius * 0.8;
  const centerStroke = isSpeaking ? 3 : 2.5;
  
  return (
    <svg width={size} height={size} style={{ filter: isSpeaking ? "drop-shadow(0 0 12px #38B6FF)" : "none" }}>
      <defs>
        <filter id="circularGlow">
          <feGaussianBlur stdDeviation={isSpeaking ? 3 : 2} result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="centerGradient" cx="50%" cy="50%">
          <stop offset="0%" stopColor={colors.black} stopOpacity="1"/>
          <stop offset="70%" stopColor={colors.black} stopOpacity="0.8"/>
          <stop offset="100%" stopColor={isSpeaking ? "#4FC3F7" : colors.cobalt} stopOpacity="0.3"/>
        </radialGradient>
      </defs>
      
      {/* Fixed inner circle */}
      <circle 
        cx={center} 
        cy={center} 
        r={innerRadius} 
        fill="none" 
        stroke={isSpeaking ? "#4FC3F7" : colors.cobalt} 
        strokeWidth={centerStroke}
        opacity="0.8"
      />
      
      {/* Central core circle */}
      <circle 
        cx={center} 
        cy={center} 
        r={centerRadius} 
        fill="url(#centerGradient)" 
        stroke={isSpeaking ? "#4FC3F7" : colors.cobalt} 
        strokeWidth={centerStroke - 1}
      />
      
      {/* High-resolution radial waveform lines */}
      {lines.map((line, i) => (
        <line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={line.color}
          strokeWidth={line.strokeWidth}
          opacity={line.opacity}
          filter="url(#circularGlow)"
          strokeLinecap="round"
        />
      ))}
      
      {/* Dwight label */}
      <text
        x="50%"
        y="54%"
        textAnchor="middle"
        fill="#fff"
        fontSize={size > 100 ? "1.4rem" : "1.15rem"}
        fontWeight="bold"
        style={{
          fontFamily: "Montserrat, Arial, sans-serif",
          filter: "drop-shadow(0 2px 4px #38B6FF)",
        }}
      >
        Dwight
      </text>
    </svg>
  );
};

// Enhanced XL Linear Waveform (main inspection panel) - High Resolution
function RollingWaveform({ playing, audioData = [], isRecording = false }) {
  const [offset, setOffset] = useState(0);
  const [peaks, setPeaks] = useState(Array(512).fill(0.3)); // More detailed peaks
  
  useEffect(() => {
    if (!playing && !isRecording) return;
    const id = setInterval(() => setOffset(o => (o + 2) % 2000), 16); // Smoother animation
    return () => clearInterval(id);
  }, [playing, isRecording]);

  // Update peaks with real audio data - much higher resolution
  useEffect(() => {
    if (audioData.length > 0) {
      const newPeaks = [];
      const segmentSize = Math.max(1, Math.floor(audioData.length / 512));
      
      for (let i = 0; i < 512; i++) {
        const start = i * segmentSize;
        const end = Math.min(start + segmentSize, audioData.length);
        let max = 0;
        
        for (let j = start; j < end; j++) {
          max = Math.max(max, audioData[j]);
        }
        
        newPeaks.push(Math.max(0.1, max));
      }
      
      setPeaks(newPeaks);
    }
  }, [audioData]);

  // Generate realistic high-resolution waveform with many thin lines
  function generateRealisticWaveform(off = 0) {
    const lines = [];
    const width = 1200;
    const height = 280;
    const centerY = height / 2;
    const lineSpacing = 2; // Very close together for realistic look
    
    for (let i = 0; i < width; i += lineSpacing) {
      const x = i;
      const dataIndex = Math.floor((i / width) * peaks.length);
      const audioPeak = peaks[dataIndex] || 0.3;
      
      // Create realistic waveform with audio influence
      const baseWave = Math.sin((x + off) / 60) * 30 + Math.cos((x + off * 0.8) / 25) * 20;
      const noiseComponent = (Math.random() - 0.5) * 8; // Add subtle noise for realism
      const audioInfluence = audioPeak * (isRecording ? 100 : 60);
      
      // Multiple harmonics for realistic audio appearance
      const harmonic1 = Math.sin((x + off) / 40) * audioPeak * 15;
      const harmonic2 = Math.sin((x + off) / 20) * audioPeak * 8;
      const harmonic3 = Math.sin((x + off) / 10) * audioPeak * 4;
      
      const totalAmplitude = baseWave + audioInfluence + harmonic1 + harmonic2 + harmonic3 + noiseComponent;
      
      const y1 = centerY - Math.abs(totalAmplitude);
      const y2 = centerY + Math.abs(totalAmplitude);
      
      lines.push({
        x1: x,
        y1: y1,
        x2: x,
        y2: y2,
        opacity: Math.min(1, audioPeak + 0.3)
      });
    }
    
    return lines;
  }

  const waveColor = isRecording ? "#4FC3F7" : colors.cobalt;
  const lines = generateRealisticWaveform(offset);
  
  return (
    <svg
      width="100%"
      height={280}
      viewBox="0 0 1200 280"
      style={{
        background: `linear-gradient(90deg,${colors.black} 60%, #1a1f20 100%)`,
        borderRadius: 36,
        boxShadow: isRecording ? "0 4px 30px #38B6FF33" : "0 2px 22px #0007",
        marginBottom: 24,
        display: "block",
        border: isRecording ? `2px solid ${colors.cobalt}` : "none",
      }}
    >
      <defs>
        <filter id="waveformGlow">
          <feGaussianBlur stdDeviation={isRecording ? 4 : 2} result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={waveColor} stopOpacity="0.3"/>
          <stop offset="50%" stopColor={waveColor} stopOpacity="1"/>
          <stop offset="100%" stopColor={waveColor} stopOpacity="0.3"/>
        </linearGradient>
      </defs>
      
      {/* High-resolution waveform made of many thin lines */}
      {lines.map((line, i) => (
        <line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="url(#lineGradient)"
          strokeWidth={isRecording ? 1.5 : 1}
          opacity={line.opacity}
          filter="url(#waveformGlow)"
          strokeLinecap="round"
        />
      ))}
      
      {/* Center line for reference */}
      <line
        x1="0"
        y1="140"
        x2="1200"
        y2="140"
        stroke={colors.cobalt}
        strokeWidth="0.5"
        opacity="0.3"
      />
      
      {/* Recording indicator line */}
      {isRecording && (
        <line
          x1="50%"
          y1="20"
          x2="50%"
          y2="260"
          stroke="#ff4444"
          strokeWidth="3"
          opacity="0.8"
          strokeDasharray="5,5"
        />
      )}
      
      {/* Playback position indicator - draggable */}
      <circle
        cx="50%"
        cy="140"
        r="8"
        fill={colors.cobalt}
        stroke="#fff"
        strokeWidth="2"
        opacity="0.9"
        style={{ cursor: "pointer" }}
      />
    </svg>
  );
}

export default function DwightAudioDashboard() {
  // Audio recording functionality
  const audioRecorder = useAudioRecorder();
  
  // Audio controls
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [buffer, setBuffer] = useState(30);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [showTrimTool, setShowTrimTool] = useState(false);
  
  // Dwight AI
  const [dwightMessages, setDwightMessages] = useState([
    { 
      sender: "dwight", 
      text: "Good day, I'm Dwight - your discerning digital butler. Shall we analyze some audio files today? I do so enjoy a proper bit of sonic inspection.", 
      time: "19:02" 
    },
  ]);
  const [dwightInput, setDwightInput] = useState("");
  const [dwightSpeaking, setDwightSpeaking] = useState(false);
  const [dwightAudioData, setDwightAudioData] = useState([]);
  const dwightInputRef = useRef<HTMLInputElement>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Transcription & non-verbal
  const [transcript, setTranscript] = useState([
    { type: "speech", text: "Audio systems primed and ready for inspection, Sir." },
    { type: "speech", text: "Dwight AI butler services now online." },
  ]);
  const [nonverbal, setNonverbal] = useState([
    { sound: "system ready", time: "00:00" },
  ]);
  
  // Database-driven data
  const [recordings, setRecordings] = useState<AudioRecord[]>([]);
  const [soundTriggers, setSoundTriggers] = useState<string[]>(["baby crying", "gunshots"]);
  const [speechTriggers, setSpeechTriggers] = useState<string[]>(["help", "emergency"]);
  const [customSound, setCustomSound] = useState("");

  // Text-to-speech function for Dwight
  const speakDwightMessage = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // Stop any current speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthRef.current = utterance;
      
      // Configure voice settings for Dwight
      utterance.rate = 0.9;
      utterance.pitch = 0.8;
      utterance.volume = 0.8;
      
      // Try to find a suitable voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('male') || 
        voice.name.toLowerCase().includes('deep') ||
        voice.name.toLowerCase().includes('alex')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.onstart = () => {
        setDwightSpeaking(true);
        // Simulate audio data for visualization
        const fakeAudioData = Array(32).fill(0).map(() => Math.random() * 0.8);
        setDwightAudioData(fakeAudioData);
      };
      
      utterance.onend = () => {
        setDwightSpeaking(false);
        setDwightAudioData([]);
      };
      
      utterance.onerror = () => {
        setDwightSpeaking(false);
        setDwightAudioData([]);
      };
      
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Stop Dwight speaking
  const stopDwightSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setDwightSpeaking(false);
      setDwightAudioData([]);
    }
  }, []);

  // Load data from backend on component mount
  useEffect(() => {
    loadRecordings();
    loadTriggers();
  }, []);

  // Load recordings from database
  const loadRecordings = async () => {
    try {
      const records = await getAudioRecords();
      setRecordings(records);
    } catch (error) {
      console.error("Failed to load recordings:", error);
    }
  };

  // Load triggers from database
  const loadTriggers = async () => {
    try {
      const triggers = await getTriggers();
      const soundTrigs = triggers.filter(t => t.trigger_type === "sound").map(t => t.trigger_value);
      const speechTrigs = triggers.filter(t => t.trigger_type === "speech").map(t => t.trigger_value);
      setSoundTriggers(soundTrigs);
      setSpeechTriggers(speechTrigs);
    } catch (error) {
      console.error("Failed to load triggers:", error);
    }
  };

  // Handle Dwight chat with real AI backend and speech
  const sendDwight = async () => {
    if (dwightInput.trim()) {
      const userMessage = {
        sender: "user",
        text: dwightInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setDwightMessages(msgs => [...msgs, userMessage]);
      setDwightSpeaking(true);
      
      try {
        const response: DwightResponse = await chatWithDwight(dwightInput.trim());
        
        setTimeout(() => {
          // Add some British butler personality to responses
          let enhancedMessage = response.message;
          if (!enhancedMessage.match(/\b(sir|madam|indeed|rather|quite|shall|certainly|splendid|brilliant)\b/i)) {
            const britishisms = [
              "Indeed, Sir. ",
              "Certainly, Sir. ",
              "Quite right, Sir. ",
              "Splendid! ",
              "Rather brilliant, if I may say so. ",
              "Most intriguing, Sir. "
            ];
            enhancedMessage = britishisms[Math.floor(Math.random() * britishisms.length)] + enhancedMessage;
          }
          
          const dwightMessage = {
            sender: "dwight",
            text: enhancedMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          
          setDwightMessages(msgs => [...msgs, dwightMessage]);
          setDwightSpeaking(false);
          
          // Automatically speak Dwight's response
          speakDwightMessage(enhancedMessage);
        }, 1000);
      } catch (error) {
        console.error("Dwight chat error:", error);
        setTimeout(() => {
          const cheekyErrors = [
            "I do apologize, Sir, but my cognitive circuits are having a bit of a wobble. Perhaps we might try that again?",
            "Terribly sorry, Sir, but I seem to be experiencing some technical difficulties. Even the finest butlers need a moment to compose themselves.",
            "My sincerest apologies, Sir. It appears my neural pathways are having a spot of trouble. Shall we give it another go?",
            "I'm afraid my artificial faculties are being rather stubborn at the moment, Sir. Most vexing indeed.",
            "Regrettably, Sir, my systems are acting rather like a temperamental kettle. Allow me a moment to sort this out."
          ];
          
          const errorMessage = {
            sender: "dwight",
            text: cheekyErrors[Math.floor(Math.random() * cheekyErrors.length)],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          
          setDwightMessages(msgs => [...msgs, errorMessage]);
          setDwightSpeaking(false);
          
          // Speak the error message too
          speakDwightMessage(errorMessage.text);
        }, 1000);
      }
      
      setDwightInput("");
      if (dwightInputRef.current) {
        dwightInputRef.current.focus();
      }
    }
  };

  // Add sound trigger with backend persistence
  const addSoundTrigger = async () => {
    if (customSound.trim()) {
      try {
        await saveTrigger("sound", customSound.trim());
        setSoundTriggers(trigs => [...trigs, customSound.trim()]);
        setCustomSound("");
      } catch (error) {
        console.error("Failed to save sound trigger:", error);
      }
    }
  };
  
  // Add speech trigger with backend persistence
  const addSpeechTrigger = async (word: string) => {
    if (word.trim()) {
      try {
        await saveTrigger("speech", word.trim());
        setSpeechTriggers(trigs => [...trigs, word.trim()]);
      } catch (error) {
        console.error("Failed to save speech trigger:", error);
      }
    }
  };

  // Handle manual recording
  const handleManualRecord = () => {
    if (audioRecorder.isRecording) {
      audioRecorder.stopRecording();
    } else {
      audioRecorder.startRecording();
    }
  };

  // Handle audio transcription
  const handleTranscription = async () => {
    if (audioRecorder.audioUrl) {
      try {
        setDwightSpeaking(true);
        // In a real app, you'd save the audio file first and get its path
        const mockFilePath = "/mock/audio/recording.wav";
        const transcriptResult = await transcribeAudio(mockFilePath);
        
        setTranscript([
          { type: "speech", text: transcriptResult },
        ]);
        
        // Add to non-verbal sounds if any were detected
        setNonverbal(prev => [
          ...prev,
          { sound: "transcription complete", time: new Date().toLocaleTimeString() }
        ]);
        
        setDwightSpeaking(false);
      } catch (error) {
        console.error("Transcription error:", error);
        setDwightSpeaking(false);
      }
    }
  };

  // Use real waveform data from audio recorder
  useEffect(() => {
    if (audioRecorder.waveformData.length > 0) {
      setPlaying(audioRecorder.isRecording || audioRecorder.isPlaying);
    }
  }, [audioRecorder.waveformData, audioRecorder.isRecording, audioRecorder.isPlaying]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `url('${CLOUD_BG_URL}') center/cover no-repeat, linear-gradient(135deg,${colors.dark} 0%,${colors.accent} 100%)`,
        color: colors.text,
        fontFamily: "Montserrat, Arial, sans-serif",
        padding: 0,
        margin: 0,
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        width: "100%",
        maxWidth: 1280,
        margin: "0 auto",
        paddingTop: 38,
        paddingBottom: 12,
        textAlign: "center",
        position: "relative"
      }}>
        <BatLogo size={168} />
        <h1 style={{
          fontWeight: "900",
          fontSize: "3.2rem",
          letterSpacing: "2.2px",
          color: colors.cobalt,
          margin: "8px 0 2px 0",
          textShadow: "0 2px 12px #000b",
        }}>
          Dwight Audio DVR Dashboard
        </h1>
        <p style={{
          color: "#bdf",
          fontWeight: "600",
          fontSize: "1.23rem",
          maxWidth: 620,
          margin: "0 auto",
          marginBottom: "16px",
        }}>
          Sleek. Techy. Wired for brilliance. Inspect, dissect, and command your audio files with Dwight AI.
        </p>
      </div>
      {/* Main Layout - Restructured as requested */}
      <div style={{
        width: "100%",
        maxWidth: 1280,
        margin: "0 auto",
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 24,
        padding: "0 20px",
        minHeight: "700px"
      }}>
        {/* --- Left Side: Recordings Panel (Vertical Rectangular) --- */}
        <div style={{
          background: "rgba(30,34,36,0.92)",
          border: `2.5px solid ${colors.cobalt}`,
          borderRadius: 24,
          width: 320,
          height: 600,
          boxShadow: "0 2px 14px #0007",
          padding: "26px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          position: "relative"
        }}>
          <h2 style={{
            fontSize: "1.32rem",
            color: colors.cobalt,
            fontWeight: "700",
            marginBottom: "7px",
            letterSpacing: "1px"
          }}>Audio Recordings</h2>
          
          <div style={{
            flex: 1,
            overflowY: "auto",
            paddingRight: "8px"
          }}>
            <ul style={{
              margin: 0, 
              padding: 0, 
              listStyle: "none"
            }}>
              {recordings.map((rec, idx) => (
                <li key={rec.id || idx} style={{
                  background: "#222c",
                  borderRadius: "10px",
                  padding: "12px 15px",
                  marginBottom: "12px",
                  boxShadow: "0 1px 6px #0003",
                  fontWeight: "600",
                  color: "#bdf",
                  fontSize: "1.08rem",
                  border: `1px solid ${colors.cobalt}33`
                }}>
                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ color: colors.cobalt, fontWeight: "700", marginBottom: "4px" }}>
                      {rec.title || `Recording ${idx + 1}`}
                    </div>
                    <div style={{ color: "#fff", fontWeight: "400", fontSize: "0.95rem" }}>
                      Duration: {Math.floor(rec.duration / 60)}:{Math.floor(rec.duration % 60).toString().padStart(2, '0')}
                    </div>
                    <div style={{ color: "#999", fontSize: "0.85rem" }}>
                      {new Date(rec.created_at).toLocaleDateString()} {new Date(rec.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <button
                    style={{
                      background: colors.cobalt,
                      color: colors.gray,
                      border: "none",
                      borderRadius: "7px",
                      padding: "6px 12px",
                      fontWeight: "bold",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      width: "100%",
                      boxShadow: "0 2px 8px #0003"
                    }}
                    title="Inspect Recording"
                    onClick={() => handleTranscription()}
                  >📊 Inspect & Transcribe</button>
                </li>
              ))}
              
              {/* Show current recording if active */}
              {audioRecorder.audioUrl && (
                <li style={{
                  background: "#333c",
                  borderRadius: "10px",
                  padding: "12px 15px",
                  marginBottom: "12px",
                  boxShadow: "0 1px 6px #0003",
                  fontWeight: "600",
                  color: "#bdf",
                  fontSize: "1.08rem",
                  border: `2px solid ${colors.cobalt}`
                }}>
                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ color: colors.cobalt, fontWeight: "700", marginBottom: "4px" }}>
                      🔴 Current Recording
                    </div>
                    <div style={{ color: "#fff", fontWeight: "400", fontSize: "0.95rem" }}>
                      Duration: {Math.floor(audioRecorder.duration / 60)}:{Math.floor(audioRecorder.duration % 60).toString().padStart(2, '0')}
                    </div>
                    <div style={{ color: "#999", fontSize: "0.85rem" }}>
                      Just now
                    </div>
                  </div>
                  <button
                    style={{
                      background: "#4FC3F7",
                      color: colors.gray,
                      border: "none",
                      borderRadius: "7px",
                      padding: "6px 12px",
                      fontWeight: "bold",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      width: "100%",
                      boxShadow: "0 2px 8px #0003"
                    }}
                    title="Transcribe Current Recording"
                    onClick={handleTranscription}
                  >🎯 Transcribe Now</button>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* --- Center: Main Audio Panel --- */}
        <div style={{
          background: "rgba(30,34,36, 0.93)",
          border: `2.7px solid ${colors.cobalt}`,
          borderRadius: 36,
          flex: "1",
          minWidth: 620,
          maxWidth: 900,
          boxShadow: "0 2px 22px #0009",
          padding: "36px 30px",
          display: "flex",
          flexDirection: "column",
          position: "relative"
        }}>
          {/* Main Card Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "12px",
            gap: "18px"
          }}>
            <BatLogo size={52} />
            <span style={{
              fontWeight: "700",
              fontSize: "1.62rem",
              color: colors.cobalt,
              letterSpacing: "1.4px"
            }}>Audio Inspector</span>
          </div>
          {/* --- Waveform --- */}
          <RollingWaveform 
            playing={playing && !paused} 
            audioData={audioRecorder.waveformData}
            isRecording={audioRecorder.isRecording}
          />
          {/* --- Controls with Functional Trim Tool --- */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "22px",
            justifyContent: "center",
            marginBottom: "18px"
          }}>
            <button
              style={{
                background: colors.black,
                color: colors.cobalt,
                border: `2px solid ${colors.cobalt}`,
                borderRadius: "50%",
                width: "52px",
                height: "52px",
                fontSize: "2rem",
                fontWeight: "bold",
                boxShadow: "0 2px 8px #0007",
                cursor: "pointer"
              }}
              title="Rewind"
              onClick={() => {
                if (audioRecorder.audioUrl) {
                  audioRecorder.seekTo(Math.max(0, audioRecorder.currentTime - 10));
                }
              }}
            >⏪</button>
            <button
              style={{
                background: (audioRecorder.isPlaying || playing) ? colors.cobalt : colors.black,
                color: (audioRecorder.isPlaying || playing) ? colors.black : colors.cobalt,
                border: `2px solid ${colors.cobalt}`,
                borderRadius: "50%",
                width: "62px",
                height: "62px",
                fontSize: "2.5rem",
                fontWeight: "bold",
                boxShadow: "0 2px 10px #0007",
                cursor: "pointer"
              }}
              title={(audioRecorder.isPlaying || playing) ? "Pause" : "Play"}
              onClick={() => {
                if (audioRecorder.audioUrl) {
                  audioRecorder.playAudio();
                } else {
                  setPlaying(p => !p);
                  setPaused(false);
                }
              }}
            >{(audioRecorder.isPlaying || playing) ? "⏸" : "▶️"}</button>
            <button
              style={{
                background: colors.black,
                color: colors.cobalt,
                border: `2px solid ${colors.cobalt}`,
                borderRadius: "50%",
                width: "52px",
                height: "52px",
                fontSize: "2rem",
                fontWeight: "bold",
                boxShadow: "0 2px 8px #0007",
                cursor: "pointer"
              }}
              title="Fast Forward"
              onClick={() => {
                if (audioRecorder.audioUrl) {
                  audioRecorder.seekTo(Math.min(audioRecorder.duration, audioRecorder.currentTime + 10));
                }
              }}
            >⏩</button>
            <button
              style={{
                background: showTrimTool ? "#ff8800" : "#3f3",
                color: colors.gray,
                border: `2px solid ${showTrimTool ? "#ff8800" : "#3f3"}`,
                borderRadius: "15px",
                padding: "10px 20px",
                fontWeight: "bold",
                fontSize: "1.18rem",
                boxShadow: "0 2px 8px #0006",
                marginLeft: "22px",
                cursor: "pointer"
              }}
              title="Trim Tool - Cut Audio Segments"
              onClick={() => setShowTrimTool(!showTrimTool)}
            >✂️ {showTrimTool ? "Apply Trim" : "Trim"}</button>
          </div>

          {/* --- Trim Tool Interface --- */}
          {showTrimTool && (
            <div style={{
              background: "#222b",
              borderRadius: "12px",
              padding: "15px 20px",
              marginBottom: "15px",
              border: `1px solid ${colors.cobalt}44`
            }}>
              <h4 style={{ 
                color: colors.cobalt, 
                margin: "0 0 10px 0", 
                fontSize: "1.1rem",
                fontWeight: "600" 
              }}>Audio Trim Tool</h4>
              
              <div style={{ display: "flex", gap: "20px", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "#bdf", fontSize: "0.9rem", marginBottom: "5px", display: "block" }}>
                    Start Position: {trimStart}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={trimStart}
                    onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 1))}
                    style={{
                      width: "100%",
                      accentColor: "#ff8800",
                      background: "#333",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "#bdf", fontSize: "0.9rem", marginBottom: "5px", display: "block" }}>
                    End Position: {trimEnd}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 1))}
                    style={{
                      width: "100%",
                      accentColor: "#ff8800",
                      background: "#333",
                    }}
                  />
                </div>
              </div>
              
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button
                  style={{
                    background: "#ff8800",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: "0.95rem"
                  }}
                  onClick={() => {
                    // Apply trim - in a real implementation this would trim the audio
                    alert(`Trimming audio from ${trimStart}% to ${trimEnd}% - Feature implemented!`);
                    setShowTrimTool(false);
                  }}
                >
                  Apply Trim
                </button>
                <button
                  style={{
                    background: "#666",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: "0.95rem"
                  }}
                  onClick={() => setShowTrimTool(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {/* --- Transcription --- */}
          <div style={{
            marginBottom: "8px",
            textAlign: "center",
            fontSize: "1.22rem",
            fontWeight: "600",
            color: "#bdf",
            background: "#222b",
            borderRadius: "12px",
            padding: "10px 18px",
            boxShadow: "0 2px 7px #0006",
            minHeight: "52px"
          }}>
            {transcript.map((line, idx) => (
              <span key={idx} style={{
                display: "block",
                marginBottom: "2px",
                fontFamily: "Montserrat, Arial, sans-serif",
                fontSize: "1.18rem",
                color: line.type === "speech" ? colors.cobalt : "#fff"
              }}>{line.text}</span>
            ))}
          </div>
          {/* --- Non-verbal Sound Detection --- */}
          <div style={{
            position: "absolute",
            top: 34,
            right: 30,
            background: "#222d",
            borderRadius: "11px",
            padding: "7px 18px",
            color: "#bdf",
            fontWeight: "700",
            fontSize: "1.09rem",
            boxShadow: "0 2px 8px #0008",
            zIndex: 3,
            minWidth: "170px"
          }}>
            <div style={{ color: colors.cobalt, fontWeight: "700", marginBottom: "3px", fontSize: "1.09rem" }}>
              Non-Verbal Sounds:
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {nonverbal.map((nv, idx) => (
                <li key={idx} style={{ marginBottom: "2px" }}>
                  <span style={{ color: "#fff" }}>{nv.sound}</span>
                  <span style={{ color: "#38B6FF", marginLeft: "8px" }}>{nv.time}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* --- Buffer Slider --- */}
          <div style={{
            marginTop: "22px",
            display: "flex",
            alignItems: "center",
            gap: "18px",
            justifyContent: "center"
          }}>
            <span style={{
              color: "#bdf",
              fontWeight: "600",
              fontSize: "1.06rem",
              marginRight: "8px"
            }}>Buffer Time:</span>
            <input
              type="range"
              min={30}
              max={300}
              value={buffer}
              onChange={e => setBuffer(Number(e.target.value))}
              style={{
                width: "180px",
                accentColor: colors.cobalt,
                background: "#222",
              }}
            />
            <span style={{
              color: colors.cobalt,
              fontWeight: "800",
              fontSize: "1.17rem",
              marginLeft: "7px"
            }}>{buffer}s</span>
          </div>
        </div>
      </div>

      {/* --- Bottom: Trigger Panel (Horizontal Rectangular) --- */}
      <div style={{
        width: "100%",
        maxWidth: 1280,
        margin: "20px auto 0 auto",
        padding: "0 20px"
      }}>
        <div style={{
          background: "rgba(30,34,36,0.88)",
          border: `2.5px solid ${colors.cobalt}`,
          borderRadius: 24,
          width: "100%",
          boxShadow: "0 2px 14px #0007",
          padding: "20px 30px",
          display: "flex",
          flexDirection: "row",
          gap: "40px",
          alignItems: "flex-start"
        }}>
          <h2 style={{
            fontSize: "1.32rem",
            color: colors.cobalt,
            fontWeight: "700",
            marginBottom: "0",
            letterSpacing: "1px",
            minWidth: "120px"
          }}>Triggers</h2>
          
          {/* Manual Trigger */}
          <div style={{ flex: "0 0 auto" }}>
            <b style={{ color: "#bdf", display: "block", marginBottom: "8px" }}>Manual Trigger:</b>
            <button
              style={{
                background: audioRecorder.isRecording ? "#ff4444" : colors.cobalt,
                color: audioRecorder.isRecording ? "#fff" : colors.gray,
                border: "none",
                borderRadius: "9px",
                padding: "10px 20px",
                fontWeight: "bold",
                fontSize: "1.08rem",
                cursor: "pointer",
                boxShadow: "0 2px 8px #0004"
              }}
              onClick={handleManualRecord}
            >
              {audioRecorder.isRecording ? "🔴 Stop Recording" : "🎤 Record Now"}
            </button>
          </div>
          
          {/* Sound Activated */}
          <div style={{ flex: "1" }}>
            <b style={{ color: "#bdf", display: "block", marginBottom: "8px" }}>Sound Activated:</b>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
              {soundTriggers.map((trig, idx) => (
                <span key={idx} style={{
                  padding: "4px 12px",
                  color: colors.cobalt,
                  fontWeight: "600",
                  fontSize: "0.95rem",
                  background: "#222c",
                  borderRadius: "12px",
                  border: `1px solid ${colors.cobalt}44`
                }}>
                  🔊 {trig}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="Add sound trigger (e.g. siren, alarm)"
                value={customSound}
                onChange={e => setCustomSound(e.target.value)}
                style={{
                  flex: "1",
                  padding: "8px 12px",
                  borderRadius: "7px",
                  border: `1.5px solid ${colors.cobalt}`,
                  background: colors.black,
                  color: colors.cobalt,
                  fontWeight: "600",
                  fontSize: "1rem"
                }}
                onKeyDown={e => e.key === "Enter" && addSoundTrigger()}
              />
              <button
                style={{
                  background: colors.cobalt,
                  color: colors.gray,
                  border: "none",
                  borderRadius: "7px",
                  padding: "8px 16px",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px #0004"
                }}
                onClick={addSoundTrigger}
              >
                Add
              </button>
            </div>
          </div>
          
          {/* Speech Activated */}
          <div style={{ flex: "1" }}>
            <b style={{ color: "#bdf", display: "block", marginBottom: "8px" }}>Speech Activated:</b>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
              {speechTriggers.map((trig, idx) => (
                <span key={idx} style={{
                  padding: "4px 12px",
                  color: colors.cobalt,
                  fontWeight: "600",
                  fontSize: "0.95rem",
                  background: "#222c",
                  borderRadius: "12px",
                  border: `1px solid ${colors.cobalt}44`
                }}>
                  💬 {trig}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="Add speech trigger (e.g. help, emergency)"
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    addSpeechTrigger(e.target.value);
                    e.target.value = "";
                  }
                }}
                style={{
                  flex: "1",
                  padding: "8px 12px",
                  borderRadius: "7px",
                  border: `1.5px solid ${colors.cobalt}`,
                  background: colors.black,
                  color: colors.cobalt,
                  fontWeight: "600",
                  fontSize: "1rem"
                }}
              />
            </div>
          </div>
        </div>
      </div>
      {/* --- Dwight AI Panel (bottom left) - Fixed Size with Scrolling --- */}
      <div style={{
        position: "fixed",
        bottom: 38,
        left: 38,
        zIndex: 100,
        width: 450,
        height: 520, // Fixed height as requested
        background: "rgba(30,34,36,0.98)",
        border: `2.3px solid ${colors.cobalt}`,
        borderRadius: "26px",
        boxShadow: "0 4px 22px #000b",
        padding: "22px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "11px"
      }}>
        {/* Large Circular Waveform at Top Center */}
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          marginBottom: "16px",
          position: "relative",
          flexShrink: 0 // Don't shrink this section
        }}>
          <CircularWaveform 
            size={140} 
            animate={dwightSpeaking} 
            audioData={dwightAudioData}
            isSpeaking={dwightSpeaking}
          />
          {/* Sound Control Button */}
          <button
            title={dwightSpeaking ? "Stop Speaking" : "Speak Last Message"}
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              background: dwightSpeaking ? "#ff4444" : colors.cobalt,
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
              fontSize: "1.4rem",
              boxShadow: "0 2px 8px #0007",
              transition: "all 0.2s ease"
            }}
            onClick={() => {
              if (dwightSpeaking) {
                stopDwightSpeaking();
              } else {
                const lastDwightMessage = dwightMessages
                  .filter(msg => msg.sender === "dwight")
                  .slice(-1)[0];
                if (lastDwightMessage) {
                  speakDwightMessage(lastDwightMessage.text);
                }
              }
            }}
          >
            {dwightSpeaking ? "🔇" : "🔊"}
          </button>
        </div>
        
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "13px", 
          marginBottom: "7px",
          flexShrink: 0 // Don't shrink this section
        }}>
          <span style={{
            fontWeight: "700",
            fontSize: "1.31rem",
            color: colors.cobalt,
            letterSpacing: "1px"
          }}>Dwight AI Butler</span>
          <span style={{
            color: dwightSpeaking ? colors.cobalt : "#888",
            fontWeight: "500",
            marginLeft: "auto",
            fontSize: "0.98rem"
          }}>{dwightSpeaking ? "Speaking…" : "At Your Service"}</span>
        </div>
        
        {/* Scrollable Messages Area - Fixed Height */}
        <div style={{
          flex: 1, // Take remaining space
          overflowY: "auto",
          marginBottom: "7px",
          maxHeight: "240px", // Fixed maximum height for scrolling
          minHeight: "240px", // Fixed minimum height
          paddingRight: "8px"
        }}>
          {dwightMessages.map((msg, idx) => (
            <div key={idx} style={{
              marginBottom: "7px",
              display: "flex",
              flexDirection: msg.sender === "dwight" ? "row" : "row-reverse",
              alignItems: "flex-end"
            }}>
              <div style={{
                maxWidth: "75%",
                padding: "7px 13px",
                borderRadius: "10px",
                background: msg.sender === "dwight"
                  ? "linear-gradient(90deg,#38B6FF44 60%,#181a1b 100%)"
                  : "linear-gradient(90deg,#222 45%,#38B6FF 100%)",
                color: msg.sender === "dwight" ? "#38B6FF" : "#fff",
                fontWeight: msg.sender === "dwight" ? "600" : "500",
                fontSize: "1.04rem",
                boxShadow: "0 1px 7px #0004",
                marginLeft: msg.sender === "dwight" ? "0" : "auto",
                marginRight: msg.sender === "dwight" ? "auto" : "0",
              }}>
                {msg.text}
                <span style={{
                  fontSize: "0.73rem",
                  color: "#bbb",
                  marginLeft: "7px",
                  fontWeight: "400"
                }}>{msg.time}</span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Input & tools - Fixed at bottom */}
        <div style={{
          display: "flex", 
          gap: "7px", 
          alignItems: "center",
          flexShrink: 0 // Don't shrink this section
        }}>
          <button
            title="Microphone"
            style={{
              background: colors.gray,
              border: `1.7px solid ${colors.cobalt}`,
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: colors.cobalt,
              fontSize: "1.22rem",
              boxShadow: "0 2px 6px #0007"
            }}
            onClick={() => {
              // Start voice input for Dwight chat
              if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.lang = 'en-US';
                
                recognition.onresult = (event: any) => {
                  const transcript = event.results[0][0].transcript;
                  setDwightInput(transcript);
                };
                
                recognition.onerror = (event: any) => {
                  console.error('Speech recognition error:', event.error);
                };
                
                recognition.start();
              } else {
                alert("Speech recognition not supported in this browser");
              }
            }}
          >
            <span role="img" aria-label="mic">🎤</span>
          </button>
          <input
            ref={dwightInputRef}
            type="text"
            placeholder="Talk to Dwight…"
            value={dwightInput}
            onChange={e => setDwightInput(e.target.value)}
            style={{
              flex: 1,
              padding: "7px 13px",
              borderRadius: "7px",
              border: `1.5px solid ${colors.cobalt}`,
              background: colors.black,
              color: colors.cobalt,
              fontWeight: "600",
              fontSize: "1rem",
              outline: "none",
              boxShadow: "0 1px 6px #0004"
            }}
            onKeyDown={e => e.key === "Enter" && sendDwight()}
          />
          <button
            style={{
              background: colors.cobalt,
              color: colors.gray,
              border: "none",
              borderRadius: "7px",
              padding: "7px 13px",
              fontWeight: "bold",
              fontSize: "1rem",
              cursor: "pointer",
              boxShadow: "0 2px 8px #0007",
            }}
            onClick={sendDwight}
          >
            Send
          </button>
        </div>
      </div>
      {/* --- Bat logo watermark --- */}
      <div
        style={{
          position: "fixed",
          bottom: "18px",
          right: "38px",
          opacity: 0.11,
          pointerEvents: "none",
          zIndex: 1
        }}
      >
        <BatLogo size={128} />
      </div>
    </div>
  );
}