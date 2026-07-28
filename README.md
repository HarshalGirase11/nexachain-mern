# NexaChain AI — Investment & Referral Platform (MERN Stack Assessment)

Full-stack implementation of the technical assessment: MongoDB/Mongoose schemas, secure REST APIs
(JWT-protected), daily ROI + multi-level referral business logic, a React dashboard, and an
idempotent cron scheduler.

## Tech Stack
- **Backend:** Node.js, Express.js, MongoDB, Mongoose, JWT, bcryptjs, node-cron
- **Frontend:** React (Vite), React Router, Axios, Recharts

## Project Structure
```
nexachain-mern/
├── backend/
│   ├── config/db.js               # MongoDB connection
│   ├── models/                    # User, Investment, ReferralIncome, RoiHistory
│   ├── controllers/                # auth, investment, dashboard, referral
│   ├── routes/
│   ├── services/                  # roiService.js, referralService.js (core business logic)
│   ├── middleware/                # JWT auth guard, centralized error handler
│   ├── jobs/roiCron.js            # daily ROI scheduler (node-cron)
│   ├── scripts/runRoiOnce.js      # manually trigger the ROI job (for testing)
│   ├── postman_collection.json    # importable Postman collection
│   ├── .env.example
│   └── server.js
└── frontend/
    ├── src/pages/                 # Login, Register, Dashboard, Investments, Referrals
    ├── src/components/            # Layout, StatCard, ReferralTreeNode
    ├── src/context/AuthContext.jsx
    ├── src/api/api.js             # Axios instance with JWT interceptor
    └── .env.example
```

---

## 1. Setup Steps

### Prerequisites
- Node.js v18+
- MongoDB running locally, **or** a MongoDB Atlas connection string

### Backend
```bash
cd backend
npm install
cp .env.example .env
# edit .env -> set MONGO_URI and JWT_SECRET
npm run dev        # starts on http://localhost:5000 (uses nodemon)
# or: npm start
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# edit .env -> set VITE_API_BASE_URL if backend isn't on localhost:5000
npm run dev         # starts on http://localhost:5173
```

Open **http://localhost:5173**, register a new account, and you'll land on the dashboard.

### Testing the ROI cron job without waiting for midnight
```bash
cd backend
node scripts/runRoiOnce.js
```
This runs the exact same idempotent logic the cron job runs at 12:00 AM daily.

---

## 2. Environment Variables

### backend/.env
| Variable | Description | Example |
|---|---|---|
| `PORT` | API server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/nexachain` |
| `JWT_SECRET` | Secret used to sign JWTs | long random string |
| `JWT_EXPIRES_IN` | Token expiry | `7d` |
| `DEFAULT_DAILY_ROI_PERCENT` | Fallback daily ROI % if not passed at investment creation | `1` |
| `MAX_REFERRAL_LEVELS` | How many levels deep referral income is paid | `5` |
| `LEVEL_INCOME_PERCENTAGES` | Comma-separated % per level (level 1, 2, 3...) | `10,5,3,2,1` |
| `ENABLE_CRON` | Set `false` to disable the scheduler | `true` |
| `CRON_SCHEDULE` | Cron pattern | `0 0 * * *` (12:00 AM daily) |

### frontend/.env
| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API | `http://localhost:5000/api` |

---

## 3. API Documentation

Base URL: `http://localhost:5000/api`
Import **`backend/postman_collection.json`** into Postman for ready-to-run requests.

### Auth
| Method | Endpoint | Access | Body |
|---|---|---|---|
| POST | `/auth/register` | Public | `{ fullName, email, mobileNumber, password, referralCode? }` |
| POST | `/auth/login` | Public | `{ email, password }` |
| GET | `/auth/me` | Private | — |

**Register response (201):**
```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "fullName": "Ravi Kumar", "email": "ravi@example.com", "referralCode": "NX7F3A2K", "walletBalance": 0, "...": "..." },
    "token": "eyJhbGciOi..."
  }
}
```
All private routes require header: `Authorization: Bearer <token>`

### Investments
| Method | Endpoint | Access | Body / Query |
|---|---|---|---|
| POST | `/investments` | Private | `{ amount, planName, durationInDays, dailyRoiPercentage? }` |
| GET | `/investments?page=1&limit=10&status=Active` | Private | — |

### Dashboard
| Method | Endpoint | Access | Returns |
|---|---|---|---|
| GET | `/dashboard/summary` | Private | totalInvestments, dailyRoi, totalROIEarned, totalLevelIncomeEarned, walletBalance |
| GET | `/dashboard/roi-history?page=1&limit=20` | Private | paginated ROI history |
| GET | `/dashboard/referral-income-history?page=1&limit=20` | Private | paginated referral income history |

### Referrals
| Method | Endpoint | Access | Returns |
|---|---|---|---|
| GET | `/referrals/direct` | Private | list of direct (level 1) referrals |
| GET | `/referrals/tree` | Private | full nested referral tree |

### Error format (all errors)
```json
{ "success": false, "message": "Descriptive error message" }
```

---

## 4. Business Logic Summary

- **Daily ROI (`services/roiService.js`):** for each active investment, calculates
  `amount × dailyRoiPercentage / 100`, writes a `RoiHistory` record, and credits the user's wallet.
- **Idempotency:** `RoiHistory` has a **unique compound index** on `(investment, date)`. If the cron
  job (or manual script) runs twice on the same day, the second insert throws a MongoDB duplicate-key
  error (`11000`), which is caught and treated as "already processed" — **so ROI is never credited
  twice**, satisfying Task 5's core requirement.
- **Referral / Level Income (`services/referralService.js`):** whenever ROI is credited to a user,
  the service walks up that user's `referredBy` chain, crediting each ancestor a configurable
  percentage (`LEVEL_INCOME_PERCENTAGES`) up to `MAX_REFERRAL_LEVELS` deep. `ReferralIncome` also has
  a unique index on `(beneficiary, sourceInvestment, level)` to prevent duplicate credits.
- **Cron Job (`jobs/roiCron.js`):** uses `node-cron` to run `processAllActiveInvestments()` daily at
  the configured time, processing investments in batches of 100 to control DB load.

---

## 5. Assumptions Made During Development

1. **Level income trigger:** the assessment doc doesn't specify exactly what event triggers referral/level
   income. I assumed it's paid as a percentage **of the daily ROI** each time ROI is credited (a common
   pattern in this type of platform) — not a one-time percentage of the investment principal. This is
   configurable via `LEVEL_INCOME_PERCENTAGES` in `.env`.
2. **Referral levels:** defaulted to 5 levels with decreasing percentages (10%, 5%, 3%, 2%, 1%), configurable.
3. **Daily ROI %:** can be supplied per-investment (different "plans" can have different rates); falls
   back to `DEFAULT_DAILY_ROI_PERCENT` if omitted.
4. **Investment plan model:** modeled as an embedded sub-document `{ name, durationInDays }` inside
   `Investment` rather than a separate `Plan` collection, since the assessment only asked for "plan details"
   without specifying a separate plans catalog. This can be normalized into its own collection easily if needed.
5. **"Account status"** on `User` is an enum (`active`, `inactive`, `suspended`); inactive/suspended users
   cannot log in or access private routes.
6. **Wallet balance** is the single source of truth for a user's withdrawable funds — every ROI credit and
   every level-income credit increments it. Withdrawal APIs were out of scope per the assessment brief and
   were not implemented.
7. Frontend uses **Vite** instead of Create React App for faster local dev — functionally equivalent for
   this assessment's purposes.

---

## 6. Deliverables Checklist (per Submission Requirements)
- [x] Database Schema Files — `backend/models/*.js`
- [x] API Source Code — `backend/controllers`, `backend/routes`
- [x] Business Logic Implementation — `backend/services/roiService.js`, `referralService.js`
- [x] React Dashboard — `frontend/src/pages/*`
- [x] Cron Job Implementation — `backend/jobs/roiCron.js`
- [x] README with setup, env vars, API docs, assumptions (this file)
- [x] Postman Collection — `backend/postman_collection.json`
