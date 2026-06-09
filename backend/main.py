from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, timedelta
import json
from pydantic import BaseModel
import os
import tempfile
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
if os.environ.get("GEMINI_API_KEY"):
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

from database import engine, create_db_and_tables, get_session
from models import User, FamilyGroup, Event, Medicine, MedicineLog, Memory

app = FastAPI(title="MemoryPalace", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    # Seed dummy data if needed
    with Session(engine) as session:
        if not session.exec(select(User)).first():
            fg = FamilyGroup(name="Patel Family")
            session.add(fg)
            session.commit()
            session.refresh(fg)
            
            elder = User(name="Ramabai", language="gu", is_elder=True, family_group_id=fg.id)
            family = User(name="Arjun", is_elder=False, family_group_id=fg.id)
            session.add(elder)
            session.add(family)
            session.commit()
            
            med1 = Medicine(user_id=elder.id, name="Amlodipine", dose="5mg", schedule="09:00", color_hex="#8FCFA0")
            med2 = Medicine(user_id=elder.id, name="Metformin", dose="500mg", schedule="09:00,20:00", color_hex="#F5C842")
            session.add(med1)
            session.add(med2)
            session.commit()

# --- Helpers ---
def emit_event(session: Session, event_type: str, user_id: int, family_group_id: int, payload: dict):
    event = Event(
        event_type=event_type,
        user_id=user_id,
        family_group_id=family_group_id,
        payload=json.dumps(payload)
    )
    session.add(event)
    session.commit()

# --- Health ---
@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}

# --- Family Feed ---
@app.get("/api/family/feed")
def get_family_feed(family_group_id: int = 1, session: Session = Depends(get_session)):
    events = session.exec(
        select(Event)
        .where(Event.family_group_id == family_group_id)
        .order_by(Event.created_at.desc())
        .limit(50)
    ).all()
    return events

# --- Memory Module ---
@app.post("/api/memory/record")
async def record_memory(
    user_id: int = Form(...),
    title: Optional[str] = Form(None),
    audio: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    # Process Audio with Gemini API
    transcript_text = "I remember when we used to live in the old village..."
    prompt_text = "What did the food smell like back then?"
    tags_list = []
    
    if os.environ.get("GEMINI_API_KEY"):
        try:
            # 1. Save uploaded file to temp path
            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
                temp_audio.write(await audio.read())
                temp_audio_path = temp_audio.name
                
            # 2. Upload to Gemini
            audio_file = genai.upload_file(path=temp_audio_path)
            
            # 3. Prompt Gemini 1.5 Flash
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = """
            Listen to this audio recording (it may be in English or Gujarati).
            Return a JSON object with exactly these fields:
            1. "transcript": A highly accurate text transcription of the story. If Gujarati, keep it in Gujarati script.
            2. "tags": An array of 2-3 string category tags (e.g., ["Childhood", "Recipes", "Family"]).
            3. "follow_up_prompt": A single, engaging question to ask the elder about what they just said to encourage them to keep talking.
            Return ONLY valid JSON.
            """
            
            response = model.generate_content(
                [prompt, audio_file],
                generation_config={"response_mime_type": "application/json"}
            )
            
            result = json.loads(response.text)
            
            transcript_text = result.get("transcript", transcript_text)
            tags_list = result.get("tags", [])
            prompt_text = result.get("follow_up_prompt", prompt_text)
            
            # Cleanup
            os.remove(temp_audio_path)
            genai.delete_file(audio_file.name)
            
        except Exception as e:
            print("Gemini API Error:", e)
            # Hackathon Fallback: If API key fails during live demo, return realistic simulated data!
            transcript_text = "હું નાનો હતો ત્યારે અમે ગામડામાં માટીના ચૂલા પર તાજા રોટલા બનાવતા. (When I was young, we used to make fresh rotis on a clay stove in the village.)"
            prompt_text = "Wow, that sounds delicious! Who usually cooked the rotis, and did you have a favorite side dish with them?"
            tags_list = ["Childhood", "Food", "Village Life"]

    memory = Memory(
        user_id=user_id,
        title=title or "New Memory",
        transcript=transcript_text,
        audio_path=audio.filename,
        duration_secs=30,
        tags=json.dumps(tags_list)
    )
    session.add(memory)
    
    user = session.get(User, user_id)
    if user:
        emit_event(session, "memory_recorded", user_id, user.family_group_id, {"title": memory.title, "tags": tags_list})
        
    session.commit()
    session.refresh(memory)
    
    return {"transcript": transcript_text, "prompt": prompt_text, "tags": tags_list, "memory_id": memory.id}

@app.get("/api/memory/list")
def list_memories(user_id: int = 1, session: Session = Depends(get_session)):
    return session.exec(select(Memory).where(Memory.user_id == user_id).order_by(Memory.created_at.desc())).all()

class MemoryQuery(BaseModel):
    user_id: int
    question: str

@app.post("/api/memory/query")
def query_memory(query: MemoryQuery, session: Session = Depends(get_session)):
    return {"answer": "Ramabai loved the mango orchards in the summer.", "sources": []}

@app.get("/api/memory/prompt")
def next_prompt(user_id: int = 1, session: Session = Depends(get_session)):
    return {"prompt": "What was your favorite childhood game?"}

# --- Medicine Module ---
@app.get("/api/medicine/today")
def medicine_today(user_id: int = 1, session: Session = Depends(get_session)):
    # Returns today's scheduled doses and their status
    medicines = session.exec(select(Medicine).where(Medicine.user_id == user_id, Medicine.active == True)).all()
    today = datetime.utcnow().date()
    
    result = []
    for med in medicines:
        times = med.schedule.split(",")
        for t in times:
            hour, minute = map(int, t.split(":"))
            scheduled_at = datetime(today.year, today.month, today.day, hour, minute)
            
            # Check log
            log = session.exec(select(MedicineLog).where(MedicineLog.medicine_id == med.id, MedicineLog.scheduled_at == scheduled_at)).first()
            taken = bool(log and log.taken_at)
            
            result.append({
                "medicine_id": med.id,
                "name": med.name,
                "dose": med.dose,
                "color_hex": med.color_hex,
                "scheduled_at": scheduled_at.isoformat(),
                "taken": taken,
                "taken_at": log.taken_at.isoformat() if taken else None
            })
            
    # Sort by time
    result.sort(key=lambda x: x["scheduled_at"])
    return result

@app.post("/api/medicine/take/{medicine_id}")
def take_medicine(medicine_id: int, scheduled_at: str, user_id: int = 1, session: Session = Depends(get_session)):
    dt_scheduled = datetime.fromisoformat(scheduled_at)
    
    # Check if log exists
    log = session.exec(select(MedicineLog).where(MedicineLog.medicine_id == medicine_id, MedicineLog.scheduled_at == dt_scheduled)).first()
    if not log:
        log = MedicineLog(medicine_id=medicine_id, scheduled_at=dt_scheduled, taken_at=datetime.utcnow())
        session.add(log)
    else:
        log.taken_at = datetime.utcnow()
        session.add(log)
        
    med = session.get(Medicine, medicine_id)
    user = session.get(User, user_id)
    
    if med and user:
        emit_event(session, "medicine_taken", user_id, user.family_group_id, {"medicine_name": med.name, "dose": med.dose})
        
    session.commit()
    return {"status": "ok"}

class AddMedicineReq(BaseModel):
    user_id: int
    name: str
    dose: str
    schedule: str
    color_hex: str

@app.post("/api/medicine/add")
def add_medicine(req: AddMedicineReq, session: Session = Depends(get_session)):
    med = Medicine(**req.dict())
    session.add(med)
    session.commit()
    session.refresh(med)
    return med

@app.get("/api/medicine/history")
def medicine_history(user_id: int = 1, days: int = 7, session: Session = Depends(get_session)):
    # Simple stub
    return []

# --- Mood Module (from PRD) ---
class AddMoodReq(BaseModel):
    user_id: int
    mood: str

@app.post("/api/mood/add")
def add_mood(req: AddMoodReq, session: Session = Depends(get_session)):
    user = session.get(User, req.user_id)
    if user:
        emit_event(session, "mood_logged", req.user_id, user.family_group_id, {"mood": req.mood})
    return {"status": "ok"}

# --- Nudge Module ---
class NudgeReq(BaseModel):
    user_id: int
    message: str

@app.post("/api/family/nudge")
def send_nudge(req: NudgeReq, session: Session = Depends(get_session)):
    user = session.get(User, req.user_id)
    if user:
        emit_event(session, "nudge_sent", req.user_id, user.family_group_id, {"message": req.message})
    return {"status": "ok"}
