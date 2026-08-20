# TrustCart CRM — WebRTC Softphone UI (Agent) — Detailed Guide (BN)

তারিখ: 2026-01-03

## 0) এই ফিচারটা কী?
এই ফিচারটি TrustCart CRM-এর **Agent Dashboard**-এ একটি **Web Softphone UI** যুক্ত করে, যাতে এজেন্ট:

- কাস্টমার কল করার সময় একই স্ক্রিনে **Customer Info + Call Control + AI Script + Notes/Outcome** দেখতে পারে
- **Click-to-Call** দিয়ে CRM Task থেকে কল initiate করতে পারে
- কল শেষে **Outcome/Notes বাধ্যতামূলকভাবে** দিয়ে Task complete করতে পারে

> নোট: বর্তমান ইমপ্লিমেন্টেশনটি UI/UX + Backend Initiate Call-এর সাথে ইন্টিগ্রেটেড।
> প্রকৃত WebRTC/SIP calling (SIP.js) ভবিষ্যৎ ধাপে যোগ করা হবে (এই গাইডের শেষ অংশে “Future: Real WebRTC (SIP.js)” দেখুন)।

---

## 1) কোথায় আছে (Files)

### Frontend
- Agent Dashboard page: `frontend/src/pages/admin/crm/agent-dashboard.tsx`
  - এখানে “Customer Call” modal আপগ্রেড করে 3-panel Softphone UI করা হয়েছে

### Backend (আগেই যোগ করা ছিল)
- Telephony initiation endpoint:
  - `POST /api/telephony/calls/initiate`
- AI-style suggested script endpoint:
  - `GET /api/crm/automation/call-tasks/:taskId/suggested-script`

---

## 2) UX Layout (যেটা আপনি চেয়েছেন)

Agent call modal এখন এইভাবে কাজ করে:

### (A) Top Bar (Always Visible)
Top bar এ থাকে:
- Agent Status: `Online / On Call / Break`
- Mic status: `unknown / granted / denied`
- Call Timer (UI timer)

**Break** থাকলে “Call” button disabled থাকে (Zero confusion)।

### (B) 3-Column Main Layout
#### 1) Customer Info Panel (Left)
Auto screen-pop তথ্য:
- Name, Phone, Orders, LTV, Last purchase days
- Segment label (simple derived): `New-1 / Repeat-2 / Repeat-3 / Regular / Permanent`
- VIP badge (simple derived)
- AI Alert (simple rules): inactive, high AOV, new customer ইত্যাদি
- Recommended Products list (existing recommendations endpoint থেকে)

#### 2) Softphone Panel (Center)
- Dial input (auto-filled customer phone)
- Dial pad (0–9, *, #)
- Primary actions:
  - `Call` (initiate)
  - `Hangup` (UI end)
- Secondary controls (UI toggles): `Mute / Hold / Record`

> এগুলো এখন UI-state হিসেবে আছে। বাস্তব PBX control (mute/hold/record) future integration এ provider/WebRTC এর মাধ্যমে হবে।

#### 3) AI Script Panel (Right)
- Backend থেকে suggested script লোড হয় (task-based)
- Sections:
  - Script title + goal
  - Opening lines
  - Main lines
  - Objection helper
  - Closing lines

### (C) Bottom Panel — Notes & Outcome
- Outcome radio (required): Ordered / Follow-up / Not Interested / Price Issue / No Response
- Notes textarea
- Follow-up datetime (শুধু outcome=Follow-up হলে)

**Outcome না দিলে Complete Task button disabled থাকে** (spec অনুযায়ী mandatory)।

---

## 3) User Flow (Agent)

1) Agent dashboard থেকে `Call` চাপলে
   - CRM task `in_progress` হয়
   - Customer intelligence + recommendations load হয়
   - Suggested script load হয়
   - Softphone modal open হয়

2) Softphone modal এ `Call` চাপলে
   - Backend এ `POST /api/telephony/calls/initiate` কল হয়
   - Response এ mock/live mode দেখা যায়

3) Agent কল শেষ করে outcome + notes দেয়
   - `Complete Task` চাপলে CRM task `completed` হয়

---

## 4) API Contracts (Frontend কীভাবে কল করে)

### 4.1 Suggested Script
**Request**
- `GET /api/crm/automation/call-tasks/:taskId/suggested-script`

**Response (example shape)**
```json
{
  "taskId": 123,
  "scriptKey": "winBack",
  "opening": ["..."],
  "main": { "title": "...", "goal": "...", "lines": ["..."] },
  "objectionHandling": [{"objection":"...","reply":"..."}],
  "ending": ["..."],
  "context": {"callReason":"...","customerIntel":{},"recommendations":[]}
}
```

### 4.2 Click-to-Call (Telephony Initiate)
**Request**
- `POST /api/telephony/calls/initiate`

Body:
```json
{
  "taskId": 123,
  "agentUserId": 1
}
```

**Response**
- Live mode (provider configured)
```json
{ "telephonyCallId": 55, "provider": "bracknet", "externalCallId": "abc123", "mode": "live" }
```
- Mock mode (provider creds missing)
```json
{ "telephonyCallId": 55, "provider": "bracknet", "mode": "mock", "message": "..." }
```

---

## 5) Configuration (Telephony/Bracknet)
Backend environment variables (আগের telephony module অনুযায়ী):

- `TELEPHONY_PROVIDER=bracknet`
- `BRACKNET_API_BASE_URL=...`
- `BRACKNET_API_KEY=...`
- `BRACKNET_WEBHOOK_SECRET=...` (optional)

> যদি `BRACKNET_API_BASE_URL` / `BRACKNET_API_KEY` না থাকে, initiate endpoint mock mode রিটার্ন করবে (UI তে “mock mode” দেখাবে)।

---

## 6) Security Notes
- Suggested script endpoint JWT guard দিয়ে protected (internal agent use)
- Telephony initiate endpointও auth protected হওয়া উচিত (backend controller এ guard থাকলে)
- Webhook endpoint (provider → CRM) future hardening:
  - signature verification
  - IP allowlist
  - request replay protection

---

## 7) TL Live Monitor (এই UI তে কী আছে/কি নেই)
এই কাজের scope অনুযায়ী **Agent softphone UI** implemented হয়েছে।
TL লাইভ মনিটর UI (Live listen/whisper/force break) এই ডেলিভারেবল-এ যোগ করা হয়নি, কারণ আপনার অনুরোধ ছিল “WebRTC softphone UI design” + implement that feature only.

---

## 8) Future: Real WebRTC Softphone (SIP.js) — How to extend
এখনকার UI টি intentionally provider-agnostic। পরের ধাপে WebRTC/SIP.js যোগ করতে চাইলে:

1) Install SIP.js in frontend
   - `npm i sip.js`
2) Add a small “Softphone engine” wrapper
   - create `frontend/src/services/softphone/`
   - manage:
     - `getUserMedia` audio stream
     - SIP registration
     - outgoing call invite
     - events → update UI state (`ringing/connected/ended`)
3) Replace current `handleInitiateCall()` behavior
   - option A: keep backend initiate as “logging + PBX bridge” and use SIP.js only for media
   - option B: use SIP.js fully, and backend only stores call logs + webhook
4) Add WebSocket / webhook-based realtime status
   - connect telephony status updates to UI so `callStatus` becomes real-time (not optimistic)

---

## 9) Quick Test Checklist
- Agent Dashboard এ task থেকে `Call` → modal open হয়
- Left panel এ customer data + recommendations আসে
- Right panel এ suggested script আসে
- Center panel এ `Call` চাপলে telephony initiate hits
- Outcome না দিলে Complete disabled থাকে
- Outcome + notes দিয়ে Complete করলে task completed হয়

---

## 10) Known Limitations (বর্তমান implementation)
- UI call timer বাস্তব call duration নয় (realtime events যোগ করলে ঠিক হবে)
- Mute/Hold/Record এখন UI toggles; PBX/WebRTC control later
- Dial input change করলে এখনো backend এ customer phone override পাঠানো হয় না (taskId-based flow)

---

## 11) Summary
এই ফিচারটি Agent workflow কে “single-screen calling” করে দিয়েছে:
- Customer Info + AI Script + Call Control + Outcome/Notes
- Click-to-call integration via backend telephony module

পরবর্তী ধাপে চাইলে আমি:
- realtime call status (webhook→ws)
- SIP.js based real WebRTC calling engine
- TL live monitor view
যোগ করে দিতে পারি।
