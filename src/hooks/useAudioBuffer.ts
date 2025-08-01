import { useState, useEffect, useRef, useCallback } from "react";

export interface AudioBufferData {
  timeData: Uint8Array;
  frequencyData: Uint8Array;
  volume: number;
}

export function useAudioBuffer() {
  const [audioData, setAudioData] = useState<AudioBufferData | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number>();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      setIsRecording(true);
      
      const updateAudioData = () => {
        if (!analyser || !mediaStreamRef.current) return;
        
        const timeData = new Uint8Array(analyser.frequencyBinCount);
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        
        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(frequencyData);
        
        // Calculate volume (RMS)
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
          const sample = (timeData[i] - 128) / 128;
          sum += sample * sample;
        }
        const volume = Math.sqrt(sum / timeData.length);
        
        setAudioData({ timeData, frequencyData, volume });
        
        if (mediaStreamRef.current) {
          animationFrameRef.current = requestAnimationFrame(updateAudioData);
        }
      };
      
      updateAudioData();
    } catch (error) {
      console.error("Failed to start recording:", error);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setAudioData(null);
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      stopRecording();
    };
  }, [stopRecording]);

  return {
    audioData,
    isRecording,
    startRecording,
    stopRecording
  };
}
