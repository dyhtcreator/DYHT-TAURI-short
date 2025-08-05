import { invoke } from '@tauri-apps/api/tauri';

export interface AudioRecord {
  id?: number;
  title: string;
  file_path: string;
  transcript?: string;
  duration: number;
  created_at: string;
  triggers?: string;
}

export interface DwightResponse {
  message: string;
  confidence: number;
  context_used: boolean;
  suggestions: string[];
}

export interface SoundTrigger {
  id?: number;
  trigger_type: string;
  trigger_value: string;
  is_active: boolean;
  created_at: string;
}

// Audio transcription
export async function transcribeAudio(filePath: string): Promise<string> {
  try {
    return await invoke('transcribe_audio', { filePath });
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

// Advanced audio analysis
export async function analyzeAudioFeatures(filePath: string): Promise<any> {
  try {
    return await invoke('analyze_audio_features', { filePath });
  } catch (error) {
    console.error('Audio analysis error:', error);
    throw error;
  }
}

// Chat with Dwight AI
export async function chatWithDwight(userInput: string): Promise<DwightResponse> {
  try {
    return await invoke('chat_with_dwight', { userInput });
  } catch (error) {
    console.error('Dwight chat error:', error);
    throw error;
  }
}

// AI-powered audio intelligence
export async function analyzeAudioIntelligence(audioFilePath: string): Promise<string[]> {
  try {
    return await invoke('analyze_audio_intelligence', { audioFilePath });
  } catch (error) {
    console.error('Audio intelligence error:', error);
    throw error;
  }
}

// Database operations
export async function saveAudioRecord(record: Omit<AudioRecord, 'id' | 'created_at'>): Promise<number> {
  try {
    return await invoke('save_audio_record', {
      title: record.title,
      filePath: record.file_path,
      transcript: record.transcript,
      duration: record.duration,
      triggers: record.triggers,
    });
  } catch (error) {
    console.error('Save audio record error:', error);
    throw error;
  }
}

export async function getAudioRecords(): Promise<AudioRecord[]> {
  try {
    return await invoke('get_audio_records');
  } catch (error) {
    console.error('Get audio records error:', error);
    throw error;
  }
}

export async function saveTrigger(triggerType: string, triggerValue: string): Promise<number> {
  try {
    return await invoke('save_trigger', { triggerType, triggerValue });
  } catch (error) {
    console.error('Save trigger error:', error);
    throw error;
  }
}

export async function getTriggers(): Promise<SoundTrigger[]> {
  try {
    return await invoke('get_triggers');
  } catch (error) {
    console.error('Get triggers error:', error);
    throw error;
  }
}