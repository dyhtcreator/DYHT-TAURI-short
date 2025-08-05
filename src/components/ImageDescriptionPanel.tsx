import React, { useState } from "react";
import { describeImage } from "../main";

export default function ImageDescriptionPanel() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setDescription("");
      setError("");
    }
  };

  const handleDescribeImage = async () => {
    if (!selectedFile) {
      setError("Please select an image file first");
      return;
    }

    setIsLoading(true);
    setError("");
    
    try {
      // In a real Tauri app, we would need to copy the file to a temporary location
      // For this demo, we'll use the file name as a mock path
      const mockPath = selectedFile.name;
      const result = await describeImage(mockPath);
      setDescription(result);
    } catch (err) {
      setError(err as string || "Failed to describe image");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "#191919",
        border: "2px solid #38B6FF",
        borderRadius: "12px",
        padding: "18px",
        boxShadow: "0 2px 8px #0008",
        minHeight: "200px",
      }}
    >
      <h3 style={{ color: "#38B6FF", marginBottom: "16px" }}>Image Description</h3>
      
      <div style={{ marginBottom: "16px" }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{
            marginRight: "12px",
            background: "#222",
            color: "#38B6FF",
            border: "1px solid #38B6FF",
            borderRadius: "6px",
            padding: "6px",
            fontSize: "0.9rem",
          }}
        />
        <button
          onClick={handleDescribeImage}
          disabled={!selectedFile || isLoading}
          style={{
            background: selectedFile && !isLoading ? "#38B6FF" : "#555",
            color: selectedFile && !isLoading ? "#191919" : "#999",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontWeight: "bold",
            cursor: selectedFile && !isLoading ? "pointer" : "not-allowed",
            boxShadow: "0 2px 8px #0007",
          }}
        >
          {isLoading ? "Analyzing..." : "Describe Image"}
        </button>
      </div>

      {selectedFile && (
        <div style={{ marginBottom: "16px", color: "#38B6FF", fontSize: "0.9rem" }}>
          Selected: {selectedFile.name}
        </div>
      )}

      {error && (
        <div style={{ 
          color: "#ff6b6b", 
          marginBottom: "16px", 
          fontSize: "0.9rem",
          background: "#2a1a1a",
          padding: "8px",
          borderRadius: "4px",
          border: "1px solid #ff6b6b33"
        }}>
          Error: {error}
        </div>
      )}

      {description && (
        <div style={{
          background: "#0a0a0a",
          border: "1px solid #38B6FF33",
          borderRadius: "8px",
          padding: "12px",
          color: "#eee",
          fontSize: "0.9rem",
          lineHeight: "1.4",
        }}>
          <strong style={{ color: "#38B6FF" }}>Description:</strong>
          <br />
          {description}
        </div>
      )}
    </div>
  );
}