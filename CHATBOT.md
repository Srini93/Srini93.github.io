# Srini AI — Portfolio Chatbot

An AI-powered chatbot embedded into [srinivasan.design](https://srinivasan.design) that answers visitor questions about Srini's work, experience, and skills. It uses Retrieval-Augmented Generation (RAG) to ground every response in verified portfolio content — the LLM never fabricates experience, companies, or dates.

---

## Architecture Overview

The system has three layers:

```
┌─────────────────────────────────────────────────────────┐
│  Portfolio Site (index.html)                            │
│  ┌───────────────┐   ┌────────────────────────────────┐ │
│  │ Trigger Button │──▶│ Sidebar (iframe)               │ │
│  │ (sparkle icon) │   │ chatbot/index.html             │ │
│  └───────────────┘   │ React app (Vite build)         │ │
│                       │ Sends POST /chat               │ │
│                       └──────────┬─────────────────────┘ │
└──────────────────────────────────┼───────────────────────┘
                                   │ HTTPS
                                   ▼
┌──────────────────────────────────────────────────────────┐
│  Backend API (FastAPI + Uvicorn)                         │
│                                                          │
│  1. Encode visitor question → embedding vector           │
│     (sentence-transformers / all-MiniLM-L6-v2)           │
│                                                          │
│  2. Semantic search against ChromaDB                     │
│     → retrieve top 4 relevant knowledge chunks           │
│                                                          │
│  3. Send context + question to Groq API                  │
│     (Llama 3.1 8B Instant)                               │
│                                                          │
│  4. Parse structured JSON response                       │
│     → { answer, suggestions[] }                          │
│                                                          │
│  5. Return to frontend                                   │
└──────────────────────────────────────────────────────────┘
```

---

## How the RAG Pipeline Works

### Step 1: Knowledge Ingestion (`ingest.py`)

Before the server starts, `ingest.py` builds a vector knowledge base from curated portfolio content. The knowledge base is a hand-written collection of 20 entries sourced from:

- Portfolio website (srinivasan.design)
- LinkedIn profile
- Resume PDF

Each entry covers a specific topic — bio, philosophy, skills, tools, education, and detailed descriptions of each role (Intuit, Norton, Google, Zoho, Holachef, Zeta, Tegus). There are also entries for certifications, mentorship, and personal interests.

The ingestion process:

1. Loads the `all-MiniLM-L6-v2` sentence transformer model (384-dimensional embeddings)
2. Encodes all 20 text entries into embedding vectors
3. Stores them in a ChromaDB persistent collection named `"portfolio"`

This runs once during build (`python ingest.py`) and the resulting `chroma_db/` directory is reused by the server at runtime.

### Full-site portfolio text (this repository)

The hand-written `KNOWLEDGE_BASE` in SriniLM can be **supplemented or replaced** with text extracted from every public HTML page in this portfolio repo. That keeps the vector store aligned with case studies, about, and index copy without manually duplicating paragraphs.

1. From the **portfolio site repo** root, run:

   ```bash
   python3 scripts/extract_portfolio_knowledge.py
   ```

2. This writes **`portfolio_knowledge.json`**: a list of objects `{ "id", "source_file", "title", "text" }`. Long pages are split into overlapping chunks (~2200 characters) for embedding.

3. **Excluded paths** (by design): `chatbot/`, `srini-chatbot/`, and `images/` (duplicate of root pages). **Excluded files**: `Norton.html`, `Nortonp.html` (password shells; case study body is not in public HTML).

4. In the **SriniLM** repo, copy `portfolio_knowledge.json` into that project (or submodule path), then extend the ingest list. Example pattern:

   ```python
   import json
   from pathlib import Path

   with Path("portfolio_knowledge.json").open(encoding="utf-8") as f:
       exported = json.load(f)
   auto_chunks = [{"id": e["id"], "text": e["text"]} for e in exported]
   KNOWLEDGE_BASE = [*HAND_WRITTEN_ENTRIES, *auto_chunks]  # or replace as needed
   ```

5. Run `python ingest.py` and redeploy the backend so ChromaDB is rebuilt.

Until the backend ingest is updated on Render, the chatbot continues to use whatever knowledge was last embedded in SriniLM; the script here only produces the **source material** for that step.

### Step 2: Query Processing (`app.py`, `/chat` endpoint)

When a visitor sends a message:

1. **Embedding**: The question is encoded into a 384-dim vector using the same `all-MiniLM-L6-v2` model
2. **Retrieval**: ChromaDB performs a cosine similarity search and returns the top 4 most relevant knowledge chunks
3. **Prompt Construction**: The retrieved chunks are assembled into a context block and sent to the LLM alongside the visitor's question
4. **Generation**: Groq's API runs Llama 3.1 8B Instant with:
   - `temperature=0.6` (slightly creative but grounded)
   - `max_tokens=600`
   - A system prompt enforcing structured JSON output with answer + 3 follow-up suggestions
5. **Response Parsing**: The LLM output is parsed as JSON. If the model wraps it in markdown code fences, those are stripped. If parsing fails, the raw text is returned with default suggestions as a fallback.

### System Prompt

The system prompt enforces strict behavior:

- Only use facts from the provided context
- Never fabricate experience, companies, or dates
- Keep answers to 2-4 sentences in a conversational tone
- Always include 3 natural follow-up suggestions
- Respond in structured JSON format

---

## Frontend Integration

### Trigger Points

The chatbot can be opened from two places:

| Viewport | Trigger | Location |
|----------|---------|----------|
| Desktop (769px+) | Sparkle icon button in the nav bar | `li.srini-chat-nav-li > button.srini-chat-nav-btn` |
| Mobile (768px-) | Floating action button (bottom-right) | `button.srini-chat-fab` |

### Sidebar Behavior

- Clicking the trigger toggles the `chat-open` class on `<body>`
- On desktop, the sidebar slides in from the right (420px wide, 16px border-radius) and the main content shifts left
- On mobile, the sidebar takes over the full screen with a slide-up animation
- The iframe is **lazy-loaded** — it only creates the `<iframe>` element on first open, not on page load

### iframe Communication

The sidebar element at `#chatbot-sidebar` has two data attributes:

| Attribute | Purpose |
|-----------|---------|
| `data-chatbot-src` | Path to the chatbot frontend (default: `./chatbot/`) |
| `data-chat-api` | Backend API URL passed to the iframe as `?api=` query param |

The iframe URL is constructed as: `{chatbot-src}?api={encoded-api-url}`

The chatbot React app reads the `?api=` parameter from `window.location.search` and uses it as the base URL for API calls. If no `?api=` parameter is present, it falls back to `https://srinilm.onrender.com` (the deployed backend).

The parent page listens for `postMessage` events — if the iframe sends `'srini-chat-close'`, the sidebar closes.

### Chatbot React App (`chatbot/`)

A Vite-built React application served as static files:

- `chatbot/index.html` — entry point
- `chatbot/assets/index-Dbje-piD.js` — bundled React app (minified)
- `chatbot/assets/index-Dt8MG8cL2.css` — styles

The UI includes:
- Welcome screen with heading and 3 suggestion buttons
- Chat thread with user bubbles and AI response bubbles
- AI avatar circles (blue, `#3b65ef`)
- Typing indicator with animated dots
- Message input with send button
- Follow-up suggestion buttons after each AI response
- Header with info tooltip, reset, and close buttons

---

## Backend API Reference

### `POST /chat`

Send a visitor question and receive an AI-generated answer.

**Request:**
```json
{
  "message": "What does Srini do?"
}
```

**Response:**
```json
{
  "answer": "Srini is a Staff Product Designer at Intuit, where he leads design for the API Platform, developer portal, and GenAI experiences. He has 8+ years of experience across companies like Google, Norton, and Zoho.",
  "suggestions": [
    "What kind of products does Srini typically design?",
    "Can you tell me more about his work at Intuit?",
    "What is Srini's design philosophy?"
  ]
}
```

### `GET /health`

Health check endpoint.

**Response:**
```json
{ "status": "ok" }
```

### `GET /`

Serves the standalone chatbot HTML page (for direct access outside the iframe).

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| LLM | Llama 3.1 8B Instant via [Groq](https://groq.com) | Fast inference for conversational responses |
| Embeddings | [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) | 384-dim sentence embeddings for semantic search |
| Vector Store | [ChromaDB](https://www.trychroma.com/) | Persistent vector database for knowledge retrieval |
| API Framework | [FastAPI](https://fastapi.tiangolo.com/) | Async Python API server |
| Server | [Uvicorn](https://www.uvicorn.org/) | ASGI server |
| Frontend | React + [Vite](https://vitejs.dev/) | Chatbot UI (pre-built, served as static files) |
| Font | [DM Sans](https://fonts.google.com/specimen/DM+Sans) | Chatbot typography |

---

## Deployment

### Backend (Render)

The backend is configured for [Render](https://render.com) deployment via `render.yaml`:

- **Runtime**: Python
- **Build**: `pip install -r requirements.txt && python ingest.py`
- **Start**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
- **Disk**: 1 GB persistent disk mounted at `chroma_db/` for the vector store
- **Env vars**: `GROQ_API_KEY` (set in Render dashboard)

Deploy via: [render.com/deploy?repo=https://github.com/Srini93/SriniLM](https://render.com/deploy?repo=https://github.com/Srini93/SriniLM)

### Changing the Groq model

Yes — the model is **not** chosen in this portfolio site or the chatbot iframe. It is set in the **backend** that implements `POST /chat` (the [SriniLM](https://github.com/Srini93/SriniLM) service on Render).

1. Open the backend code where Groq is called (usually `chat.completions.create` or the Groq SDK equivalent).
2. Change the `model` argument to any [currently supported Groq model ID](https://console.groq.com/docs/models) (for example `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `meta-llama/llama-4-scout-17b-16e-instruct`, etc. — use the exact ID shown in Groq’s docs).
3. **Recommended**: read the model name from an environment variable (e.g. `GROQ_MODEL`) in Render so you can switch models without a code change, then redeploy (or restart) the service.

The static site and `data-chat-api` URL do not need to change when you only swap models on the server.

### Frontend (GitHub Pages / Netlify)

The chatbot frontend is bundled into the portfolio site repository under `chatbot/`. It deploys alongside the main site — no separate frontend deployment needed.

Update `data-chat-api` on the `#chatbot-sidebar` element in `index.html` to point to the deployed backend URL.

---

## Local Development

### Prerequisites

- Python 3.9+
- A [Groq API key](https://console.groq.com) (free tier available)

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env with your Groq key
echo "GROQ_API_KEY=your_key_here" > .env

# Build the vector knowledge base
python ingest.py

# Start the server
uvicorn app:app --host 127.0.0.1 --port 9000
```

The API will be available at `http://127.0.0.1:9000`.

### Frontend Setup

Serve the portfolio site with any static server. The `data-chat-api` attribute in `index.html` should point to your local backend:

```html
<div id="chatbot-sidebar" data-chatbot-src="./chatbot/" data-chat-api="http://127.0.0.1:9000"></div>
```

For production, this is set to `https://srinilm.onrender.com`.

---

## Knowledge Base Management

To update the chatbot's knowledge:

1. Edit the `KNOWLEDGE_BASE` list in `backend/ingest.py`
2. Each entry needs an `id` (unique string) and `text` (the content to embed)
3. Re-run `python ingest.py` to rebuild the vector store
4. Restart the server

The knowledge base currently has 20 entries covering: bio, philosophy, skills, tools, education, Intuit (3 entries), Norton, Google, Zoho, Holachef, Zeta, Tegus, personal info, Intuit Assist, API Explorer, LinkedIn summary, certifications, mentorship, volunteering, and honors/awards.

---

## Reliability

The chatbot frontend includes several reliability measures to handle real-world deployment conditions:

### Cold Start Handling (Render Free Tier)

Render's free tier spins down services after inactivity. On the first visit, the chatbot sends a background `GET /health` ping to wake the backend before the user sends their first message. The first chat request uses a 45-second timeout to accommodate cold starts; subsequent requests use a 30-second timeout.

### Retry with Exponential Backoff

Failed requests are retried up to 3 times with exponential backoff (1s, 2s, 4s delays). Retries are triggered for:

- Timeout errors (server still starting)
- Network errors (transient connectivity issues)
- 5xx server errors (temporary backend failures)

Client errors (4xx) and successfully parsed error responses are not retried.

### Request Timeouts

Every API call uses an `AbortController` with a timeout to prevent hanging requests. If the server doesn't respond within the timeout window, the request is aborted and retried.

### Error Recovery

After any chat error, a background health check is triggered to pre-warm the server for the user's next attempt.

### Graceful JSON Handling

If the server returns a non-JSON response, the error is caught and a user-friendly message is shown instead of an unhandled exception.

---

## Design Decisions

**Why RAG instead of fine-tuning?** RAG keeps the knowledge source explicit and easy to update — just edit `ingest.py` and re-ingest. No model training needed. It also prevents hallucination since the LLM can only reference provided context.

**Why Groq + Llama 3.1 8B?** Groq provides extremely fast inference (typically < 1 second) on open-source models. The 8B parameter model is sufficient for structured Q&A with provided context, keeping costs low while maintaining quality.

**Why ChromaDB?** Lightweight, embeddable vector store that runs in-process with no external dependencies. Perfect for a small knowledge base (20 entries) where a managed vector database would be overkill.

**Why an iframe?** Isolates the chatbot's React app from the portfolio's vanilla HTML/CSS, preventing style conflicts. The iframe is lazy-loaded so it doesn't impact initial page load performance.
