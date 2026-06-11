# Handoff — ስለ እናት (sile inat)

**For the next Claude conversation.** This document is the complete context. Read it once, then act on it.

---

## 1. What you're inheriting

**Project name:** ስለ እናት (Amharic, "About Mother" — pronounced *sile inat*)
**Product:** An anonymous web platform for new mothers — specifically built for the postpartum period. Forum, AI assistant, daily wellness check-in, expert events.
**Why it exists:** Postpartum depression is silent and stigmatized, especially in Ethiopia (~20% prevalence, mostly undiagnosed). Existing tools (WhatsApp groups, generic health apps, clinic visits) don't meet mothers where they are. The product is built around one core promise: *"For the things you'd only Google at 3am."*

**Where this came from:** Originally a 5-person hackathon team built it as "Abay Wellness" — a generic Ethiopian wellness app. The user (Dawit) rebranded it during the hackathon to MomsHub, then to ስለ እናት, and gave it a real postpartum focus. The other teammates were not aligned and one (Yaphet) ghosted the team for 24+ hours during deployment, blocking access to the Netlify account. The user worked solo through the night.

---

## 2. Current status (as of this handoff)

- **Submitted** to the hackathon via Google Form (frontend-only, broken — backend wasn't deployed at submission).
- **A judge called back on Thursday** asking the user to fix the non-working functionalities by **Saturday morning**.
- **Backend is now deployed to Render** (free tier). Flask serves both the API and the React frontend from one URL.
- **Single deployed URL** (user has it — Render assigned it as `https://sile-inat-api.onrender.com` or similar).
- **Cold start issue** — Render free tier sleeps after 15 min idle. User was advised to set up UptimeRobot (free) pinging `/health` every 5 min. *Verify this was done.*
- **Groq LLM API key** is set as env var `LLM_API_KEY` on Render — chatbot uses Groq's free llama-3.1-8b-instant.
- **The judge has asked for a "complete revamp."** Saturday morning is the deadline. The user is open to rethinking the system from scratch.

---

## 3. Tech stack

| Layer | Tech |
|---|---|
| **Backend** | Flask 3.0, Flask-SQLAlchemy, SQLite (ephemeral on Render free tier — known issue) |
| **ML** | scikit-learn 1.5, trained at build time on synthetic data (`src/ml/synthesize_data.py` + `src/ml/train.py`) |
| **Chatbot** | Groq via OpenAI-compatible API, falls back to canned message if `LLM_API_KEY` is unset |
| **Frontend** | React 19 + Vite + TypeScript, Tailwind v4, Redux Toolkit, Framer Motion, lucide-react icons |
| **Routing** | react-router-dom 7 |
| **Hosting** | Render web service, single Flask app serves frontend + API |

---

## 4. GitHub repos

| Repo | Role | Access |
|---|---|---|
| `siyanet/wellness` | Original team repo. User has write access but cannot modify the connected Netlify deploy. | Write |
| `dawitsileshi/wellness` | User's fork. Render auto-deploys from `main` here. | Owner |

Local clone: `D:\Projects\wellness`
Remotes:
- `origin` → `siyanet/wellness`
- `fork` → `dawitsileshi/wellness`

Both remotes are synced — push to both when committing.

---

## 5. File map (what lives where)

```
wellness/
├── app.py                          # Flask app factory; serves API at /api/* and React SPA at /*
├── config.py                       # Env-based config
├── build.sh                        # Render build script: pip install → train ML → build frontend
├── render.yaml                     # Render Blueprint (free plan, gunicorn 'app:create_app()')
├── requirements.txt                # Python deps incl. gunicorn 22.0.0
├── src/                            # Backend source
│   ├── extensions.py               # db = SQLAlchemy()
│   ├── models.py                   # ForumPost, ForumReply, User, DailyLog
│   ├── routes/
│   │   ├── auth.py                 # /api/auth/{register,login,logout}
│   │   ├── forum.py                # /api/forum/posts (CRUD + replies)
│   │   ├── chatbot.py              # /api/chatbot
│   │   ├── logs.py                 # /api/logs (POST + history)
│   │   └── ml_metrics.py           # /api/ml/{metrics,health}
│   ├── services/
│   │   ├── anonymous.py            # X-Anonymous-Client-Id (UUID v4) helpers
│   │   ├── auth.py                 # token utilities
│   │   ├── chatbot_service.py      # Groq integration + fallback
│   │   └── ml_service.py           # loads joblib artifacts, predicts wellbeing
│   └── ml/
│       ├── synthesize_data.py      # generates synthetic_maternal_data.csv
│       ├── train.py                # trains GradientBoostingRegressor, saves .joblib
│       └── artifacts/              # NOT in git — built at deploy time
├── frontend/                       # React app
│   ├── index.html                  # <title>ስለ እናት · sile inat</title>
│   ├── package.json                # name: abay-wellness (legacy — should be renamed)
│   ├── vite.config.ts              # proxies /api to http://127.0.0.1:5050 in dev
│   ├── docs/
│   │   ├── API_Contract.md         # Markdown spec
│   │   └── openapi.yaml            # OpenAPI 3.0 spec
│   └── src/
│       ├── App.tsx                 # routes: /, /community, /events, /check-in, /ai-assistant
│       ├── lib/api.ts              # API_URL = import.meta.env.VITE_API_URL ?? '/api'
│       ├── lib/clientId.ts         # generates + stores anonymous UUID in localStorage
│       ├── store/                  # Redux slices: forum, chat, tracker
│       ├── pages/
│       │   ├── HomePage.tsx        # Hero + HomeFeatures + HomeStats + HomeCTA
│       │   ├── CommunityPage.tsx   # Forum w/ category chips + whisper empty state
│       │   ├── EventsPage.tsx
│       │   ├── CheckInPage.tsx     # Mood/energy/sleep w/ postpartum-specific labels
│       │   ├── AIAssistantPage.tsx # Chat w/ 3am-search suggested prompts
│       │   └── DashboardPage.tsx   # (used by teammate, may not be linked from nav)
│       └── components/
│           ├── layout/             # Layout, Navbar, Footer, JoinModal, PageTransition
│           ├── home/               # Hero, HomeFeatures, HomeStats, HomeCTA, etc.
│           ├── community/, events/, knowledge/, experts/, ui/  # various
│           └── home/NightModeBanner.tsx  # shows quiet line after 10pm
├── scripts/
│   └── seed_db.py                  # seeds 60 days of logs for seed-user
├── tests/                          # pytest suite
├── docs/
│   ├── MomsHub_Pitch.pptx          # 12-slide pitch deck (committed)
│   └── HANDOFF.md                  # THIS FILE
└── instance/
    └── maternal_wellness.db        # SQLite (gitignored, local only)
```

---

## 6. What works on the deployed backend

| Endpoint | Method | Auth | Tested |
|---|---|---|---|
| `/api/forum/posts` | GET | none | ✅ |
| `/api/forum/posts` | POST | requires `X-Anonymous-Client-Id: <uuid-v4>` header | ✅ |
| `/api/forum/posts/<id>` | GET | none | ✅ |
| `/api/forum/posts/<id>/replies` | POST | same UUID header | ✅ |
| `/api/auth/register` | POST | none | ✅ |
| `/api/auth/login` | POST | none | ✅ |
| `/api/auth/logout` | POST | token | ✅ |
| `/api/chatbot` | POST | optional | ✅ (Groq when key set, fallback otherwise) |
| `/api/logs` | POST | token, requires many fields incl. `gestational_week` | ✅ |
| `/api/logs/history` | GET | token | wired |
| `/api/ml/metrics` | GET | none | ✅ |
| `/api/ml/health` | GET | none | ✅ |

**Important quirk:** The forum has anonymous mode (UUID-based) AND an auth system (email/password + token). Both work. The frontend uses anonymous mode for the forum. This contradicts what the pitch deck claims ("we never ask for your name"). Decision needed in the revamp: pick one.

---

## 7. Voice & design — what the user changed during the rescue

These are the choices that made the product feel less generic. Preserve them unless deliberately rethinking:

- **Hero H1:** *"For the things you'd only Google at 3am."*
- **Hero sub:** *"A quiet, anonymous place for new mothers. Ask what you can't ask anyone else."*
- **Check-In mood labels:** Surviving → Holding on → Okay-ish → Some good moments → Felt like myself
- **Check-In energy labels:** Empty → Running on coffee → Holding it together → A bit of me back → Like myself today
- **AI suggested prompts:** *"Is it normal to regret having a baby?"*, *"How do I know if it's postpartum depression?"*, *"Why am I crying for no reason?"*, *"I don't feel like a mother yet."*
- **Empty forum state:** Shows anonymous "whispers" from other mothers so the page never feels sterile.
- **Color palette:** Warm cream (`#F5F0E4`) background, deep forest green (`#1A7A3D`) brand, Plus Jakarta Sans typography.
- **Brand mark:** Green rounded square with heart icon + Amharic wordmark.
- **NightModeBanner component** exists and is intended to show a quiet line after 10pm — verify it's mounted in HomePage.

The product's voice goal: **"a refuge, not a SaaS product."** Strip back, don't add.

---

## 8. Decisions on the table for the revamp

The judge asked for a "complete revamp." The user is open to rethinking. Open questions to consider:

1. **Auth vs. anonymous.** Currently both exist and conflict. The pitch deck sells anonymity. The backend has full auth. Pick one and remove the other.
2. **Anonymous 1:1 chat between mothers** — user wants this but advised against for safety reasons (moderation, predator risk, crisis handling). Consider alternatives:
   - *"X mothers are up tonight"* counter (no DMs, just connection-without-conversation)
   - 💛 *"I've been there"* button on forum posts (anonymous emotional ack, no DM)
   - Opt-in async pairs (time-limited, AI-mediated)
3. **Event supply side** — currently mock data. Real product needs verified clinicians + institutional partnerships (Ministry of Health, YeneHealth). The pitch deck explicitly mentions YeneHealth (Kidist is one of the judges).
4. **SQLite on Render free tier is ephemeral.** Data won't survive cold starts long-term. For real launch: swap to Postgres (Render has free Postgres tier) or Turso (SQLite-compatible hosted).
5. **The original idea** — the user is also passionate about a "smart discovery and recommendation for wellness" idea (their pre-pivot project). Worth keeping in mind as a separate future direction.
6. **Access to Kidist (YeneHealth CEO, hackathon judge)** — user has a personal connection to her through someone they know. Planning to show her the product after the hackathon regardless of outcome. The pitch deck explicitly credits YeneHealth on slide 5.

---

## 9. The pitch deck

`docs/MomsHub_Pitch.pptx` — 12 slides, leads with the why before introducing the product. Color palette matches the site. Built with pptxgenjs. Source script lives in git history if recovery needed. Key slides:

1. Title — *"A village for every mother"*
2. Opening story — quote from an Addis Ababa mother
3. Problem — *1 in 5* Ethiopian mothers have PPD
4. Barriers — Shame, Judgment, No Space
5. Why now — mobile growth + YeneHealth acknowledgment
6. The gap — what exists vs what doesn't
7. The solution — ስለ እናት (brand still says MomsHub in deck — needs update)
8. Four pillars — Forum, AI, Check-ins, Events
9. *"We do not ask for your name."* — anonymity as design choice
10. Built for trust — evidence-based, expert-led, crisis-aware
11. Vision — *"Every mother deserves a village."*
12. Thank you

**The deck still says "MomsHub" everywhere — needs updating to "ስለ እናት" for any future use.**

---

## 10. The team situation (briefly)

- Yaphet (ssupyafa on GitHub, @j4phi on Telegram) — owned the Netlify account, ghosted for 24+ hours, left the group chat after reading the user's farewell message. Will not respond.
- Other team member: also ghosted.
- User: dawitsileshi45@gmail.com, GitHub `dawitsileshi`. Operating solo from this point.

**Don't waste time trying to recover the original Netlify deploy.** The Render deployment is the canonical one going forward.

---

## 11. Local dev quickstart

```powershell
cd D:\Projects\wellness

# Backend
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
.\venv\Scripts\python src\ml\synthesize_data.py
.\venv\Scripts\python src\ml\train.py
.\venv\Scripts\python app.py
# → http://127.0.0.1:5050

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
# → http://localhost:5173 (proxies /api to :5050)
```

`.env` file (created from `.env.example`):
```
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=<anything for dev>
LLM_API_KEY=<groq key for chatbot — optional in dev>
```

---

## 12. How to be useful in the next conversation

- The user is **the project manager and the only engineer** on this now. Don't suggest "ask your team."
- The user **trusts honest pushback over polite agreement**. If a feature idea has safety/scope/timeline problems, say so directly with specifics.
- The user is in **Ethiopia (Addis Ababa)** — UTC+3. Free tiers and no-credit-card options are preferred when possible.
- The user is **passionate but tired**. Saturday morning is the deadline. Help them prioritize ruthlessly.
- The deployed URL is the source of truth for what judges will see — always verify changes there, not just on localhost.

Good luck. The work so far is genuinely good — better than the user gives themselves credit for.
