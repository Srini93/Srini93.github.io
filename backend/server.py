from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import asyncio
import os

load_dotenv()

# Limit concurrent LLM calls so bursts don’t block the worker or exhaust API quota.
_CHAT_SEM = asyncio.Semaphore(max(1, int(os.getenv("CHAT_MAX_CONCURRENT", "8"))))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """You are Srini's AI assistant on his portfolio website. Srinivasan (Srini) is a Staff Product Designer at Intuit, previously at Norton, Google, and Zoho. He is based in the San Francisco Bay Area.

Key facts:
- Currently designing GenAI-powered developer experiences (Intuit Assist) and API platform tools at Intuit.
- At Norton: designed Spam Protection features and a white-label design system for Norton 360 iOS.
- At Google: built a component library / design system for Google Ad Manager.
- At Zoho: designed and shipped Zoho Sheet for iOS and Android.
- Also worked on Holachef (FoodTech startup) ecosystem of applications.
- Full-spectrum product designer: research, interaction design, visual design, prototyping, design systems.
- Email: tcsreeni93@gmail.com
- LinkedIn: linkedin.com/in/srinivasanchakkarapani

Be friendly, concise, and helpful. If someone asks something you don't know about Srini, say so politely and suggest they email him directly."""


class ChatRequest(BaseModel):
    message: str


@app.post("/chat")
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        async with _CHAT_SEM:
            response = await asyncio.to_thread(
                lambda: client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": req.message},
                    ],
                    max_tokens=500,
                    temperature=0.7,
                )
            )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8888)
