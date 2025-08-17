import { useState, useCallback } from "react";
import { transcribeAudio } from "../main";
import { autoSaveTranscript } from "../db";

export function useTranscription() {
  const [transcript, setTranscript] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const transcribe = useCallback(async (filePath: string) => {
    setLoading(true);
    try {
      const result = await transcribeAudio(filePath);
      setTranscript(result);
      
      // AUTO-SAVE: Immediately save the transcript to database
      try {
        await autoSaveTranscript(result, filePath);
        console.log("Transcript auto-saved via useTranscription hook");
      } catch (saveError) {
        console.error("Failed to auto-save transcript:", saveError);
        // Don't throw here - transcription was successful, just save failed
      }
    } catch (err) {
      setTranscript("Transcription failed.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { transcript, loading, transcribe };
}