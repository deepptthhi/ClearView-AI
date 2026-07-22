import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { scanUrlHandler } from "./routes/scanUrl.js";
import { explainHandler } from "./routes/explain.js";

const app = express();

// Default port is 4000, but you can override with an environment variable.
// Example: PORT=4001 npm run dev
const PORT = Number(process.env.PORT ?? 4000);

// Comma-separated list of allowed origins for local/cross-origin dev.
// Not needed when the frontend is served from this same server (see below).
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin requests (no Origin header) are always allowed.
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
  })
);
app.use(express.json({ limit: "1mb" }));

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// URL scan endpoint
app.post("/api/scan/url", scanUrlHandler);

// "Explain the fix" endpoint — proxies Gemini so the API key stays server-side
app.post("/api/explain", explainHandler);

// --- Serve the built frontend (../frontend/dist) so a single deployed
// service can host both the API and the UI together. If that folder
// doesn't exist (e.g. you're only running the backend on its own),
// this is skipped and unmatched routes just 404.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.resolve(__dirname, "../../frontend/dist");

console.log("Current __dirname:", __dirname);
console.log("Resolved frontend:", FRONTEND_DIST);
console.log("Frontend exists:", fs.existsSync(FRONTEND_DIST));

if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));

  // SPA fallback: any non-API, non-health GET request gets index.html
  // so client-side routing keeps working on refresh/deep links.
  app.get(/^\/(?!api\/|health$).*/, (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
}

// Catch-all for unknown routes (API 404s, or no frontend build present)
app.use((_req, res) => {
  res.status(404).json({ error: "Not found." });
});

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`✅ ClearView a11y server listening on http://localhost:${PORT}`);
});

server.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `❌ Port ${PORT} is already in use.\n` +
      `👉 Free it with: taskkill /PID <pid> /F\n` +
      `👉 Or run on another port with:\n` +
      `   set PORT=4001 && npm run dev   (Windows cmd)\n` +
      `   $env:PORT=4001; npm run dev    (PowerShell)\n` +
      `   PORT=4001 npm run dev          (Git Bash/Linux/macOS)`
    );
    process.exit(1);
  } else {
    throw err;
  }
});
