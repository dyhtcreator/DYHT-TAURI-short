import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useAudioBuffer } from "../hooks/useAudioBuffer";
import { 
  chatWithDwight, 
  enhancedDwightChat,
  transcribeAudio, 
  transcribeAudioDetailed,
  getWhisperStatus,
  getAiModels,
  saveTrigger, 
  getTriggers, 
  getAudioRecords,
  type DwightResponse,
  type LlamaResponse,
  type SoundTrigger,
  type AudioRecord 
} from "../utils/tauri-api";
import { 
  colors, 
  createMainBackground, 
  createPanelCloudBackground,
  createCloudFilter 
} from "../utils/cloudBackground";
import DraggableDwightPanel from "./DraggableDwightPanel";

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

// Enhanced XL Linear Waveform (main inspection panel) - High Resolution with Scrubbing
function RollingWaveform({ playing, audioData = [], isRecording = false }) {
  const [offset, setOffset] = useState(0);
  const [peaks, setPeaks] = useState(Array(512).fill(0.3)); // More detailed peaks
  const [playheadPosition, setPlayheadPosition] = useState(50); // Percentage position
  const [isDragging, setIsDragging] = useState(false);
  const waveformRef = useRef<SVGSVGElement>(null);
  
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

  // Handle waveform click and drag for scrubbing
  const handleWaveformInteraction = useCallback((event: React.MouseEvent) => {
    if (!waveformRef.current) return;
    
    const rect = waveformRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    setPlayheadPosition(percentage);
    
    // In a real implementation, this would seek the audio to the new position
    console.log(`Seeking to ${percentage.toFixed(1)}% of audio`);
  }, []);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    setIsDragging(true);
    handleWaveformInteraction(event);
  }, [handleWaveformInteraction]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isDragging) {
      handleWaveformInteraction(event);
    }
  }, [isDragging, handleWaveformInteraction]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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
  const playheadX = (playheadPosition / 100) * 1200;
  
  return (
    <svg
      ref={waveformRef}
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
        cursor: isDragging ? "grabbing" : "pointer"
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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
      
      {/* Draggable Playhead Position Indicator */}
      <g>
        <line
          x1={playheadX}
          y1="20"
          x2={playheadX}
          y2="260"
          stroke="#ffaa00"
          strokeWidth="3"
          opacity="0.9"
        />
        <circle
          cx={playheadX}
          cy="140"
          r="8"
          fill="#ffaa00"
          stroke="#fff"
          strokeWidth="2"
          opacity="0.95"
          style={{ 
            cursor: "grab",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
          }}
        />
        <text
          x={playheadX}
          y="35"
          textAnchor="middle"
          fill="#ffaa00"
          fontSize="12"
          fontWeight="bold"
        >
          {playheadPosition.toFixed(1)}%
        </text>
      </g>
    </svg>
  );
}

export default function DwightAudioDashboard() {
  // Audio recording functionality
  const audioRecorder = useAudioRecorder();
  
  // Audio buffering system (30-300 seconds continuous recording)
  const audioBuffer = useAudioBuffer(30);
  
  // Audio controls and sound trigger detection
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [buffer, setBuffer] = useState(30);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [showTrimTool, setShowTrimTool] = useState(false);
  
  // Sound trigger detection state
  const [soundDetection, setSoundDetection] = useState({
    isActive: false,
    threshold: 50, // Volume threshold for trigger (0-100)
    lastTrigger: 0,
    cooldown: 2000 // 2 second cooldown between triggers
  });
  const soundAnalyserRef = useRef<AnalyserNode | null>(null);
  const soundContextRef = useRef<AudioContext | null>(null);
  const soundDetectionFrameRef = useRef<number>();
  
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
    { type: "speech", text: "Continuous audio buffering system active, Sir." },
    { type: "speech", text: "Dwight AI butler monitoring all frequencies." },
  ]);
  const [nonverbal, setNonverbal] = useState([
    { sound: "buffer system ready", time: "00:00" },
  ]);
  
  // Database-driven data and AI model status
  const [recordings, setRecordings] = useState<AudioRecord[]>([]);
  const [soundTriggers, setSoundTriggers] = useState<string[]>(["baby crying", "gunshots"]);
  const [speechTriggers, setSpeechTriggers] = useState<string[]>(["help", "emergency"]);
  const [customSound, setCustomSound] = useState("");
  const [aiModelsStatus, setAiModelsStatus] = useState({
    whisper: "unknown",
    llama: "unknown", 
    mistral: "unknown",
    gemma: "unknown",
    rag: "unknown"
  });

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

  // Initialize sound detection
  const initializeSoundDetection = useCallback(async () => {
    try {
      if (!soundContextRef.current) {
        soundContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (!soundAnalyserRef.current) {
        soundAnalyserRef.current = soundContextRef.current.createAnalyser();
        soundAnalyserRef.current.fftSize = 256;
        soundAnalyserRef.current.smoothingTimeConstant = 0.8;
      }
      
      // Connect to microphone stream if buffering is active
      if (audioBuffer.isBuffering) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = soundContextRef.current.createMediaStreamSource(stream);
        source.connect(soundAnalyserRef.current);
        
        setSoundDetection(prev => ({ ...prev, isActive: true }));
        startSoundDetectionLoop();
      }
    } catch (error) {
      console.error('Failed to initialize sound detection:', error);
    }
  }, [audioBuffer.isBuffering]);

  // Sound detection loop
  const startSoundDetectionLoop = useCallback(() => {
    if (!soundAnalyserRef.current) return;
    
    const detectSound = () => {
      if (!soundAnalyserRef.current || !soundDetection.isActive) return;
      
      const bufferLength = soundAnalyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      soundAnalyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const volumePercent = (average / 255) * 100;
      
      // Check if volume exceeds threshold and cooldown period has passed
      const now = Date.now();
      if (volumePercent > soundDetection.threshold && 
          now - soundDetection.lastTrigger > soundDetection.cooldown) {
        
        setSoundDetection(prev => ({ ...prev, lastTrigger: now }));
        
        // Check against sound triggers
        const detectedSounds = soundTriggers.filter(trigger => {
          // For now, we'll trigger on any loud sound
          // In a real implementation, you'd use ML to classify sounds
          return volumePercent > soundDetection.threshold;
        });
        
        if (detectedSounds.length > 0) {
          console.log(`Sound trigger detected: ${detectedSounds[0]} (volume: ${volumePercent.toFixed(1)}%)`);
          
          // Add to non-verbal log
          setNonverbal(prev => [
            { sound: `loud sound detected (${volumePercent.toFixed(1)}%)`, time: new Date().toLocaleTimeString() },
            ...prev.slice(0, 9) // Keep only last 10 entries
          ]);
          
          // Trigger recording if buffer is active
          if (audioBuffer.isBuffering) {
            handleManualRecord();
          }
        }
      }
      
      soundDetectionFrameRef.current = requestAnimationFrame(detectSound);
    };
    
    detectSound();
  }, [soundDetection, soundTriggers, audioBuffer.isBuffering]);

  // Stop sound detection
  const stopSoundDetection = useCallback(() => {
    setSoundDetection(prev => ({ ...prev, isActive: false }));
    if (soundDetectionFrameRef.current) {
      cancelAnimationFrame(soundDetectionFrameRef.current);
    }
  }, []);

  // Speech recognition for trigger detection
  const speechRecognitionRef = useRef<any>(null);
  const [speechRecognitionActive, setSpeechRecognitionActive] = useState(false);

  // Initialize continuous speech recognition for triggers
  const initializeSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    speechRecognitionRef.current = new SpeechRecognition();
    
    speechRecognitionRef.current.continuous = true;
    speechRecognitionRef.current.interimResults = true;
    speechRecognitionRef.current.lang = 'en-US';
    speechRecognitionRef.current.maxAlternatives = 1;

    speechRecognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      
      // Check against speech triggers
      const matchedTriggers = speechTriggers.filter(trigger => 
        transcript.includes(trigger.toLowerCase())
      );
      
      if (matchedTriggers.length > 0) {
        console.log(`Speech trigger detected: "${transcript}" matched triggers: ${matchedTriggers.join(', ')}`);
        
        // Add to transcript
        setTranscript(prev => [
          { type: "speech", text: `Trigger detected: "${transcript}"` },
          ...prev.slice(0, 4) // Keep only last 5 entries
        ]);
        
        // Add to non-verbal log
        setNonverbal(prev => [
          { sound: `speech trigger: ${matchedTriggers[0]}`, time: new Date().toLocaleTimeString() },
          ...prev.slice(0, 9) // Keep only last 10 entries
        ]);
        
        // Trigger recording if buffer is active
        if (audioBuffer.isBuffering) {
          handleManualRecord();
        }
      }
    };

    speechRecognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        // Restart recognition after a brief pause
        setTimeout(() => {
          if (speechRecognitionActive) {
            startSpeechRecognition();
          }
        }, 1000);
      }
    };

    speechRecognitionRef.current.onend = () => {
      // Auto-restart if still active
      if (speechRecognitionActive) {
        setTimeout(() => {
          startSpeechRecognition();
        }, 500);
      }
    };
  }, [speechTriggers, speechRecognitionActive, audioBuffer.isBuffering]);

  // Start speech recognition
  const startSpeechRecognition = useCallback(() => {
    if (speechRecognitionRef.current && !speechRecognitionActive) {
      try {
        speechRecognitionRef.current.start();
        setSpeechRecognitionActive(true);
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
      }
    }
  }, [speechRecognitionActive]);

  // Stop speech recognition
  const stopSpeechRecognition = useCallback(() => {
    if (speechRecognitionRef.current && speechRecognitionActive) {
      speechRecognitionRef.current.stop();
      setSpeechRecognitionActive(false);
    }
  }, [speechRecognitionActive]);

  // Load data from backend and start buffering on component mount
  useEffect(() => {
    loadRecordings();
    loadTriggers();
    checkAiModelsStatus();
    
    // Start continuous buffering as requested - always recording, just forgetting old data
    audioBuffer.startBuffering().then(() => {
      // Initialize sound detection after buffering starts
      setTimeout(() => {
        initializeSoundDetection();
        initializeSpeechRecognition();
        startSpeechRecognition();
      }, 1000);
    }).catch(error => {
      console.error("Failed to start audio buffering:", error);
    });
    
    return () => {
      // Cleanup buffering and sound detection on unmount
      audioBuffer.stopBuffering();
      stopSoundDetection();
      stopSpeechRecognition();
      
      if (soundContextRef.current) {
        soundContextRef.current.close();
      }
    };
  }, []);

  // Check AI models status
  const checkAiModelsStatus = async () => {
    try {
      // Check Whisper status
      try {
        await getWhisperStatus();
        setAiModelsStatus(prev => ({ ...prev, whisper: "active" }));
      } catch {
        setAiModelsStatus(prev => ({ ...prev, whisper: "inactive" }));
      }
      
      // Check if other models are available by trying to get model list
      try {
        const models = await getAiModels();
        const modelStatus = {
          llama: models.some(m => m.name.toLowerCase().includes('llama')) ? "active" : "inactive",
          mistral: models.some(m => m.name.toLowerCase().includes('mistral') || m.name.toLowerCase().includes('mixtral')) ? "active" : "inactive", 
          gemma: models.some(m => m.name.toLowerCase().includes('gemma')) ? "active" : "inactive",
          rag: models.some(m => m.model_type === 'rag') ? "active" : "inactive"
        };
        setAiModelsStatus(prev => ({ ...prev, ...modelStatus }));
      } catch {
        // If models endpoint fails, assume basic functionality only
        setAiModelsStatus(prev => ({ 
          ...prev, 
          llama: "inactive", 
          mistral: "inactive", 
          gemma: "inactive", 
          rag: "inactive" 
        }));
      }
    } catch (error) {
      console.error("Failed to check AI models status:", error);
    }
  };

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

  // Handle Dwight chat with enhanced AI backend integration
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
        // Try enhanced AI chat first, fall back to regular chat
        let response: DwightResponse;
        try {
          const enhancedResponse = await enhancedDwightChat(
            dwightInput.trim(), 
            true, // Use advanced model
            [] // No context documents for now - keep it local
          );
          
          response = {
            message: enhancedResponse.text,
            confidence: enhancedResponse.confidence,
            context_used: false,
            suggestions: []
          };
        } catch (enhancedError) {
          console.log("Enhanced AI unavailable, falling back to regular chat:", enhancedError);
          response = await chatWithDwight(dwightInput.trim());
        }
        
        setTimeout(() => {
          // Add some British butler personality to responses if not already present
          let enhancedMessage = response.message;
          if (!enhancedMessage.match(/\b(sir|madam|indeed|rather|quite|shall|certainly|splendid|brilliant)\b/i)) {
            const britishisms = [
              "Indeed, Sir. ",
              "Certainly, Sir. ",
              "Quite right, Sir. ",
              "Splendid! ",
              "Rather brilliant, if I may say so. ",
              "Most intriguing, Sir. ",
              "Absolutely fascinating, Sir. ",
              "How delightfully curious, Sir. ",
              "Precisely what I was thinking, Sir. "
            ];
            enhancedMessage = britishisms[Math.floor(Math.random() * britishisms.length)] + enhancedMessage;
          }
          
          // Add confidence indicator if low confidence
          if (response.confidence < 0.7) {
            enhancedMessage += " (Though I must admit, I'm not entirely certain about this one, Sir.)";
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
            "Regrettably, Sir, my systems are acting rather like a temperamental kettle. Allow me a moment to sort this out.",
            "Good heavens, Sir! My circuits seem to be having a proper tea break. Most unprofessional of them.",
            "I say, Sir, my digital grey matter appears to be on strike. How frightfully embarrassing."
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

  // Handle manual recording - now uses buffering system with improved error handling
  const handleManualRecord = async () => {
    if (audioRecorder.isRecording) {
      audioRecorder.stopRecording();
    } else {
      try {
        // Check if buffering is active, if not start it
        if (!audioBuffer.isBuffering) {
          await audioBuffer.startBuffering();
          // Give buffer time to initialize
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Trigger recording from buffer - saves from buffer start to now
        const audioBlob = await audioBuffer.triggerRecording();
        
        // Create URL for playback
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Save the recording to the database
        const recordTitle = `Recording ${new Date().toISOString()}`;
        const filePath = `/tmp/recordings/${recordTitle.replace(/[^a-zA-Z0-9]/g, '_')}.webm`;
        
        try {
          // In a real implementation, you'd save the blob to the file system
          // For now, we'll simulate this and add to recordings list
          const newRecording: AudioRecord = {
            title: recordTitle,
            file_path: filePath,
            duration: buffer,
            created_at: new Date().toISOString(),
            transcript: ""
          };
          
          setRecordings(prev => [newRecording, ...prev]);
          
          console.log("Triggered recording from buffer:", audioBlob.size, "bytes");
          
          // Add to transcript with success message
          setTranscript([
            { type: "speech", text: `Successfully saved ${buffer}s audio recording from buffer.` },
            ...transcript
          ]);
          
          // Add to non-verbal sounds
          setNonverbal(prev => [
            { sound: "recording saved", time: new Date().toLocaleTimeString() },
            ...prev
          ]);
          
        } catch (dbError) {
          console.error("Failed to save recording to database:", dbError);
          alert(`Recorded ${Math.round(audioBlob.size / 1024)}KB from ${buffer}s buffer! (Note: Database save failed)`);
        }
        
      } catch (error) {
        console.error("Failed to trigger recording:", error);
        alert("Failed to access microphone for buffered recording. Please check microphone permissions.");
      }
    }
  };

  // Handle audio transcription with enhanced AI models
  const handleTranscription = async () => {
    if (audioRecorder.audioUrl) {
      try {
        setDwightSpeaking(true);
        
        // Add visual feedback
        setTranscript([
          { type: "speech", text: "Processing audio with Whisper AI..." },
        ]);
        
        // In a real app, you'd save the audio file first and get its path
        const mockFilePath = "/mock/audio/recording.wav";
        
        try {
          // Try enhanced transcription first (with Whisper)
          const detailedResult = await transcribeAudioDetailed(mockFilePath);
          
          setTranscript([
            { type: "speech", text: detailedResult.text },
          ]);
          
          // Add detailed segment information to non-verbal log
          setNonverbal(prev => [
            { 
              sound: `transcription complete (${detailedResult.language}, ${detailedResult.confidence.toFixed(2)} confidence)`, 
              time: new Date().toLocaleTimeString() 
            },
            ...prev.slice(0, 9)
          ]);
          
          // If we have segments, show timing information
          if (detailedResult.segments.length > 0) {
            const segmentInfo = detailedResult.segments.map(seg => 
              `${seg.start.toFixed(1)}s-${seg.end.toFixed(1)}s: ${seg.text.trim()}`
            ).join('; ');
            
            console.log("Transcription segments:", segmentInfo);
          }
          
        } catch (enhancedError) {
          console.log("Enhanced transcription unavailable, falling back to basic:", enhancedError);
          
          // Fall back to basic transcription
          const transcriptResult = await transcribeAudio(mockFilePath);
          
          setTranscript([
            { type: "speech", text: transcriptResult },
          ]);
          
          setNonverbal(prev => [
            { sound: "basic transcription complete", time: new Date().toLocaleTimeString() },
            ...prev.slice(0, 9)
          ]);
        }
        
        setDwightSpeaking(false);
      } catch (error) {
        console.error("Transcription error:", error);
        setTranscript([
          { type: "speech", text: "Transcription failed. Please check audio quality and try again." },
        ]);
        setDwightSpeaking(false);
      }
    } else {
      alert("No audio recording available for transcription. Please record audio first.");
    }
  };

  // Use real waveform data from audio recorder and buffer
  useEffect(() => {
    if (audioRecorder.waveformData.length > 0) {
      setPlaying(audioRecorder.isRecording || audioRecorder.isPlaying);
    }
    
    // If buffering is active and we have sound analyser, update waveform with real-time data
    if (audioBuffer.isBuffering && soundAnalyserRef.current) {
      const updateWaveform = () => {
        if (!soundAnalyserRef.current) return;
        
        const bufferLength = soundAnalyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        soundAnalyserRef.current.getByteFrequencyData(dataArray);
        
        // Convert to normalized values for waveform display
        const normalizedData = Array.from(dataArray).slice(0, 64).map(value => value / 255);
        
        // Update audio recorder waveform data for display
        if (normalizedData.some(value => value > 0.1)) {
          audioRecorder.waveformData = normalizedData;
        }
      };
      
      const waveformInterval = setInterval(updateWaveform, 50); // Update 20 times per second
      return () => clearInterval(waveformInterval);
    }
  }, [audioRecorder.waveformData, audioRecorder.isRecording, audioRecorder.isPlaying, audioBuffer.isBuffering]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: createMainBackground(),
        color: colors.text,
        fontFamily: "Montserrat, Arial, sans-serif",
        padding: 0,
        margin: 0,
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Add CSS for buffer indicator animation */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
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
          background: createPanelCloudBackground('small', 'top center'),
          border: `2.5px solid ${colors.cobalt}`,
          borderRadius: 24,
          width: 320,
          height: 600,
          boxShadow: "0 2px 14px #0007",
          padding: "26px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          position: "relative",
          backgroundBlendMode: "overlay",
          filter: createCloudFilter(1.0, 1.1)
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
          background: createPanelCloudBackground('large', 'center'),
          border: `2.7px solid ${colors.cobalt}`,
          borderRadius: 36,
          flex: "1",
          minWidth: 620,
          maxWidth: 900,
          boxShadow: "0 2px 22px #0009",
          padding: "36px 30px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          backgroundBlendMode: "overlay",
          filter: createCloudFilter(1.1, 1.2)
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
          
          {/* --- AI Models Status Indicator --- */}
          <div style={{
            position: "absolute",
            top: 34,
            left: 30,
            background: "#222d",
            borderRadius: "11px",
            padding: "7px 14px",
            color: "#bdf",
            fontWeight: "600",
            fontSize: "0.85rem",
            boxShadow: "0 2px 8px #0008",
            zIndex: 3,
            minWidth: "140px"
          }}>
            <div style={{ color: colors.cobalt, fontWeight: "700", marginBottom: "4px", fontSize: "0.9rem" }}>
              AI Models Status:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div>
                <span style={{ color: aiModelsStatus.whisper === "active" ? "#4FC3F7" : "#666" }}>
                  {aiModelsStatus.whisper === "active" ? "🟢" : "🔴"} Whisper
                </span>
              </div>
              <div>
                <span style={{ color: aiModelsStatus.llama === "active" ? "#4FC3F7" : "#666" }}>
                  {aiModelsStatus.llama === "active" ? "🟢" : "🔴"} Llama3
                </span>
              </div>
              <div>
                <span style={{ color: aiModelsStatus.mistral === "active" ? "#4FC3F7" : "#666" }}>
                  {aiModelsStatus.mistral === "active" ? "🟢" : "🔴"} Mistral
                </span>
              </div>
              <div>
                <span style={{ color: aiModelsStatus.gemma === "active" ? "#4FC3F7" : "#666" }}>
                  {aiModelsStatus.gemma === "active" ? "🟢" : "🔴"} Gemma
                </span>
              </div>
              <div>
                <span style={{ color: aiModelsStatus.rag === "active" ? "#4FC3F7" : "#666" }}>
                  {aiModelsStatus.rag === "active" ? "🟢" : "🔴"} RAG
                </span>
              </div>
            </div>
          </div>
          {/* --- Buffer Slider with Enhanced Display --- */}
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
              onChange={e => {
                const newBuffer = Number(e.target.value);
                setBuffer(newBuffer);
                audioBuffer.updateBufferSize(newBuffer);
              }}
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
            
            {/* Buffer Status Indicator */}
            <div style={{
              marginLeft: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <div style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: audioBuffer.isBuffering ? "#4FC3F7" : "#666",
                boxShadow: audioBuffer.isBuffering ? "0 0 8px #4FC3F7" : "none",
                animation: audioBuffer.isBuffering ? "pulse 2s infinite" : "none"
              }}></div>
              <span style={{
                color: audioBuffer.isBuffering ? colors.cobalt : "#666",
                fontWeight: "600",
                fontSize: "0.95rem"
              }}>
                {audioBuffer.isBuffering ? 
                  `Buffering ${Math.round(audioBuffer.getBufferFill())}%` : 
                  "Buffer Offline"
                }
              </span>
            </div>
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
          background: createPanelCloudBackground('medium', 'bottom center'),
          border: `2.5px solid ${colors.cobalt}`,
          borderRadius: 24,
          width: "100%",
          boxShadow: "0 2px 14px #0007",
          padding: "20px 30px",
          display: "flex",
          flexDirection: "row",
          gap: "40px",
          alignItems: "flex-start",
          backgroundBlendMode: "overlay",
          filter: createCloudFilter(1.0, 1.1)
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
                background: audioBuffer.isBuffering ? "#ff4444" : colors.cobalt,
                color: "#fff",
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
              {audioBuffer.isBuffering ? "📡 Trigger Save" : "🎤 Start Buffer"}
            </button>
            <div style={{ 
              marginTop: "8px", 
              fontSize: "0.85rem", 
              color: soundDetection.isActive ? colors.cobalt : "#666" 
            }}>
              Sound Detection: {soundDetection.isActive ? "🟢 Active" : "🔴 Inactive"}
            </div>
            <div style={{ 
              fontSize: "0.85rem", 
              color: speechRecognitionActive ? colors.cobalt : "#666" 
            }}>
              Speech Recognition: {speechRecognitionActive ? "🟢 Active" : "🔴 Inactive"}
            </div>
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
      {/* --- Dwight AI Panel (draggable floating) --- */}
      <DraggableDwightPanel
        initialPosition={{ x: 38, y: window.innerHeight - 500 }}
        backgroundImage="/myclouds.png"
      >
        {/* Large Circular Waveform at Top Center */}
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          marginBottom: "16px",
          position: "relative",
          flexShrink: 0 // Don't shrink this section
        }}>
          <CircularWaveform 
            size={115} // Reduced from 140 to fit smaller panel
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
              width: "36px", // Reduced from 40px
              height: "36px", // Reduced from 40px
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
              fontSize: "1.2rem", // Reduced from 1.4rem
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
            fontSize: "1.2rem", // Reduced from 1.31rem
            color: colors.cobalt,
            letterSpacing: "1px"
          }}>Dwight AI Butler</span>
          <span style={{
            color: dwightSpeaking ? colors.cobalt : "#888",
            fontWeight: "500",
            marginLeft: "auto",
            fontSize: "0.9rem" // Reduced from 0.98rem
          }}>{dwightSpeaking ? "Speaking…" : "At Your Service"}</span>
        </div>
        
        {/* Scrollable Messages Area - Adjusted Height */}
        <div style={{
          flex: 1, // Take remaining space
          overflowY: "auto",
          marginBottom: "7px",
          maxHeight: "190px", // Reduced from 240px
          minHeight: "190px", // Reduced from 240px
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
                padding: "6px 11px", // Reduced padding
                borderRadius: "10px",
                background: msg.sender === "dwight"
                  ? "linear-gradient(90deg,#38B6FF44 60%,#181a1b 100%)"
                  : "linear-gradient(90deg,#222 45%,#38B6FF 100%)",
                color: msg.sender === "dwight" ? "#38B6FF" : "#fff",
                fontWeight: msg.sender === "dwight" ? "600" : "500",
                fontSize: "0.95rem", // Reduced from 1.04rem
                boxShadow: "0 1px 7px #0004",
                marginLeft: msg.sender === "dwight" ? "0" : "auto",
                marginRight: msg.sender === "dwight" ? "auto" : "0",
              }}>
                {msg.text}
                <span style={{
                  fontSize: "0.7rem", // Reduced from 0.73rem
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
              width: "32px", // Reduced from 36px
              height: "32px", // Reduced from 36px
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: colors.cobalt,
              fontSize: "1.1rem", // Reduced from 1.22rem
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
              padding: "6px 11px", // Reduced padding
              borderRadius: "7px",
              border: `1.5px solid ${colors.cobalt}`,
              background: colors.black,
              color: colors.cobalt,
              fontWeight: "600",
              fontSize: "0.95rem", // Reduced from 1rem
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
              padding: "6px 11px", // Reduced padding
              fontWeight: "bold",
              fontSize: "0.95rem", // Reduced from 1rem
              cursor: "pointer",
              boxShadow: "0 2px 8px #0007",
            }}
            onClick={sendDwight}
          >
            Send
          </button>
        </div>
      </DraggableDwightPanel>
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