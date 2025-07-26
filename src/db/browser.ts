// Browser-compatible storage that falls back to localStorage when SQLite is not available
import type { Transcript, Setting, AudioTrigger } from "./schema";

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Fallback storage using localStorage
class BrowserStorage {
  private getStorageKey(key: string): string {
    return `dwight-tauri-${key}`;
  }

  private getFromStorage<T>(key: string): T[] {
    if (!isBrowser) return [];
    try {
      const stored = localStorage.getItem(this.getStorageKey(key));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage<T>(key: string, data: T[]): void {
    if (!isBrowser) return;
    try {
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to save ${key} to localStorage:`, error);
    }
  }

  // Transcript operations
  async addTranscript(transcript: Omit<Transcript, 'id'>): Promise<Transcript> {
    const transcripts = this.getFromStorage<Transcript>('transcripts');
    const newTranscript: Transcript = {
      ...transcript,
      id: Date.now(), // Simple ID generation
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

export const browserStorage = new BrowserStorage();

// Auto-save functions that work in browser environment
export async function autoSaveTranscript(content: string, filePath?: string, duration?: number): Promise<Transcript> {
  const transcript = {
    content,
    filePath,
    duration,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  
  try {
    const result = await browserStorage.addTranscript(transcript);
    console.log("Auto-saved transcript:", result.id);
    return result;
  } catch (error) {
    console.error("Failed to auto-save transcript:", error);
    throw error;
  }
}

export async function autoSaveSetting(key: string, value: string): Promise<void> {
  try {
    await browserStorage.setSetting(key, value);
    console.log(`Auto-saved setting: ${key} = ${value}`);
  } catch (error) {
    console.error(`Failed to auto-save setting ${key}:`, error);
    throw error;
  }
}

// Export the storage functions
export const getTranscripts = () => browserStorage.getTranscripts();
export const getSetting = (key: string) => browserStorage.getSetting(key);
export const getAllSettings = () => browserStorage.getAllSettings();
export const addTranscript = (transcript: Omit<Transcript, 'id'>) => browserStorage.addTranscript(transcript);
export const setSetting = (key: string, value: string) => browserStorage.setSetting(key, value);