<div align="center">

# 🏛️ MemoryPalace — HeartBridge

### *Where Memory Meets Love*

**A Bilingual Elder Care & Family Connection Platform**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Deployed on Render](https://img.shields.io/badge/Deployed-Render.com-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)

---

> *"Every elder deserves to be remembered, connected, and cared for."*
>
> **— Team Hyphen**

---

</div>

## 🌟 About The Project

**MemoryPalace — HeartBridge** is a full-stack web application built to **bridge the emotional gap between elderly individuals and their families**. Designed specifically for Indian households, it is fully bilingual in **Gujarati 🇮🇳 and English**, featuring a simplified elder interface alongside a powerful family dashboard.

We saw a real problem — elders living alone or away from family feel **lonely, forgotten, and medically at risk**. HeartBridge solves this by giving elders a beautiful space to record memories, track health, and stay connected, while giving families **real-time visibility** into their loved one's daily life.

---

## ✨ Features

### 👴 Elder Side
| Feature | Description |
|--------|-------------|
| 🎙️ **Memory Nook** | Record voice memories, stories & life experiences with one tap |
| 😊 **Mood Tracker** | Log daily emotional state with a simple emoji-based interface |
| 💊 **Medicine Reminders** | Smart alerts for upcoming, due, and missed medications |
| 🌍 **Worldwide Circles** | Share posts, photos and memories globally or within family |
| 🌳 **Family Tree** | View your full family structure in a beautiful visual graph |
| 🔔 **Bilingual Notifications** | All alerts in both Gujarati and English |
| 🌐 **Language Toggle** | Switch between Gujarati & English instantly at any time |

### 👨‍👩‍👧 Family Member Side
| Feature | Description |
|--------|-------------|
| 📊 **Live Activity Feed** | See real-time updates — memories recorded, mood logged, meds taken |
| 💓 **Elder Status Heartbeat** | Live presence indicator (Active / Idle / Resting) |
| 💌 **Send Nudges** | Send love, encouragement, or reminders to your elder |
| 🌳 **Family Tree Management** | Add & manage family relationships and members |
| 💊 **Medicine Management** | Add medications with dosage, frequency & schedules |
| 🔔 **Smart Notifications** | Alerts for missed medicines and elder inactivity |
| 👁️ **Family Circle View** | View elder's family posts (read-only, respecting privacy) |

---

## 🛠️ Tech Stack

### Frontend
```
React 18 + Vite        → Fast SPA with hot module replacement
Vanilla CSS            → Custom dark theme, glassmorphism, animations  
Lucide React           → Crisp icon system
MediaRecorder API      → Browser-native voice recording
Canvas / SVG           → Mood charts and family tree visualization
```

### Backend
```
FastAPI (Python)       → High-performance async REST API
SQLite                 → Lightweight embedded database
SQLAlchemy ORM         → Database models and relationships
Pydantic v2            → Request/response schema validation
CORS Middleware        → Secure cross-origin resource sharing
Binary Storage         → Audio & images stored as BLOB in database
```

### Deployment
```
Render.com             → Free-tier cloud hosting with auto-deploy
GitHub                 → Source control and CI/CD trigger
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- Git

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/jiyanmansuri/HeartBridge.git
cd HeartBridge
```

**2. Setup the Backend**
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
python main.py
```
> Backend runs on `http://localhost:8000`

**3. Setup the Frontend**
```bash
cd frontend
npm install
npm run dev
```
> Frontend runs on `http://localhost:5173`

**4. (Optional) Run Both Together**
```bash
# Windows — double click
run.bat
```

---

## 📁 Project Structure

```
HeartBridge/
├── 📁 frontend/
│   ├── 📁 src/
│   │   ├── 📁 components/
│   │   │   ├── Home.jsx            # Elder home dashboard
│   │   │   ├── MemoryNook.jsx      # Voice memory recording
│   │   │   ├── Medicine.jsx        # Medicine reminders (elder)
│   │   │   ├── MedicineTracker.jsx # Medicine management (family)
│   │   │   ├── Dashboard.jsx       # Family member dashboard
│   │   │   ├── FamilyGroup.jsx     # Family tree & management
│   │   │   ├── WorldwideCircles.jsx# Global + family social feed
│   │   │   ├── VoiceAssistant.jsx  # Voice interaction module
│   │   │   ├── ElderSettings.jsx   # Elder profile & settings
│   │   │   ├── Login.jsx           # Auth (Elder / Family login)
│   │   │   └── ...
│   │   ├── App.jsx                 # Root app + navigation + notifications
│   │   └── index.css              # Global dark theme styles
│   └── vite.config.js
│
├── 📁 backend/
│   ├── main.py                     # FastAPI app — all REST endpoints
│   └── requirements.txt
│
├── render.yaml                     # Render.com deployment config
├── run.bat                         # One-click local start (Windows)
└── README.md
```

---

## 💡 Key Innovations

### ⏰ Smart Notification Timing
Medicine alerts fire at **3 precise moments**:
- **30 min before** scheduled time → "Upcoming" warning
- **At scheduled time** (0–15 min window) → "Take Now" alert  
- **15+ min after** scheduled time → "Missed" critical alert

### 💓 Live Elder Status Heartbeat
The elder's `last_active` timestamp updates on every interaction. Family members poll every **60 seconds** to show a live **Active / Idle / Resting** presence badge.

### 🌐 Bilingual Architecture
Every UI string exists in both **Gujarati and English**. A single language toggle switches the entire app **instantly** — no page reload, no separate routes, full i18n at component level.

### 🔒 Role-Based Access Control
The `is_elder` flag in the user model determines the entire experience:
- **Elders** → Simplified large-text UI, voice-first interaction
- **Family members** → Data-rich dashboard, management tools
- Certain actions (edit family tree, add medicines) are **family-only**

---

## 🎨 Design Philosophy

- 🌑 **Dark Navy Theme** — Easy on aging eyes, premium feel
- 🔤 **Large Typography** — Accessible for elderly users
- 🎯 **Minimal Clicks** — Key actions reachable in 1–2 taps
- 🌈 **Color-coded Alerts** — Green (good), Amber (warning), Red (urgent)
- 💫 **Smooth Animations** — Subtle micro-interactions for delight

---

## 👥 Team Hyphen

*"Let's Bridge the Gap Together"*

| Name | Role |
|------|------|
| 👑 **Jiyan Mansuri** | Team Leader |
| 💻 **Ridham Gohel** | Team Member |
| 🔧 **Nikhil Leuva** | Team Member |
| 🎨 **Hamid Mansuri** | Team Member |

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<div align="center">

**Built with ❤️ for India's Elders**

*MemoryPalace — HeartBridge © 2025 Team Hyphen*

[![GitHub](https://img.shields.io/badge/GitHub-jiyanmansuri%2FHeartBridge-181717?style=for-the-badge&logo=github)](https://github.com/jiyanmansuri/HeartBridge)

</div>
