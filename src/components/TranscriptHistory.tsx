import React, { useEffect, useState } from "react";
import { getTranscripts } from "../db";
import type { Transcript } from "../db/schema";

export default function TranscriptHistory() {
  const [history, setHistory] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTranscripts = async () => {
    try {
      const transcripts = await getTranscripts();
      setHistory(transcripts);
    } catch (error) {
      console.error("Failed to load transcripts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTranscripts();
  }, []);

  // Auto-refresh every 5 seconds to show new transcripts
  useEffect(() => {
    const interval = setInterval(loadTranscripts, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div>
        <h2>Transcript History</h2>
        <p>Loading transcripts...</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Transcript History</h2>
      {history.length === 0 ? (
        <p>No transcripts yet.</p>
      ) : (
        <ul>
          {history.map((transcript) => (
            <li key={transcript.id}>
              <div style={{ marginBottom: "0.5em" }}>
                <small style={{ color: "#666" }}>
                  {new Date(transcript.timestamp).toLocaleString()}
                  {transcript.filePath && ` • ${transcript.filePath}`}
                </small>
              </div>
              <pre style={{ background: "#f5f5f5", padding: "0.5em" }}>
                {transcript.content}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}