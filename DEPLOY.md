
# Running & Deploying Clearview

The repo's split into two pieces:

```
clearview/
├─ frontend/   React 19 + Vite + Tailwind — the UI (just a static site once it's built)
└─ backend/    Express + Playwright — the "Scan URL" API (needs an actual Node server running, won't work on serverless)
```

## Running both together locally (do this one)

From the repo root:
```bash
npm install                      # just pulls in concurrently for the dev script
npm run install:all              # installs both frontend + backend deps (backend also grabs Chromium for Playwright, takes a minute)
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env   # fill in GEMINI_API_KEY here — not in the frontend
npm run dev                      # Vite (:5173) and Express (:4000), both up at once
```
You can leave `VITE_API_BASE_URL` commented out here, the frontend falls back to `http://localhost:4000` for the two things that need it (URL scanning and "explain the fix"), everything else just works off whatever origin you're on.

## Running it as one combined service (how I'd deploy it)

The backend can serve the built frontend directly, so instead of standing up two separate services you just need one:

```bash
npm run install:all
npm run build     # builds the frontend into frontend/dist, then the backend into backend/dist
npm start         # Express serves frontend/dist AND handles the /api routes, same process
```

Whatever URL Express prints when it starts up that's it, the whole app lives there. No `VITE_API_BASE_URL`, no `CORS_ORIGIN` to configure, since it's all one origin.

## Running them on two separate hosts

Only bother with this if you actually want the frontend and backend on different domains for some reason.

- **Frontend** goes on any static host like Vercel, Netlify, Cloudflare Pages, GitHub Pages, whatever. Build command is `npm run build` inside `frontend/`, output folder is `dist`.

- **Backend** needs somewhere that gives you a real, persistent container, since Playwright has to launch an actual Chromium process like Render, Railway, Fly.io, a plain VPS. Serverless/edge platforms won't work for this one.

- Point the frontend's `VITE_API_BASE_URL` at wherever the backend ends up, and set the backend's `CORS_ORIGIN` to wherever the frontend ends up.

## Deploying the combined version on Render

1. New Web Service, point it at this repo. Leave the root directory as the repo root, don't set it to `frontend` or `backend`.
2. Build command: `npm run install:all && npm run build`
3. Start command: `npm start`
4. Set `GEMINI_API_KEY` as an environment variable — this powers "explain the fix" for every visitor. It only needs to exist at runtime (not build time), since the backend reads it server-side and never sends it to the browser.

## One security thing worth flagging

The original version of this project had a real Gemini API key sitting in `.env.example` and `.env.local`. I pulled it out before this ever got pushed to git. If that key was actually live, treat it as burned and get a new one at https://aistudio.google.com/app/apikey. 
> **General rule:** never commit a real key anywhere, even into a file that's named "example."
