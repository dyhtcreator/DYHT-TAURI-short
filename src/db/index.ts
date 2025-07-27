// Simple browser-based storage for autosave functionality
import type { Transcript, NewTranscript, Setting, NewSetting } from "./schema";

// Browser storage using localStorage
class AutoSaveStorage {
  private getStorageKey(key: string): string {
    return `dwight-tauri-${key}`;
  }

  private getFromStorage<T>(key: string, defaultValue: T[] = []): T[] {
    try {
      const stored = localStorage.getItem(this.getStorageKey(key));
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private saveToStorage<T>(key: string, data: T[]): void {
    try {
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(data));
      console.log(`✓ Auto-saved ${key} to browser storage`);
    } catch (error) {
      console.error(`Failed to save ${key} to localStorage:`, error);
    }
  }

  // Transcript operations
  async addTranscript(transcript: NewTranscript): Promise<Transcript> {
    const transcripts = this.getFromStorage<Transcript>('transcripts');
    const newTranscript: Transcript = {
      ...transcript,
      id: Date.now(), // Simple ID generation
      createdAt: transcript.createdAt || new Date().toISOString(),
      timestamp: transcript.timestamp || new Date().toISOString(),
    };
    transcripts.unshift(newTranscript);
    this.saveToStorage('transcripts', transcripts);
    return newTranscript;
  }

  async getTranscripts(): Promise<Transcript[]> {
    return this.getFromStorage<Transcript>('transcripts');
  }

  // Settings operations  
  async setSetting(key: string, value: string): Promise<Setting> {
    const settings = this.getFromStorage<Setting>('settings');
    const existingIndex = settings.findIndex(s => s.key === key);
    
    const setting: Setting = {
      id: existingIndex >= 0 ? settings[existingIndex].id : Date.now(),
      key,
      value,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      settings[existingIndex] = setting;
    } else {
      settings.push(setting);
    }
    
    this.saveToStorage('settings', settings);
    return setting;
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const settings = this.getFromStorage<Setting>('settings');
    return settings.find(s => s.key === key);
  }

  async getAllSettings(): Promise<Setting[]> {
    return this.getFromStorage<Setting>('settings');
  }
}

const storage = new AutoSaveStorage();

// Auto-save functions
export async function autoSaveTranscript(content: string, filePath?: string, duration?: number): Promise<Transcript> {
  const transcript: NewTranscript = {
    content,
    filePath,
    duration,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  
  try {
    const result = await storage.addTranscript(transcript);
    console.log("Auto-saved transcript:", result.id);
    return result;
  } catch (error) {
    console.error("Failed to auto-save transcript:", error);
    throw error;
  }
}

export async function autoSaveSetting(key: string, value: string): Promise<void> {
  try {
    await storage.setSetting(key, value);
    console.log(`Auto-saved setting: ${key} = ${value}`);
  } catch (error) {
    console.error(`Failed to auto-save setting ${key}:`, error);
    throw error;
  }
}

// Export the main storage functions
export const getTranscripts = () => storage.getTranscripts();
export const getSetting = (key: string) => storage.getSetting(key);
export const getAllSettings = () => storage.getAllSettings();
export const addTranscript = (transcript: NewTranscript) => storage.addTranscript(transcript);
export const setSetting = (key: string, value: string) => storage.setSetting(key, value);

// Legacy compatibility
export function getTranscripts_legacy(): string[] {
  console.warn("getTranscripts_legacy is deprecated, use getTranscripts() instead");
  return [];
}