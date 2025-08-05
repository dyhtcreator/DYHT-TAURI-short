import React, { useRef, useEffect } from "react";
import { AudioBufferData } from "../hooks/useAudioBuffer";

interface CircularWaveformProps {
  audioData: AudioBufferData | null;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

export function CircularWaveform({ 
  audioData, 
  size = 120, 
  color = "#38B6FF",
  backgroundColor = "#191919"
}: CircularWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 3;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, size, size);

    // Draw outer circle
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (!audioData) {
      // Draw static pattern when no audio data
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4;
      
      for (let i = 0; i < 32; i++) {
        const angle = (i / 32) * 2 * Math.PI;
        const variation = Math.sin(i * 0.5) * 10 + Math.random() * 5;
        const startRadius = radius - 5;
        const endRadius = startRadius + variation;
        
        const startX = centerX + Math.cos(angle) * startRadius;
        const startY = centerY + Math.sin(angle) * startRadius;
        const endX = centerX + Math.cos(angle) * endRadius;
        const endY = centerY + Math.sin(angle) * endRadius;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return;
    }

    // Draw live circular waveform
    const { frequencyData, volume } = audioData;
    const barCount = Math.min(frequencyData.length, 64);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * 2 * Math.PI - Math.PI / 2; // Start from top
      const value = frequencyData[i];
      const barLength = (value / 255) * (radius * 0.4);
      
      const startRadius = radius - 10;
      const endRadius = startRadius + barLength;
      
      const startX = centerX + Math.cos(angle) * startRadius;
      const startY = centerY + Math.sin(angle) * startRadius;
      const endX = centerX + Math.cos(angle) * endRadius;
      const endY = centerY + Math.sin(angle) * endRadius;
      
      // Add volume-based opacity and glow
      ctx.globalAlpha = Math.max(0.4, volume * 4);
      
      if (volume > 0.1 && value > 100) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;
        ctx.lineWidth = 3;
      } else {
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
      }
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    
    // Draw center pulse based on volume
    if (volume > 0.05) {
      const pulseRadius = volume * 20;
      ctx.fillStyle = color;
      ctx.globalAlpha = volume * 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    
  }, [audioData, size, color, backgroundColor]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        border: `1.5px solid ${color}`,
        borderRadius: "50%",
        backgroundColor: backgroundColor,
        boxShadow: "0 2px 8px rgba(0,0,0,0.5)"
      }}
    />
  );
}

export default CircularWaveform;