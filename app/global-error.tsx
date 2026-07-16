"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    // Sentry has been removed from global-error to prevent crashing on live servers
    // when bun-setup.sh strips the local configuration files.
    console.error("Critical Global Error Caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ backgroundColor: "#09090b", color: "#f4f4f5", fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: "2rem", border: "1px solid #27272a", borderRadius: "0.5rem", backgroundColor: "#18181b", maxWidth: "500px" }}>
          <h1 style={{ color: "#ef4444", marginBottom: "1rem" }}>Critical System Failure</h1>
          <p style={{ marginBottom: "2rem", color: "#a1a1aa" }}>
            The application encountered an unrecoverable error at the root layout level.
          </p>
          <div style={{ backgroundColor: "#000", padding: "1rem", borderRadius: "0.25rem", border: "1px solid #27272a", textAlign: "left", overflowX: "auto" }}>
            <code style={{ color: "#ef4444", fontSize: "0.875rem" }}>
              {error.message || "Unknown root layout rendering error."}
            </code>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: "2rem", padding: "0.5rem 1.5rem", backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: "0.25rem", cursor: "pointer", fontWeight: "bold" }}
          >
            Force Reload
          </button>
        </div>
      </body>
    </html>
  );
}
