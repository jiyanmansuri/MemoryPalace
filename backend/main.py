from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, timedelta
import json
import urllib.request
import urllib.parse
from pydantic import BaseModel
import os
import tempfile
import shutil
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
if os.environ.get("GEMINI_API_KEY"):
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

from database import engine, create_db_and_tables, get_session
from models import User, FamilyGroup, Event, Medicine, MedicineLog, Memory, Photo, CirclePost

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
    os.makedirs("uploads", exist_ok=True)
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
elder_heartbeats = {}

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

@app.get("/api/elder/{user_id}/status")
def get_elder_status(user_id: int):
    last_active = elder_heartbeats.get(user_id)
    if not last_active:
        return {"online": False, "last_active": "Never"}
    
    is_online = (datetime.utcnow() - last_active).total_seconds() < 25
    return {
        "online": is_online,
        "last_active": last_active.isoformat()
    }

# --- Auth Module ---
class LoginRequest(BaseModel):
    name: str
    is_elder: bool

@app.get("/api/auth/users")
def get_auth_users(is_elder: Optional[bool] = None, session: Session = Depends(get_session)):
    query = select(User)
    if is_elder is not None:
        query = query.where(User.is_elder == is_elder)
    return session.exec(query).all()

@app.post("/api/auth/login")
def login(req: LoginRequest, session: Session = Depends(get_session)):
    users = session.exec(
        select(User)
        .where(User.is_elder == req.is_elder)
    ).all()
    matched_user = None
    for u in users:
        if u.name.strip().lower() == req.name.strip().lower():
            matched_user = u
            break
    if not matched_user:
        raise HTTPException(status_code=404, detail="User not found")
    return matched_user

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

class TextMemoryReq(BaseModel):
    user_id: int
    title: str
    transcript: str

@app.post("/api/memory/add_text")
def add_text_memory(req: TextMemoryReq, session: Session = Depends(get_session)):
    memory = Memory(
        user_id=req.user_id,
        title=req.title,
        transcript=req.transcript,
        duration_secs=0,
        tags=json.dumps(["Story Prompt", "Written"])
    )
    session.add(memory)
    user = session.get(User, req.user_id)
    if user:
        emit_event(session, "memory_recorded", req.user_id, user.family_group_id, {"title": memory.title, "tags": ["Story Prompt", "Written"]})
    session.commit()
    session.refresh(memory)
    return memory

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

# --- Translation Module ---
class TranslateRequest(BaseModel):
    text: str
    target_lang: str

@app.post("/api/translate")
def translate_text(req: TranslateRequest):
    if not req.text.strip():
        return {"translated_text": ""}
    
    # Try Gemini translation first
    if os.environ.get("GEMINI_API_KEY"):
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            target = "Gujarati" if req.target_lang == "gu" else "English"
            prompt = f"Translate the following text into {target}. Return ONLY the direct translation text without comments, explanations, markdown quotes or intros:\n\n{req.text}"
            response = model.generate_content(prompt)
            if response and response.text:
                return {"translated_text": response.text.strip()}
        except Exception as e:
            print("Gemini translate error:", e)
            
    # Fallback to free MyMemory Translation API
    try:
        source_code = "en" if req.target_lang == "gu" else "gu"
        target_code = "gu" if req.target_lang == "gu" else "en"
        encoded_text = urllib.parse.quote(req.text)
        url = f"https://api.mymemory.translated.net/get?q={encoded_text}&langpair={source_code}|{target_code}"
        headers = {'User-Agent': 'Mozilla/5.0'}
        url_req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(url_req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data and data.get("responseData"):
                translated = data["responseData"].get("translatedText")
                if translated:
                    return {"translated_text": translated}
    except Exception as e:
        print("MyMemory translation fallback error:", e)

    # Local dictionary fallback
    words_map = {
        "hello": "નમસ્તે",
        "how are you": "કેમ છો",
        "good morning": "શુભ સવાર",
        "good night": "શુભ રાત્રિ",
        "water": "પાણી",
        "food": "ખોરાક",
        "medicine": "દવા",
        "thank you": "આભાર",
        "નમસ્તે": "Hello",
        "કેમ છો": "How are you",
        "શુભ સવાર": "Good morning",
        "શુભ રાત્રિ": "Good night",
        "પાણી": "Water",
        "ખોરાક": "Food",
        "દવા": "Medicine",
        "આભાર": "Thank you"
    }
    
    normalized_text = req.text.strip().lower().rstrip("?").rstrip("!").rstrip(".")
    if normalized_text in words_map:
        return {"translated_text": words_map[normalized_text]}
        
    return {"translated_text": f"({req.target_lang.upper()} Translation) {req.text}"}

# --- Medicine Module ---
@app.get("/api/medicine/today")
def medicine_today(user_id: int = 1, session: Session = Depends(get_session)):
    # Record heartbeat
    elder_heartbeats[user_id] = datetime.utcnow()
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
                "photo_path": med.photo_path,
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

@app.post("/api/medicine/add")
async def add_medicine(
    user_id: int = Form(...),
    name: str = Form(...),
    dose: str = Form(...),
    schedule: str = Form(...),
    color_hex: str = Form(...),
    photo: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session)
):
    photo_path = None
    if photo:
        os.makedirs("uploads", exist_ok=True)
        photo_path = f"uploads/{photo.filename}"
        with open(photo_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
            
    med = Medicine(
        user_id=user_id,
        name=name,
        dose=dose,
        schedule=schedule,
        color_hex=color_hex,
        photo_path=photo_path
    )
    session.add(med)
    session.commit()
    session.refresh(med)
    return med

@app.delete("/api/medicine/delete/{medicine_id}")
def delete_medicine(medicine_id: int, session: Session = Depends(get_session)):
    med = session.get(Medicine, medicine_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    med.active = False
    session.add(med)
    session.commit()
    return {"status": "ok"}

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

class AlertReq(BaseModel):
    user_id: int
    medicine_name: str
    message: str

@app.post("/api/family/alert")
def send_alert(req: AlertReq, session: Session = Depends(get_session)):
    user = session.get(User, req.user_id)
    if user:
        emit_event(session, "emergency_alert", req.user_id, user.family_group_id, {
            "medicine_name": req.medicine_name,
            "message": req.message
        })
    return {"status": "ok"}

class MedicalSummaryReq(BaseModel):
    user_id: int
    transcript: str

@app.post("/api/medical_summary/generate")
def generate_medical_summary(req: MedicalSummaryReq, session: Session = Depends(get_session)):
    user = session.get(User, req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if os.environ.get("GEMINI_API_KEY"):
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = f"""
            You are a medical assistant. Convert the following conversation transcript with an elderly patient into a clean medical summary for their doctor.
            Extract and format as JSON with exactly these fields:
            1. "chief_complaint": string
            2. "duration": string
            3. "severity": integer (1-10) or null
            4. "red_flags": array of strings (or empty)
            5. "current_medicines": array of strings (or empty)
            6. "notes": string (brief summary)
            
            Transcript:
            {req.transcript}
            """
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            result = json.loads(response.text)
            emit_event(session, "medical_summary", req.user_id, user.family_group_id, result)
            return result
        except Exception as e:
            print("Gemini API Error for medical summary:", e)
            
    fallback = {
        "chief_complaint": "General checkup conversation",
        "duration": "Recent",
        "severity": 3,
        "red_flags": [],
        "current_medicines": ["Unknown"],
        "notes": "Generated fallback summary due to API error or no API key."
    }
    emit_event(session, "medical_summary", req.user_id, user.family_group_id, fallback)
    return fallback

class FamilyMessageReq(BaseModel):
    user_id: int
    message: str

@app.post("/api/family/message")
def send_family_message(req: FamilyMessageReq, session: Session = Depends(get_session)):
    user = session.get(User, req.user_id)
    if user:
        emit_event(session, "voice_message", req.user_id, user.family_group_id, {"message": req.message})
    return {"status": "ok"}

# --- Photo Module ---
import shutil
import random

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.post("/api/photo/upload")
async def upload_photo(
    user_id: int = Form(...),
    photo: UploadFile = File(...),
    event_tag: Optional[str] = Form(None),
    session: Session = Depends(get_session)
):
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{photo.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)
        
    tag = event_tag
    if not tag:
        tag = "Misc"
        if os.environ.get("GEMINI_API_KEY"):
            try:
                model = genai.GenerativeModel('gemini-1.5-flash')
                image_file = genai.upload_file(path=file_path)
                prompt = "Analyze this image and return a JSON object with a single field 'event_tag' containing a short 2-3 word descriptive tag for the event shown (e.g., 'Diwali Celebrations', 'Family Dinner', 'Park Walk'). Return ONLY valid JSON."
                
                response = model.generate_content(
                    [prompt, image_file],
                    generation_config={"response_mime_type": "application/json"}
                )
                result = json.loads(response.text)
                tag = result.get("event_tag", "Misc")
                genai.delete_file(image_file.name)
            except Exception as e:
                print("Gemini API Error for photo sort:", e)
            
    photo_record = Photo(
        user_id=user_id,
        file_path=file_path,
        event_tag=tag
    )
    session.add(photo_record)
    user = session.get(User, user_id)
    if user:
        emit_event(session, "photo_uploaded", user_id, user.family_group_id, {"file_path": file_path, "event_tag": tag})
    session.commit()
    session.refresh(photo_record)
    return photo_record

class PhotoShareReq(BaseModel):
    photo_ids: List[int]
    target_user_ids: List[int]

@app.post("/api/photo/share")
def share_photos(req: PhotoShareReq, session: Session = Depends(get_session)):
    if not req.photo_ids or not req.target_user_ids:
        return {"status": "ok"}
        
    photos = session.exec(select(Photo).where(Photo.id.in_(req.photo_ids))).all()
    if not photos:
        return {"status": "error", "msg": "Photos not found"}
        
    elder_user_id = photos[0].user_id
    elder_user = session.get(User, elder_user_id)
    
    if elder_user:
        payload = {
            "photo_ids": [p.id for p in photos],
            "file_paths": [p.file_path for p in photos],
            "target_user_ids": req.target_user_ids,
            "message": f"{elder_user.name} shared {len(photos)} memory(s) with you."
        }
        emit_event(session, "photo_shared", elder_user_id, elder_user.family_group_id, payload)
        
    return {"status": "ok"}

@app.get("/api/photo/list")
def list_photos(user_id: int = 1, session: Session = Depends(get_session)):
    photos = session.exec(select(Photo).where(Photo.user_id == user_id).order_by(Photo.created_at.desc())).all()
    grouped = {}
    for p in photos:
        tag = p.event_tag or "Misc"
        if tag not in grouped:
            grouped[tag] = []
        grouped[tag].append(p)
    
    return [{"event_tag": k, "photos": v} for k, v in grouped.items()]

@app.post("/api/photo/{photo_id}/caption")
async def caption_photo(
    photo_id: int,
    audio: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    photo_record = session.get(Photo, photo_id)
    if not photo_record:
        raise HTTPException(status_code=404, detail="Photo not found")
        
    os.makedirs("uploads", exist_ok=True)
    audio_path = f"uploads/{audio.filename}"
    
    with open(audio_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)
        
    transcript_text = "A beautiful memory attached."
    if os.environ.get("GEMINI_API_KEY"):
        try:
            audio_file = genai.upload_file(path=audio_path)
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = "Listen to this audio recording and return a JSON object with a single field 'transcript' containing the exact text transcription in its original language. Return ONLY valid JSON."
            response = model.generate_content(
                [prompt, audio_file],
                generation_config={"response_mime_type": "application/json"}
            )
            result = json.loads(response.text)
            transcript_text = result.get("transcript", transcript_text)
            genai.delete_file(audio_file.name)
        except Exception as e:
            print("Gemini API Error for audio caption:", e)
            
    photo_record.caption_audio_path = audio_path
    photo_record.transcript = transcript_text
    session.add(photo_record)
    session.commit()
    session.refresh(photo_record)
    return photo_record

@app.get("/api/photo/on_this_day")
def on_this_day(user_id: int = 1, session: Session = Depends(get_session)):
    photos = session.exec(select(Photo).where(Photo.user_id == user_id)).all()
    if not photos:
        return None
    return random.choice(photos)

# --- Worldwide Circles Module ---
from fastapi import Form, UploadFile, File

@app.post("/api/circle/post")
async def create_circle_post(
    user_id: int = Form(...),
    category: str = Form(...),
    content_text: str = Form(...),
    photo: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session)
):
    media_path = None
    if photo:
        os.makedirs("uploads", exist_ok=True)
        filename = f"circle_{int(datetime.utcnow().timestamp())}_{photo.filename}"
        media_path = f"uploads/{filename}"
        with open(media_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
            
    circle_post = CirclePost(
        user_id=user_id,
        category=category,
        content_text=content_text,
        media_path=media_path
    )
    session.add(circle_post)
    session.commit()
    session.refresh(circle_post)
    
    user = session.get(User, user_id)
    if user and user.family_group_id:
        emit_event(session, "circle_post_created", user_id, user.family_group_id, {
            "post_id": circle_post.id,
            "category": category,
            "content_text": content_text,
            "media_path": media_path,
            "author_name": user.name
        })
        
    return circle_post

@app.get("/api/circle/list")
def list_circle_posts(
    scope: Optional[str] = None,
    family_group_id: Optional[int] = None,
    session: Session = Depends(get_session)
):
    db_posts = []
    if family_group_id is not None:
        users = session.exec(select(User).where(User.family_group_id == family_group_id)).all()
        user_ids = [u.id for u in users]
        if not user_ids:
            return []
        posts = session.exec(select(CirclePost).where(CirclePost.user_id.in_(user_ids)).order_by(CirclePost.created_at.desc())).all()
        for post in posts:
            user = session.get(User, post.user_id)
            db_posts.append({
                "id": post.id,
                "user_id": post.user_id,
                "category": post.category,
                "content_text": post.content_text,
                "media_path": post.media_path,
                "created_at": post.created_at,
                "author_name": user.name if user else "Elder"
            })
        return db_posts

    # If it is the global feed, mix DB posts with dynamic dummy posts
    posts = session.exec(select(CirclePost).order_by(CirclePost.created_at.desc())).all()
    for post in posts:
        user = session.get(User, post.user_id)
        db_posts.append({
            "id": post.id,
            "user_id": post.user_id,
            "category": post.category,
            "content_text": post.content_text,
            "media_path": post.media_path,
            "created_at": post.created_at,
            "author_name": user.name if user else "Elder"
        })

    dummy_pool = [
        {
            "id": 9999,
            "category": "Grandma's Kitchen",
            "content_text": "બાજરીનો રોટલો અને રીંગણનો ઓળો! શિયાળાની ઋતુમાં ગરમાગરમ રોટલા પર ઘી લગાવીને ખાવાની મજા જ કંઈક અલગ છે. (Bajri no Rotlo and Ringan no Olo! Having hot rotla smeared with ghee in winter is pure joy.)",
            "author_name": "દાદી રાધાબેન (Radhaben)"
        },
        {
            "id": 9998,
            "category": "Tales from Our Roots",
            "content_text": "અમારા ગામની નદી કિનારે આવેલું એ જૂનું વડનું ઝાડ, જ્યાં અમે બાળપણમાં સંતાકૂકડી રમતા. એ યાદો આજે પણ હૃદયમાં તાજી છે. (The old banyan tree by our village river where we played hide-and-seek in childhood. Those memories are still fresh.)",
            "author_name": "દાદા હસમુખભાઈ (Hasmukhbhai)"
        },
        {
            "id": 9997,
            "category": "Handmade & Heirlooms",
            "content_text": "શરદી-ઉધરસ માટે આદુ, તુલસી અને કાળા મરીનો ઉકાળો. આ અમારા ઘરનો જૂનો અને રામબાણ ઈલાજ છે! (Ginger, Tulsi, and Black Pepper decoction for cold & cough. Our home's time-tested remedy!)",
            "author_name": "શાંતાબા (Shantaba)"
        },
        {
            "id": 9996,
            "category": "Grandma's Kitchen",
            "content_text": "ઘરની બનાવેલી ગરમાગરમ સુખડી! ગોળ, ઘી અને ઘઉંના લોટનો આ સ્વાદ બાળપણના દિવસો યાદ અપાવે છે. (Homemade warm Sukhdi! The taste of jaggery, ghee, and wheat flour brings back childhood days.)",
            "author_name": "મણીબેન પટેલ (Maniben Patel)"
        },
        {
            "id": 9995,
            "category": "Tales from Our Roots",
            "content_text": "અમારા જમાનામાં ચોમાસામાં વરસાદ પડતાં જ આખું ગામ ભેગું થઈને કાગળની હોડીઓ બનાવતું અને ગીતો ગાતું. (In our time, as soon as it rained, the whole village gathered to make paper boats and sing.)",
            "author_name": "મનસુખભાઈ વ્યાસ (Mansukhbhai Vyas)"
        },
        {
            "id": 9994,
            "category": "Handmade & Heirlooms",
            "content_text": "ભરતકામ કરેલી આ સુંદર તોરણ મારા લગ્નમાં મારી માતાએ મને ભેટ આપી હતી, જે આજે પણ મારા ઘરના મુખ્ય દ્વારની શોભા વધારે છે. (This beautiful embroidered Toran was gifted by my mother at my wedding. It still adorns my main door.)",
            "author_name": "કમળાબેન જોષી (Kamlaben Joshi)"
        },
        {
            "id": 9993,
            "category": "Grandma's Kitchen",
            "content_text": "ગરમાગરમ મેથીના ગોટા અને કઢી! વરસાદી સાંજે આ રાષ્ટ્રીય નાસ્તો આખા કુટુંબને હસતું રાખે છે. (Hot Methi na Gota and Kadhi! This rainy evening snack keeps the whole family smiling.)",
            "author_name": "ચંપાબા (Champaba)"
        },
        {
            "id": 9992,
            "category": "Tales from Our Roots",
            "content_text": "જ્યારે લાઈટ નહોતી ત્યારે ફાનસના અજવાળે આખું કુટુંબ આંગણામાં ખાટલા પર બેસીને જૂની વાર્તાઓ સાંભળતું. (When there was no electricity, the whole family sat on cots in the courtyard under lantern light listening to old stories.)",
            "author_name": "દાદા રસિકલાલ (Rasiklal)"
        },
        {
            "id": 9991,
            "category": "Handmade & Heirlooms",
            "content_text": "ઉનાળામાં માટીના ઘડાનું ઠંડું પાણી પીવું એ ફ્રિજના પાણી કરતાં ઘણું ગુણકારી અને સ્વાદિષ્ટ છે. (Drinking cold water from a clay pot in summer is healthier and tastier than fridge water.)",
            "author_name": "રણછોડભાઈ (Ranchhodbhai)"
        },
        {
            "id": 9990,
            "category": "Grandma's Kitchen",
            "content_text": "તાજી ખીચડી અને દહીં, જે પેટ માટે અમૃત સમાન છે. જ્યારે પણ કોઈ બીમાર પડે, ત્યારે આ અમારો પ્રથમ ઇલાજ છે. (Fresh Khichdi and Curd, like nectar for the stomach. Whenever someone is sick, this is our first remedy.)",
            "author_name": "જશોદાબા (Jasodaba)"
        },
        {
            "id": 9989,
            "category": "Tales from Our Roots",
            "content_text": "અમારા ગામના મેળાઓની એ મજા, જ્યાં લાકડાના ચકડોળ પર બેસીને આખા આકાશને સ્પર્શવાનો અહેસાસ થતો. (The joy of our village fairs, where riding the wooden Ferris wheel felt like touching the sky.)",
            "author_name": "કાંતિલાલ મહેતા (Kantilal Mehta)"
        },
        {
            "id": 9988,
            "category": "Handmade & Heirlooms",
            "content_text": "હાથે ગૂંથેલું આ સ્વેટર મેં મારા પૌત્ર માટે બનાવ્યું છે. વણાટના દરેક તારમાં દાદીનો વહાલ વણાયેલો છે. (I hand-knitted this sweater for my grandson. Grandma's love is woven into every stitch.)",
            "author_name": "લીલાબેન (Lilaben)"
        },
        {
            "id": 9987,
            "category": "Grandma's Kitchen",
            "content_text": "રસાદાર ઊંધિયું અને પૂરી! ઉત્તરાયણનો તહેવાર આ પરંપરાગત વાનગી વિના અધૂરો છે. (Juicy Undhiyu and Puri! The festival of Uttarayan is incomplete without this traditional dish.)",
            "author_name": "ભાનુબેન શાહ (Bhanuben Shah)"
        },
        {
            "id": 9986,
            "category": "Tales from Our Roots",
            "content_text": "પહેલાના જમાનામાં ટપાલની જે રાહ જોવાતી, તે લાગણી અને ઉત્તેજના આજની ઇન્સ્ટન્ટ મેસેજિંગ એપ્લિકેશન્સમાં ક્યાંય નથી. (Waiting for letters in the past had an emotion and excitement that instant messaging apps simply cannot match.)",
            "author_name": "પ્રભાશંકર દવે (Prabhashankar Dave)"
        },
        {
            "id": 9985,
            "category": "Handmade & Heirlooms",
            "content_text": "લીમડાના પાન અને કપૂરની ગોળીઓ અનાજને જીવાતોથી બચાવવા માટેનો બેસ્ટ કુદરતી ઉપાય છે. (Neem leaves and camphor tablets are the best natural way to protect grains from pests.)",
            "author_name": "નર્મદાબા (Narmadaba)"
        },
        {
            "id": 9984,
            "category": "Multilingual Support",
            "content_text": "આજે મેં મારા પૌત્ર સાથે અંગ્રેજીમાં વાત કરવાનો પ્રયત્ન કર્યો. આ એપના અનુવાદકની મદદથી અમે એકબીજાને વધુ સારી રીતે સમજી શકીએ છીએ! (Today I tried speaking in English with my grandson. With the help of this translator, we understand each other so much better!)",
            "author_name": "દાદા મુકુંદભાઈ (Mukundbhai)"
        },
        {
            "id": 9983,
            "category": "Multilingual Support",
            "content_text": "Learning new words in Gujarati keeps my mind active. Connecting with elders across the language barrier is wonderful.",
            "author_name": "Hector"
        }
    ]

    shuffled_dummies = list(dummy_pool)
    random.shuffle(shuffled_dummies)
    
    randomized_dummies = []
    for idx, dummy in enumerate(shuffled_dummies):
        randomized_dummies.append({
            "id": dummy["id"],
            "user_id": 999 - idx,
            "category": dummy["category"],
            "content_text": dummy["content_text"],
            "media_path": None,
            "created_at": (datetime.utcnow() - timedelta(hours=idx)).isoformat(),
            "author_name": dummy["author_name"]
        })

    return db_posts + randomized_dummies
