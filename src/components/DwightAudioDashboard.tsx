import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import AudioTrimmer from "./AudioTrimmer";
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
    const timer = setInterval(() => setTick(t => t + 1), 35);
    return () => clearInterval(timer);
  }, [animate, isSpeaking]);
  
  const points = [];
  const segments = 24; // More segments for smoother animation
  const baseRadius = Math.max(20, size / 6);
  const amplitude = isSpeaking ? 25 : 14; // Larger amplitude when speaking
  
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const base = size / 2;
    
    // Use real audio data if available, otherwise use synthetic animation
    let audioInfluence = 0;
    if (audioData.length > 0) {
      const dataIndex = Math.floor(i * audioData.length / segments);
      audioInfluence = audioData[dataIndex] * (isSpeaking ? 30 : 15);
    }
    
    const radius = 
      base - baseRadius +
      amplitude * Math.abs(Math.sin(angle * 3 + tick / 12) * Math.cos(angle + tick / 6)) +
      12 * Math.abs(Math.sin(tick / 4 + angle * 2)) +
      audioInfluence;
    
    const innerRadius = baseRadius * (isSpeaking ? 0.8 : 1);
    
    points.push({
      x1: base + innerRadius * Math.cos(angle),
      y1: base + innerRadius * Math.sin(angle),
      x2: base + radius * Math.cos(angle),
      y2: base + radius * Math.sin(angle),
      color: isSpeaking ? "#4FC3F7" : colors.cobalt,
      opacity: isSpeaking ? 0.9 : 0.7,
      strokeWidth: isSpeaking ? 4 : 3,
    });
  }
  
  const centerRadius = baseRadius * (isSpeaking ? 0.9 : 1);
  const centerStroke = isSpeaking ? 3 : 2.5;
  
  return (
    <svg width={size} height={size} style={{ filter: isSpeaking ? "drop-shadow(0 0 8px #38B6FF)" : "none" }}>
      <circle 
        cx={size / 2} 
        cy={size / 2} 
        r={centerRadius} 
        fill={colors.black} 
        stroke={isSpeaking ? "#4FC3F7" : colors.cobalt} 
        strokeWidth={centerStroke}
      />
      {points.map((p, i) => (
        <line
          key={i}
          x1={p.x1}
          y1={p.y1}
          x2={p.x2}
          y2={p.y2}
          stroke={p.color}
          strokeWidth={p.strokeWidth}
          opacity={p.opacity}
        />
      ))}
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

// Enhanced XL Linear Waveform (main inspection panel)
function RollingWaveform({ playing, audioData = [], isRecording = false }) {
  const [offset, setOffset] = useState(0);
  const [peaks, setPeaks] = useState(Array(64).fill(0.3));
  
  useEffect(() => {
    if (!playing && !isRecording) return;
    const id = setInterval(() => setOffset(o => (o + 6) % 2000), 30);
    return () => clearInterval(id);
  }, [playing, isRecording]);

  // Update peaks with real audio data
  useEffect(() => {
    if (audioData.length > 0) {
      const newPeaks = [];
      const segmentSize = Math.max(1, Math.floor(audioData.length / 64));
      
      for (let i = 0; i < 64; i++) {
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

  // Generate enhanced waveform path with real data influence
  function getPath(off = 0) {
    let p = "";
    const width = 1200;
    const height = 280;
    const centerY = height / 2;
    
    for (let i = 0; i < width; i += 16) {
      const x = i;
      const dataIndex = Math.floor((i / width) * peaks.length);
      const audioPeak = peaks[dataIndex] || 0.3;
      
      // Combine synthetic animation with real audio data
      const synthetic = Math.sin((x + off) / 80) * 45 + Math.cos((x + off * 0.7) / 20) * 25;
      const audioInfluence = audioPeak * 80; // Scale up audio influence
      
      const y = centerY + synthetic + (isRecording ? audioInfluence : audioInfluence * 0.5);
      
      p += `${i === 0 ? "M" : "L"}${x},${y} `;
    }
    return p;
  }

  const waveColor = isRecording ? "#4FC3F7" : colors.cobalt;
  const strokeWidth = isRecording ? 10 : 8;
  
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
        <filter id="glow">
          <feGaussianBlur stdDeviation={isRecording ? 6 : 4} result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={waveColor} stopOpacity="0.8"/>
          <stop offset="50%" stopColor={waveColor} stopOpacity="1"/>
          <stop offset="100%" stopColor={waveColor} stopOpacity="0.8"/>
        </linearGradient>
      </defs>
      
      {/* Main waveform */}
      <path
        d={getPath(offset)}
        stroke="url(#waveGradient)"
        strokeWidth={strokeWidth}
        fill="none"
        opacity="0.95"
        filter="url(#glow)"
        strokeLinecap="round"
      />
      
      {/* Secondary subtle waveform for depth */}
      <path
        d={getPath(offset + 100)}
        stroke={waveColor}
        strokeWidth="4"
        fill="none"
        opacity="0.4"
        strokeLinecap="round"
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
  
  // Trimmer state
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [trimmedAudioUrl, setTrimmedAudioUrl] = useState<string | null>(null);
  
  // Dwight AI
  const [dwightMessages, setDwightMessages] = useState([
    { sender: "dwight", text: "How can I help you with your audio file?", time: "19:02" },
  ]);
  const [dwightInput, setDwightInput] = useState("");
  const [dwightSpeaking, setDwightSpeaking] = useState(false);
  const [dwightAudioData, setDwightAudioData] = useState([]);
  const dwightInputRef = useRef<HTMLInputElement>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Transcription & non-verbal
  const [transcript, setTranscript] = useState([
    { type: "speech", text: "Ready for audio analysis..." },
    { type: "speech", text: "Dwight AI systems online." },
  ]);
  const [nonverbal, setNonverbal] = useState([
    { sound: "system ready", time: "00:00" },
  ]);
  
  // Database-driven data
  const [recordings, setRecordings] = useState<AudioRecord[]>([]);
  const [soundTriggers, setSoundTriggers] = useState<string[]>(["baby crying", "gunshots"]);
  const [speechTriggers, setSpeechTriggers] = useState<string[]>(["help", "emergency"]);
  const [customSound, setCustomSound] = useState("");
  
  // Kill switch state
  const [isKillSwitchActive, setIsKillSwitchActive] = useState(false);

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
    if (isKillSwitchActive) {
      alert("Dwight is disabled while privacy mode is active.");
      return;
    }
    
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
          const dwightMessage = {
            sender: "dwight",
            text: response.message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          
          setDwightMessages(msgs => [...msgs, dwightMessage]);
          setDwightSpeaking(false);
          
          // Automatically speak Dwight's response
          speakDwightMessage(response.message);
        }, 1000);
      } catch (error) {
        console.error("Dwight chat error:", error);
        setTimeout(() => {
          const errorMessage = {
            sender: "dwight",
            text: "I'm experiencing some technical difficulties. Let me recalibrate my systems.",
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
    const currentAudioUrl = getCurrentAudioUrl();
    if (currentAudioUrl) {
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

  // Handle trim button click
  const handleTrimClick = () => {
    if (audioRecorder.audioUrl || trimmedAudioUrl) {
      setShowTrimmer(true);
    } else {
      // For demo purposes, offer to create a mock recording
      if (confirm("No audio recording found. Would you like to create a mock recording for testing the trimmer?")) {
        createMockRecording();
      }
    }
  };

  // Create a mock audio recording for testing
  const createMockRecording = () => {
    // Create a simple audio context and generate a test tone
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioCtx.sampleRate;
    const duration = 10; // 10 seconds
    const numberOfChannels = 1;
    const length = sampleRate * duration;
    
    const buffer = audioCtx.createBuffer(numberOfChannels, length, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Generate a simple test tone (440Hz sine wave)
    for (let i = 0; i < length; i++) {
      channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.3;
    }
    
    // Convert to WAV and create blob URL
    const wavBlob = bufferToWav(buffer);
    const mockAudioUrl = URL.createObjectURL(wavBlob);
    
    // Update state to simulate having a recording
    setTrimmedAudioUrl(mockAudioUrl);
    
    // Update transcript
    setTranscript([
      { type: "speech", text: "Mock audio recording created (10 seconds, 440Hz tone)" },
    ]);
    
    // Add to non-verbal sounds
    setNonverbal(prev => [
      ...prev,
      { sound: "mock recording generated", time: new Date().toLocaleTimeString() }
    ]);
  };

  // Helper function to convert AudioBuffer to WAV
  const bufferToWav = (buffer: AudioBuffer): Blob => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;
    
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Convert audio data to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  // Handle trim completion
  const handleTrimComplete = (newTrimmedUrl: string, startTime: number, endTime: number) => {
    setTrimmedAudioUrl(newTrimmedUrl);
    setShowTrimmer(false);
    
    // Add success message to transcript
    setTranscript([
      { type: "speech", text: `Audio trimmed: ${startTime.toFixed(2)}s to ${endTime.toFixed(2)}s` },
    ]);
    
    // Add to non-verbal sounds
    setNonverbal(prev => [
      ...prev,
      { sound: "audio trimmed", time: new Date().toLocaleTimeString() }
    ]);
  };

  // Get current audio URL (trimmed takes priority)
  const getCurrentAudioUrl = () => {
    return trimmedAudioUrl || audioRecorder.audioUrl;
  };

  // Kill switch handler
  const handleKillSwitch = () => {
    setIsKillSwitchActive(!isKillSwitchActive);
    
    if (!isKillSwitchActive) {
      // Activate kill switch
      audioRecorder.stopRecording();
      audioRecorder.resetRecording();
      stopDwightSpeaking();
      setPlaying(false);
      setPaused(false);
      
      // Add a warning message
      setTranscript([
        { type: "speech", text: "🔴 PRIVACY MODE ACTIVATED - All listening and AI functions disabled" },
      ]);
    } else {
      // Deactivate kill switch
      setTranscript([
        { type: "speech", text: "🟢 System reactivated - Listening and AI functions restored" },
      ]);
    }
  };

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
        {/* Kill Switch - Top Right */}
        <div style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 50
        }}>
          <button
            onClick={handleKillSwitch}
            style={{
              background: isKillSwitchActive ? "#ff4444" : "#333",
              color: isKillSwitchActive ? "#fff" : "#ff4444",
              border: `2px solid #ff4444`,
              borderRadius: "12px",
              padding: "12px 20px",
              fontSize: "1.1rem",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: isKillSwitchActive ? "0 0 15px #ff444488" : "0 2px 8px #00000040",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.3s ease"
            }}
            title={isKillSwitchActive ? "Click to restore system" : "Emergency kill switch - disables all listening and AI"}
          >
            {isKillSwitchActive ? "🔴" : "⭕"} 
            {isKillSwitchActive ? "PRIVACY MODE" : "KILL SWITCH"}
          </button>
        </div>
        
        <BatLogo size={168} />
        <h1 style={{
          fontWeight: "900",
          fontSize: "3.2rem",
          letterSpacing: "2.2px",
          color: isKillSwitchActive ? "#ff4444" : colors.cobalt,
          margin: "8px 0 2px 0",
          textShadow: "0 2px 12px #000b",
          opacity: isKillSwitchActive ? 0.6 : 1,
          transition: "all 0.3s ease"
        }}>
          Dwight Audio DVR Dashboard
        </h1>
        <p style={{
          color: isKillSwitchActive ? "#ff8888" : "#bdf",
          fontWeight: "600",
          fontSize: "1.23rem",
          maxWidth: 620,
          margin: "0 auto",
          marginBottom: "16px",
          opacity: isKillSwitchActive ? 0.7 : 1,
          transition: "all 0.3s ease"
        }}>
          {isKillSwitchActive 
            ? "🔒 Privacy mode active - All systems disabled for your security"
            : "Sleek. Techy. Wired for brilliance. Inspect, dissect, and command your audio files with Dwight AI."
          }
        </p>
      </div>
      {/* Panels Layout */}
      <div style={{
        width: "100%",
        maxWidth: 1280,
        margin: "0 auto",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        gap: 36,
        padding: "0 20px",
        flexWrap: "wrap",
        minHeight: "700px"
      }}>
        {/* --- Left: Trigger Panel --- */}
        <div style={{
          background: "rgba(30,34,36,0.88)",
          border: `2.5px solid ${colors.cobalt}`,
          borderRadius: 24,
          minWidth: 270,
          maxWidth: 340,
          flex: "0 1 320px",
          marginTop: 18,
          boxShadow: "0 2px 14px #0007",
          padding: "26px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}>
          <h2 style={{
            fontSize: "1.32rem",
            color: colors.cobalt,
            fontWeight: "700",
            marginBottom: "7px",
            letterSpacing: "1px"
          }}>Triggers</h2>
          <div>
            <b style={{ color: "#bdf" }}>Manual Trigger:</b>
            <button
              style={{
                background: isKillSwitchActive ? "#666" : (audioRecorder.isRecording ? "#ff4444" : colors.cobalt),
                color: isKillSwitchActive ? "#999" : (audioRecorder.isRecording ? "#fff" : colors.gray),
                border: "none",
                borderRadius: "9px",
                padding: "8px 18px",
                fontWeight: "bold",
                fontSize: "1.08rem",
                cursor: isKillSwitchActive ? "not-allowed" : "pointer",
                marginLeft: "12px",
                marginTop: "2px",
                boxShadow: "0 2px 8px #0004",
                opacity: isKillSwitchActive ? 0.5 : 1
              }}
              onClick={() => !isKillSwitchActive && handleManualRecord()}
              disabled={isKillSwitchActive}
            >
              {isKillSwitchActive ? "Disabled" : (audioRecorder.isRecording ? "Stop Recording" : "Record Now")}
            </button>
          </div>
          <div>
            <b style={{ color: "#bdf" }}>Sound Activated:</b>
            <ul style={{ margin: "7px 0 0 12px", padding: 0, listStyle: "none" }}>
              {soundTriggers.map((trig, idx) => (
                <li key={idx} style={{
                  padding: "4px 0",
                  color: colors.cobalt,
                  fontWeight: "600",
                  fontSize: "1.02rem"
                }}>
                  {trig}
                </li>
              ))}
            </ul>
            <input
              type="text"
              placeholder="Add sound (e.g. siren)"
              value={customSound}
              onChange={e => setCustomSound(e.target.value)}
              style={{
                width: "70%",
                padding: "6px 12px",
                borderRadius: "7px",
                border: `1.5px solid ${colors.cobalt}`,
                background: colors.black,
                color: colors.cobalt,
                marginRight: "8px",
                marginTop: "4px",
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
                padding: "7px 12px",
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
          <div>
            <b style={{ color: "#bdf" }}>Speech Activated:</b>
            <ul style={{ margin: "7px 0 0 12px", padding: 0, listStyle: "none" }}>
              {speechTriggers.map((trig, idx) => (
                <li key={idx} style={{
                  padding: "4px 0",
                  color: colors.cobalt,
                  fontWeight: "600",
                  fontSize: "1.02rem"
                }}>
                  {trig}
                </li>
              ))}
            </ul>
            <input
              type="text"
              placeholder="Add phrase (e.g. danger)"
              onKeyDown={e => e.key === "Enter" && addSpeechTrigger(e.target.value)}
              style={{
                width: "70%",
                padding: "6px 12px",
                borderRadius: "7px",
                border: `1.5px solid ${colors.cobalt}`,
                background: colors.black,
                color: colors.cobalt,
                marginRight: "8px",
                marginTop: "4px",
                fontWeight: "600",
                fontSize: "1rem"
              }}
            />
          </div>
        </div>
        {/* --- Center: Main Audio Panel --- */}
        <div style={{
          background: "rgba(30,34,36, 0.93)",
          border: `2.7px solid ${colors.cobalt}`,
          borderRadius: 36,
          flex: "1 1 700px",
          minWidth: 520,
          maxWidth: 780,
          marginTop: 0,
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
          {/* --- Controls --- */}
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
              onClick={() => alert("Rewind")}
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
                const currentAudioUrl = getCurrentAudioUrl();
                if (currentAudioUrl) {
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
              onClick={() => alert("Fast Forward")}
            >⏩</button>
            <button
              style={{
                background: "#3f3",
                color: colors.gray,
                border: `2px solid #3f3`,
                borderRadius: "15px",
                padding: "10px 20px",
                fontWeight: "bold",
                fontSize: "1.18rem",
                boxShadow: "0 2px 8px #0006",
                marginLeft: "22px",
                cursor: "pointer"
              }}
              title="Trim Tool"
              onClick={handleTrimClick}
            >✂️ Trim</button>
          </div>
          {/* --- Transcription --- */}
          <div style={{
            marginBottom: "8px",
            textAlign: "center",
            fontSize: "1.22rem",
            fontWeight: "600",
            color: isKillSwitchActive ? "#ff8888" : "#bdf",
            background: isKillSwitchActive ? "#44222b" : "#222b",
            borderRadius: "12px",
            padding: "10px 18px",
            boxShadow: "0 2px 7px #0006",
            minHeight: "52px",
            transition: "all 0.3s ease"
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
        {/* --- Right: Recordings Panel --- */}
        <div style={{
          background: "rgba(30,34,36,0.92)",
          border: `2.5px solid ${colors.cobalt}`,
          borderRadius: 24,
          minWidth: 270,
          maxWidth: 340,
          flex: "0 1 320px",
          marginTop: 18,
          boxShadow: "0 2px 14px #0007",
          padding: "26px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}>
          <h2 style={{
            fontSize: "1.32rem",
            color: colors.cobalt,
            fontWeight: "700",
            marginBottom: "7px",
            letterSpacing: "1px"
          }}>Recordings</h2>
          <ul style={{
            margin: 0, padding: 0, listStyle: "none",
            overflowY: "auto", maxHeight: "320px"
          }}>
            {recordings.map((rec, idx) => (
              <li key={rec.id || idx} style={{
                background: "#222c",
                borderRadius: "10px",
                padding: "9px 15px",
                marginBottom: "8px",
                boxShadow: "0 1px 6px #0003",
                fontWeight: "600",
                color: "#bdf",
                fontSize: "1.11rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <span style={{ color: colors.cobalt, fontWeight: "700", marginRight: "8px" }}>{rec.title}</span>
                  <span style={{ color: "#fff", fontWeight: "400", marginRight: "8px" }}>{Math.floor(rec.duration / 60)}:{Math.floor(rec.duration % 60).toString().padStart(2, '0')}</span>
                  <span style={{ color: "#999" }}>{new Date(rec.created_at).toLocaleDateString()}</span>
                </div>
                <button
                  style={{
                    background: colors.cobalt,
                    color: colors.gray,
                    border: "none",
                    borderRadius: "7px",
                    padding: "7px 12px",
                    fontWeight: "bold",
                    fontSize: "1rem",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px #0003"
                  }}
                  title="Inspect"
                  onClick={() => handleTranscription()}
                >Inspect</button>
              </li>
            ))}
            {/* Show current recording if active */}
            {(audioRecorder.audioUrl || trimmedAudioUrl) && (
              <li style={{
                background: "#333c",
                borderRadius: "10px",
                padding: "9px 15px",
                marginBottom: "8px",
                boxShadow: "0 1px 6px #0003",
                fontWeight: "600",
                color: "#bdf",
                fontSize: "1.11rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: `2px solid ${colors.cobalt}`
              }}>
                <div>
                  <span style={{ color: colors.cobalt, fontWeight: "700", marginRight: "8px" }}>
                    {trimmedAudioUrl ? "Trimmed Recording" : "Current Recording"}
                  </span>
                  <span style={{ color: "#fff", fontWeight: "400", marginRight: "8px" }}>{Math.floor(audioRecorder.duration / 60)}:{Math.floor(audioRecorder.duration % 60).toString().padStart(2, '0')}</span>
                  <span style={{ color: "#999" }}>Now</span>
                </div>
                <button
                  style={{
                    background: colors.cobalt,
                    color: colors.gray,
                    border: "none",
                    borderRadius: "7px",
                    padding: "7px 12px",
                    fontWeight: "bold",
                    fontSize: "1rem",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px #0003"
                  }}
                  title="Transcribe"
                  onClick={handleTranscription}
                >Transcribe</button>
              </li>
            )}
          </ul>
        </div>
      </div>
      {/* --- Dwight AI Panel (bottom left) --- */}
      <div style={{
        position: "fixed",
        bottom: 38,
        left: 3,
        zIndex: 100,
        width: 420,
        maxHeight: "500px", // Prevent excessive growth
        background: isKillSwitchActive ? "rgba(60,40,40,0.98)" : "rgba(30,34,36,0.98)",
        border: `2.3px solid ${isKillSwitchActive ? "#ff4444" : colors.cobalt}`,
        borderRadius: "26px",
        boxShadow: isKillSwitchActive ? "0 4px 22px #ff444444" : "0 4px 22px #000b",
        padding: "22px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "11px",
        opacity: isKillSwitchActive ? 0.7 : 1,
        transition: "all 0.3s ease"
      }}>
        {/* Large Circular Waveform at Top Center */}
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          marginBottom: "16px",
          position: "relative"
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
        
        <div style={{ display: "flex", alignItems: "center", gap: "13px", marginBottom: "7px" }}>
          <span style={{
            fontWeight: "700",
            fontSize: "1.31rem",
            color: isKillSwitchActive ? "#ff8888" : colors.cobalt,
            letterSpacing: "1px"
          }}>Dwight AI</span>
          <span style={{
            color: isKillSwitchActive ? "#ff4444" : (dwightSpeaking ? colors.cobalt : "#888"),
            fontWeight: "500",
            marginLeft: "auto",
            fontSize: "0.98rem"
          }}>{isKillSwitchActive ? "Disabled" : (dwightSpeaking ? "Speaking…" : "Idle")}</span>
        </div>
        <div style={{
          flex: 1,
          overflowY: "auto",
          maxHeight: "300px", // Constrain message area height
          marginBottom: "7px"
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
        {/* Input & tools */}
        <div style={{
          display: "flex", gap: "7px", alignItems: "center"
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
            placeholder={isKillSwitchActive ? "Dwight is disabled in privacy mode" : "Talk to Dwight…"}
            value={dwightInput}
            onChange={e => setDwightInput(e.target.value)}
            disabled={isKillSwitchActive}
            style={{
              flex: 1,
              padding: "7px 13px",
              borderRadius: "7px",
              border: `1.5px solid ${isKillSwitchActive ? "#666" : colors.cobalt}`,
              background: isKillSwitchActive ? "#333" : colors.black,
              color: isKillSwitchActive ? "#999" : colors.cobalt,
              fontWeight: "600",
              fontSize: "1rem",
              outline: "none",
              boxShadow: "0 1px 6px #0004",
              opacity: isKillSwitchActive ? 0.5 : 1
            }}
            onKeyDown={e => e.key === "Enter" && !isKillSwitchActive && sendDwight()}
          />
          <button
            style={{
              background: isKillSwitchActive ? "#666" : colors.cobalt,
              color: isKillSwitchActive ? "#999" : colors.gray,
              border: "none",
              borderRadius: "7px",
              padding: "7px 13px",
              fontWeight: "bold",
              fontSize: "1rem",
              cursor: isKillSwitchActive ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px #0007",
              opacity: isKillSwitchActive ? 0.5 : 1
            }}
            onClick={() => !isKillSwitchActive && sendDwight()}
            disabled={isKillSwitchActive}
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
      
      {/* Audio Trimmer Modal */}
      {showTrimmer && (
        <AudioTrimmer
          audioUrl={getCurrentAudioUrl()}
          onTrimComplete={handleTrimComplete}
          onClose={() => setShowTrimmer(false)}
        />
      )}
    </div>
  );
}