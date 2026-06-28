"use client";

import { useState } from "react";

interface AuthButtonProps {
  connected: boolean;
  email?: string;
  onStatusChange?: () => void;
}

export default function AuthButton({
  connected,
  email,
  onStatusChange,
}: AuthButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    window.location.href = "/api/auth/google";
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/disconnect", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }
      onStatusChange?.();
    } catch {
      // Fallback: still refresh status in case disconnect route is unavailable
      onStatusChange?.();
    } finally {
      setLoading(false);
    }
  };

  if (connected) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {email && (
          <span className="text-sm text-muted">
            Connected as{" "}
            <span className="font-medium text-foreground">{email}</span>
          </span>
        )}
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={loading}
          className="btn btn-danger"
        >
          {loading ? "Disconnecting…" : "Disconnect Gmail"}
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={handleConnect} className="btn btn-primary">
      <GmailIcon />
      Connect Gmail
    </button>
  );
}

function GmailIcon() {
  return (
    <svg
      aria-hidden
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 6.5V17.5C4 18.3284 4.67157 19 5.5 19H18.5C19.3284 19 20 18.3284 20 17.5V6.5C20 5.67157 19.3284 5 18.5 5H5.5C4.67157 5 4 5.67157 4 6.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M4 7L12 12.5L20 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
