import React, { useRef, useEffect } from "react";
import { AudioBufferData } from "../hooks/useAudioBuffer";

interface LinearWaveformProps {
  audioData: AudioBufferData | null;
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
}

export function LinearWaveform({ 
  audioData, 
  width = 220, 
  height = 60, 
  color = "#38B6FF",
  backgroundColor = "#191919"
}: LinearWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (!audioData) {
      // Draw static bars when no audio data
      ctx.fillStyle = color;
      const barCount = 15;
      const barWidth = 8;
      const spacing = (width - barCount * barWidth) / (barCount + 1);
      
      for (let i = 0; i < barCount; i++) {
        const x = spacing + i * (barWidth + spacing);
        const barHeight = Math.random() * 30 + 10;
        const y = (height - barHeight) / 2;
        
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
      ctx.globalAlpha = 1;
      return;
    }

    // Draw live waveform
    const { frequencyData, volume } = audioData;
    const barCount = Math.min(frequencyData.length, 32);
    const barWidth = Math.floor(width / barCount) - 2;
    
    ctx.fillStyle = color;
    
    for (let i = 0; i < barCount; i++) {
      const value = frequencyData[i];
      const barHeight = (value / 255) * height * 0.8;
      const x = i * (barWidth + 2);
      const y = height - barHeight;
      
      // Add volume-based opacity
      ctx.globalAlpha = Math.max(0.3, volume * 3);
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Add glow effect for high volumes
      if (volume > 0.1) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillRect(x, y, barWidth, barHeight);
        ctx.shadowBlur = 0;
      }
    }
    
    ctx.globalAlpha = 1;
    
    // Draw live indicator
    ctx.fillStyle = color;
    ctx.fillRect(width - 4, height / 2 - 20, 2, 40);
    
  }, [audioData, width, height, color, backgroundColor]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        border: `1.5px solid ${color}`,
        borderRadius: "8px",
        backgroundColor: backgroundColor,
        boxShadow: "0 2px 8px rgba(0,0,0,0.5)"
      }}
    />
  );
}

export default LinearWaveform;