# LLM Exam Evaluator

A PDF-based exam evaluation system that parses student answers and compares them against an answer key using an LLM-augmented grading pipeline. It streams per-question progress via WebSocket and provides a modern analysis UI.


<img width="1916" height="1025" alt="image" src="https://github.com/user-attachments/assets/7a006141-405c-4692-b4a0-acae362f5336" />

## What it does
- Upload two PDFs: one student sheet and one answer key
- Parse both into question-level chunks
- Grade each question (0–10) with reasoning and tips
- Stream live progress to the UI
- Produce a final summary (total/average, strengths/weaknesses, feedback)
- Visualize results; compare students and see per-question breakdowns

## Repository layout
```
backend/
  main.py                 # FastAPI app entry
  config.py               # Pydantic settings
  requirements.txt
  routes/
    assess.py             # POST /api/assess → start grading job
    ws.py                 # WS /ws/assess/{job_id} → stream progress
  modules/
    orchestrator.py       # parse → grade → feedback
    parser_agent.py       # PDF parsing, question mapping
    grader_agent.py       # LLM-based grading
    feedback_agent.py     # aggregated summary and feedback
  helpers/
    pdf_utils.py          # PDF reading/splitting, student/key parsing
    ws_manager.py         # job queues + WS broadcasting
    schemas.py            # Pydantic models

ui/
  Dockerfile              # Next.js static export → Nginx
  next.config.mjs         # output: 'export'
  nginx.conf              # SPA fallback
  src/
    app/
      layout.tsx         # Collapsible sidebar layout
      page.tsx           # Dashboard (upload + live stream + summary)
      insights/page.tsx  # Analysis page (comparisons + detail tables)
    components/          # UploadForm, ProgressItem, SummaryCard, ErrorBanner
    hooks/               # useAssessment (HTTP+WS), useWebSocket
    lib/                 # api (startAssess), config, runs (storage helpers)
    styles/              # globals.css
    types/               # WS message types

docker-compose.yml, .gitignore, README.md
```

## Architecture
- Backend (FastAPI)
  - HTTP: `POST /api/assess` returns `{ job_id }`
  - WS: `ws://<host>/ws/assess/{job_id}` → `progress`, `summary`, `error`, `done`
  - Orchestrated agents: `parser_agent` → `grader_agent` → `feedback_agent`
- Frontend (Next.js, TS)
  - Dashboard to upload files and see live results
  - Analysis page to compare students and inspect per-question results
  - Local storage keeps last runs (`assess_runs`) for reports

## Tech stack
- Backend: FastAPI, Uvicorn, pdfplumber, Pydantic, Python 3.10+
- LLM: OpenAI-compatible client (swappable)
- Frontend: Next.js 14 (App Router), React 18, TypeScript
- Charts: chart.js + react-chartjs-2
- Runtime: Docker, Nginx, Docker Compose

## WebSocket message shapes
`progress` (per question):
```
{
  type: "progress",
  job_id: string,
  payload: {
    question_id: string,
    normalized_score: number,  // scaled into 0–100 across the test
    question_text?: string,
    student_answer: string,
    key_answer: string,
    student_name?: string,
    reasoning_tr?: string,
    tips_tr?: string,
    overall_comment?: string
  }
}
```

`summary`:
```
{
  type: "summary",
  job_id: string,
  payload: {
    total_score: number,
    average_score: number,
    strengths: string[],
    weaknesses: string[],
    overall_feedback: string,
    general_comment: string,
    meta?: { questions?: number, per_question_full?: number }
  }
}
```

## Local development
Backend:
```
cd backend
python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
→ http://127.0.0.1:8000

Frontend:
```
cd ui
npm install
# create .env.local and set:
# NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
npm run dev
```
→ http://localhost:3000

## Docker Compose
```
docker compose up --build -d
```
- Backend: http://localhost:8000
- UI (Nginx): http://localhost:3000
- UI uses `NEXT_PUBLIC_BACKEND_URL=http://backend:8000` (see compose)

## Environment variables
Backend (`backend/.env`):
- `OPENAI_API_KEY` (optional if using OpenAI)
- `CORS_ORIGINS` (e.g. `["http://localhost:3000"]`)
- `APP_NAME`

Frontend (`ui/.env.local`):
- `NEXT_PUBLIC_BACKEND_URL` (local dev), in compose provided as env for the UI service

## Typical flow
1. Upload PDFs (student + answer key) and start the assessment
2. Watch live per-question results arrive over WebSocket
3. Review the final summary and navigate to Analysis for comparisons
4. Optionally reset analysis history from the Analysis page

## Troubleshooting
- WebSocket support: ensure `uvicorn[standard]` or `websockets` is installed in backend
- CORS: update `CORS_ORIGINS` when serving UI from a different origin
- UI 500 with Nginx: ensure `/usr/share/nginx/html` contains the exported `index.html`
- Wrong backend URL: set `NEXT_PUBLIC_BACKEND_URL` properly (compose: `http://backend:8000`)

## Project goals & capabilities
- Reliable, objective scoring assisted by LLM reasoning
- Real-time visibility with per-question breakdown
- Clean, professional UI with actionable analysis
- Containerized deployment with Docker + Nginx


