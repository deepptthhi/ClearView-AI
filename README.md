# Clearview — AI Powered Accessibility Auditor

Paste in some HTML, upload a Word doc / PDF / ODT file, or just give it a live URL. Clearview scans it for real accessibility issues, scores it, and tells you exactly what's wrong and where.

🔗 **Live demo:** [add your deployed URL here after deploying]
📂 **Source:** you're looking at it

> Heads up: the "Scan URL" feature (and "Explain the fix," since that now runs through the backend too) uses a free tier server that falls asleep after 15 minutes of no traffic, so the first request after a while can take ~30 seconds to wake back up. Scanning pasted HTML or an uploaded file is instant either way.


## The problem

Something like 1 in 6 people worldwide has a disability of some kind, and most websites still fail basic accessibility standards, not because anyone's being careless, but because checking for this stuff isn't easy. The tools that exist either only look at live HTML (browser extensions, basically) or are paid audit services that take days to hand back a report. Meanwhile the Word docs and PDFs organizations publish constantly almost never get checked at all.

## What it actually does

- Handles four different input types: pasted HTML, uploaded files (`.html`, `.docx`, `.odt`, `.pdf`), or a live URL.

- Every issue it finds comes from a real, deterministic rule, this isn't an AI vibing about whether something "looks" accessible.

- Rolls everything up into a WCAG A/AA/AAA conformance status, plus a score weighted by how severe each issue is and how many elements it affects.

- Lets you search, filter, and sort the violations it finds.

- Has an "explain the fix" button on each issue that asks AI for a plain English explanation, this is entirely optional, it only fires when you click it.

- Exports the whole report as JSON or a nicely formatted PDF.

## Why I built this

I didn't want another portfolio project that's just "hit an API, show the response." I wanted something that actually required some engineering like parsing four completely different file formats into one shared data model, safely running untrusted HTML/JS without it being able to touch the rest of the page, and being upfront about the stuff automated tools genuinely can't verify instead of pretending they can (more on that below). Accessibility also felt like a problem actually worth solving, this is the kind of thing a team could realistically wire into a CI pipeline before shipping something public.

## How it works

Each file format needs its own reader because they're structurally nothing alike under the hood like a `.docx` is really just a zip file full of XML, a PDF has its own separate tagging spec, and HTML is just a DOM:

| Format | How it's read | What it checks |
|---|---|---|
| `.html` / pasted HTML | Rendered in a **sandboxed iframe** (`allow-scripts` only, no `allow-same-origin`), scanned live by [`axe-core`](https://github.com/dequelabs/axe-core) — the same engine behind Google Lighthouse | Full WCAG rule set: contrast, ARIA, labels, landmarks, etc. |
| `.docx` | Unzipped with JSZip, `word/document.xml` parsed directly | Missing alt text, heading level skips, tables without headers, vague link text, missing document language |
| `.odt` | Unzipped with JSZip, `content.xml` parsed directly | Same categories as `.docx`, using ODF's own tag names |
| `.pdf` | Loaded with `pdf.js`, structure tree walked recursively | Untagged PDFs, missing language, heading skips, tables without header cells, un OCR'd scanned pages |
| Live URL | Headless Chromium (Playwright) on the backend renders the real page, then `axe-core` runs against it | Same as HTML mode, but for pages that need JS to render (a sandboxed iframe alone can't fetch a third party origin) |

Every analyzer spits out the same `Violation` shape at the end, so the UI genuinely doesn't know or care which format it's looking at.

**One limitation I want to be upfront about:** `pdf.js` can tell you a PDF image is *tagged* as a Figure, but its API doesn't let you see whether the alt text on it is actually meaningful. So instead of pretending to check that, the tool just flags it as something a human needs to review. I'd rather a tool tell you honestly what it can't verify than give you false confidence.

## Tech stack

**Frontend:** React 19 · TypeScript · Vite 8 · Tailwind CSS v4 · `axe-core` · `pdf.js` · `JSZip` · `jsPDF`
**Backend:** Express · Playwright (headless Chromium) — powers the live URL scan and proxies the Gemini call
**AI layer:** Gemini API, called only when someone clicks "explain the fix", the key lives in the backend's environment, never in the frontend bundle, so it can't be pulled out of the browser

## Project structure

```
clearview/
├─ frontend/     React app — UI, all four analyzers, PDF/JSON export
└─ backend/      Express + Playwright — renders live URLs for scanning
```

## Running it locally

```bash
npm install
npm run install:all
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env   # add a free Gemini key here from https://aistudio.google.com/app/apikey
npm run dev          # frontend on :5173 + backend on :4000, together
```

It'll run fine without a Gemini key too but the scanning itself is 100% local and deterministic either way, you'd just get an error if you click "explain the fix" without one set. Uploading/pasting HTML, docx, odt, or pdf files all run entirely in the browser regardless; only "Scan URL" and "Explain the fix" go through the backend, since that's where the Playwright browser and the Gemini key both live.

## Deploying it

You can run this as one combined service (the backend serves the built frontend, so it's a single URL with no CORS setup needed) or split it across two hosts. Both are covered in [`DEPLOY.md`](./DEPLOY.md).

## What I'd build next

- The sandboxed HTML scan only works on static markup a React/Vue app's post hydration DOM needs the URL scan path instead, since the sandbox intentionally can't run third party JS against live network resources
- PDF alt text is checked for *presence*, not *quality*, for the reason above
- If I kept going: a scan history view so you can track score over time, batching AI suggestions instead of firing one request per click, and actually parsing raw PDF objects to verify alt text quality instead of relying on `pdf.js`'s higher-level API

## About me

[Deepthi Manjunath] — [deepthimanjunath14@gmail.com] — [https://www.linkedin.com/in/deepthimanjunath14]
