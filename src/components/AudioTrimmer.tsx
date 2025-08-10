import React, { useState, useRef, useEffect, useCallback } from 'react';

interface AudioTrimmerProps {
  audioUrl: string | null;
  onTrimComplete: (trimmedAudioUrl: string, startTime: number, endTime: number) => void;
  onClose: () => void;
}

const colors = {
  cobalt: "#38B6FF",
  black: "#181a1b", 
  dark: "#232526",
  accent: "#0f2027",
  gray: "#222",
  text: "#eee",
  border: "#222d",
};

export const AudioTrimmer: React.FC<AudioTrimmerProps> = ({ 
  audioUrl, 
  onTrimComplete, 
  onClose 
}) => {
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceBufferRef = useRef<AudioBuffer | null>(null);

  // Initialize audio when URL changes
  useEffect(() => {
    if (audioUrl) {
      loadAudio();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  // Set end time to duration when duration changes
  useEffect(() => {
    if (duration > 0 && endTime === 0) {
      setEndTime(duration);
    }
  }, [duration, endTime]);

  const loadAudio = async () => {
    if (!audioUrl) return;
    
    try {
      setIsLoading(true);
      
      // Create audio element
      audioRef.current = new Audio(audioUrl);
      
      // Set up event listeners
      audioRef.current.addEventListener('loadedmetadata', () => {
        const audioDuration = audioRef.current?.duration || 0;
        setDuration(audioDuration);
        setEndTime(audioDuration);
        setIsLoading(false);
      });
      
      audioRef.current.addEventListener('timeupdate', () => {
        const currentTime = audioRef.current?.currentTime || 0;
        setCurrentTime(currentTime);
        
        // Stop playback if we've reached the end trim point
        if (currentTime >= endTime) {
          audioRef.current?.pause();
          setIsPlaying(false);
        }
      });
      
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
      });

      // Load audio into AudioContext for trimming
      await loadAudioBuffer();
      
    } catch (error) {
      console.error('Error loading audio:', error);
      setIsLoading(false);
    }
  };

  const loadAudioBuffer = async () => {
    if (!audioUrl) return;
    
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      sourceBufferRef.current = audioBuffer;
    } catch (error) {
      console.error('Error loading audio buffer:', error);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Start from the trim start point
      audioRef.current.currentTime = startTime;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickTime = (clickX / rect.width) * duration;
    
    audioRef.current.currentTime = clickTime;
    setCurrentTime(clickTime);
  };

  const handleStartTimeChange = (value: number) => {
    const newStartTime = Math.max(0, Math.min(value, endTime - 0.1));
    setStartTime(newStartTime);
    
    if (audioRef.current) {
      audioRef.current.currentTime = newStartTime;
    }
  };

  const handleEndTimeChange = (value: number) => {
    const newEndTime = Math.min(duration, Math.max(value, startTime + 0.1));
    setEndTime(newEndTime);
  };

  const trimAudio = async () => {
    if (!sourceBufferRef.current || !audioContextRef.current) {
      alert('Audio not loaded properly. Please try again.');
      return;
    }

    try {
      setIsLoading(true);
      
      const sampleRate = sourceBufferRef.current.sampleRate;
      const numberOfChannels = sourceBufferRef.current.numberOfChannels;
      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.floor(endTime * sampleRate);
      const trimmedLength = endSample - startSample;
      
      // Create new audio buffer for trimmed audio
      const trimmedBuffer = audioContextRef.current.createBuffer(
        numberOfChannels,
        trimmedLength,
        sampleRate
      );
      
      // Copy the trimmed portion to the new buffer
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sourceData = sourceBufferRef.current.getChannelData(channel);
        const trimmedData = trimmedBuffer.getChannelData(channel);
        
        for (let i = 0; i < trimmedLength; i++) {
          trimmedData[i] = sourceData[startSample + i];
        }
      }
      
      // Convert buffer to WAV blob
      const trimmedBlob = await bufferToWav(trimmedBuffer);
      const trimmedUrl = URL.createObjectURL(trimmedBlob);
      
      onTrimComplete(trimmedUrl, startTime, endTime);
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error trimming audio:', error);
      alert('Error trimming audio. Please try again.');
      setIsLoading(false);
    }
  };

  // Convert AudioBuffer to WAV blob
  const bufferToWav = async (buffer: AudioBuffer): Promise<Blob> => {
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

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: colors.dark,
        border: `2px solid ${colors.cobalt}`,
        borderRadius: '20px',
        padding: '30px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '80vh',
        overflowY: 'auto',
        color: colors.text
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            color: colors.cobalt,
            fontSize: '1.5rem',
            fontWeight: 'bold',
            margin: 0
          }}>Audio Trimmer</h2>
          <button
            onClick={onClose}
            style={{
              background: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              fontSize: '1.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {isLoading && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: colors.cobalt
          }}>
            Loading audio...
          </div>
        )}

        {!isLoading && duration > 0 && (
          <>
            {/* Timeline */}
            <div style={{ marginBottom: '20px' }}>
              <div
                onClick={handleTimelineClick}
                style={{
                  height: '60px',
                  background: colors.black,
                  border: `1px solid ${colors.cobalt}`,
                  borderRadius: '8px',
                  position: 'relative',
                  cursor: 'pointer',
                  overflow: 'hidden'
                }}
              >
                {/* Start trim marker */}
                <div style={{
                  position: 'absolute',
                  left: `${(startTime / duration) * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: '3px',
                  background: '#4CAF50',
                  zIndex: 3
                }} />
                
                {/* End trim marker */}
                <div style={{
                  position: 'absolute',
                  left: `${(endTime / duration) * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: '3px',
                  background: '#f44336',
                  zIndex: 3
                }} />
                
                {/* Selected region */}
                <div style={{
                  position: 'absolute',
                  left: `${(startTime / duration) * 100}%`,
                  width: `${((endTime - startTime) / duration) * 100}%`,
                  top: 0,
                  bottom: 0,
                  background: `${colors.cobalt}33`,
                  zIndex: 1
                }} />
                
                {/* Current time marker */}
                <div style={{
                  position: 'absolute',
                  left: `${(currentTime / duration) * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  background: colors.cobalt,
                  zIndex: 4
                }} />
                
                {/* Waveform placeholder */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(90deg, ${colors.cobalt}22 0%, ${colors.cobalt}44 50%, ${colors.cobalt}22 100%)`,
                  zIndex: 0
                }} />
              </div>
            </div>

            {/* Time displays */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '20px',
              fontSize: '0.9rem',
              color: colors.text
            }}>
              <span>Start: {formatTime(startTime)}</span>
              <span>Current: {formatTime(currentTime)}</span>
              <span>End: {formatTime(endTime)}</span>
              <span>Duration: {formatTime(endTime - startTime)}</span>
            </div>

            {/* Time controls */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '20px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  color: colors.cobalt,
                  fontWeight: 'bold'
                }}>
                  Start Time (seconds)
                </label>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.01}
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: colors.cobalt
                  }}
                />
                <input
                  type="number"
                  min={0}
                  max={endTime - 0.1}
                  step={0.01}
                  value={startTime.toFixed(2)}
                  onChange={(e) => handleStartTimeChange(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '5px',
                    borderRadius: '5px',
                    border: `1px solid ${colors.cobalt}`,
                    background: colors.black,
                    color: colors.text,
                    marginTop: '5px'
                  }}
                />
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '5px',
                  color: colors.cobalt,
                  fontWeight: 'bold'
                }}>
                  End Time (seconds)
                </label>
                <input
                  type="range"
                  min={startTime + 0.1}
                  max={duration}
                  step={0.01}
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: colors.cobalt
                  }}
                />
                <input
                  type="number"
                  min={startTime + 0.1}
                  max={duration}
                  step={0.01}
                  value={endTime.toFixed(2)}
                  onChange={(e) => handleEndTimeChange(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '5px',
                    borderRadius: '5px',
                    border: `1px solid ${colors.cobalt}`,
                    background: colors.black,
                    color: colors.text,
                    marginTop: '5px'
                  }}
                />
              </div>
            </div>

            {/* Playback controls */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <button
                onClick={togglePlayback}
                style={{
                  background: colors.cobalt,
                  color: colors.dark,
                  border: 'none',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isPlaying ? '⏸' : '▶️'}
              </button>
              
              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = startTime;
                    setCurrentTime(startTime);
                  }
                }}
                style={{
                  background: colors.gray,
                  color: colors.cobalt,
                  border: `1px solid ${colors.cobalt}`,
                  borderRadius: '8px',
                  padding: '10px 15px',
                  cursor: 'pointer'
                }}
              >
                Go to Start
              </button>
              
              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = endTime;
                    setCurrentTime(endTime);
                  }
                }}
                style={{
                  background: colors.gray,
                  color: colors.cobalt,
                  border: `1px solid ${colors.cobalt}`,
                  borderRadius: '8px',
                  padding: '10px 15px',
                  cursor: 'pointer'
                }}
              >
                Go to End
              </button>
            </div>

            {/* Action buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '15px'
            }}>
              <button
                onClick={trimAudio}
                disabled={isLoading}
                style={{
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? 'Processing...' : 'Trim Audio'}
              </button>
              
              <button
                onClick={onClose}
                style={{
                  background: colors.gray,
                  color: colors.text,
                  border: `1px solid ${colors.cobalt}`,
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '1.1rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AudioTrimmer;