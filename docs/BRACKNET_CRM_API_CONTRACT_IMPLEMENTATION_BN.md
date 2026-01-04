# Bracknet IP PBX ↔ TrustCart CRM — API Contract (JSON) + Implementation Guide (BN)

তারিখ: 2026-01-03

এই ডকুমেন্টে ২টা জিনিস একসাথে আছে:
1) **Contract (JSON)** — Bracknet Team + Dev Team একই ভাষায় কথা বলবে
2) **TrustCart Implementation** — আমাদের backend-এ কোন endpoint আছে, কী কাজ করে, DB/CRM task কীভাবে আপডেট হয়

> গুরুত্বপূর্ণ: TrustCart backend-এ global prefix `/api` আছে। তাই এখানে লেখা webhook path গুলো বাস্তবে হবে `/api/webhook/...`.

---

## 1) CRM → Bracknet (Call Control APIs)

### 1.1 Click-to-Call (Outbound Call)
**Endpoint (TrustCart side / Contract-compatible)**
- `POST /api/call/start`

**Purpose**
- CRM থেকে agent → customer কল initiate করা

**Request JSON**
```json
{
  "agent_extension": "201",
  "agent_id": "A102",
  "customer_number": "017XXXXXXXX",
  "caller_id": "TrustCart",
  "call_type": "outbound",
  "crm_call_id": "CRM-CALL-987654"
}
```

**Behavior in TrustCart**
- `telephony_calls` টেবিলে একটি outbound row তৈরি হয়
- Bracknet API credentials না থাকলে **mock mode** response দেয় (যাতে UI/dev testing block না হয়)
- `crm_call_id` যদি numeric হয় (যেমন `"123"`) তাহলে সেটাকে CRM task id হিসেবে ধরে link করে

**Response JSON (Typical)**
```json
{
  "status": "success",
  "bracknet_call_id": "BN-CALL-456789",
  "message": "Call initiated",
  "telephonyCallId": 55
}
```

---

### 1.2 Hangup Call
**Endpoint**
- `POST /api/call/hangup`

**Request**
```json
{ "bracknet_call_id": "BN-CALL-456789" }
```

**Response**
```json
{ "status": "ended", "mode": "live" }
```

---

### 1.3 Transfer Call (Optional)
**Endpoint**
- `POST /api/call/transfer`

**Request**
```json
{
  "bracknet_call_id": "BN-CALL-456789",
  "transfer_extension": "301"
}
```

**Response**
```json
{ "status": "success", "mode": "live" }
```

---

## 2) Bracknet → CRM (Webhook Events)

TrustCart এ event-wise endpoints implement করা হয়েছে যাতে Bracknet team সহজে hook করতে পারে।

### 2.1 Incoming Call Event
**Endpoint (CRM side)**
- `POST /api/webhook/bracknet/incoming-call`

**Payload**
```json
{
  "event": "incoming_call",
  "from": "017XXXXXXXX",
  "to_extension": "201",
  "bracknet_call_id": "BN-CALL-111222",
  "timestamp": "2026-01-03T10:30:00Z"
}
```

**CRM Action (বর্তমান)**
- `telephony_calls` এ inbound record তৈরি হয়
- (Future) realtime screen-pop / websocket push

---

### 2.2 Call Answered
**Endpoint**
- `POST /api/webhook/bracknet/call-answered`

**Payload**
```json
{
  "event": "call_answered",
  "bracknet_call_id": "BN-CALL-456789",
  "agent_extension": "201",
  "timestamp": "2026-01-03T10:30:10Z"
}
```

**CRM Action**
- call status `answered`
- `answeredAt` সেট হয়

---

### 2.3 Call Ended
**Endpoint**
- `POST /api/webhook/bracknet/call-ended`

**Payload**
```json
{
  "event": "call_ended",
  "bracknet_call_id": "BN-CALL-456789",
  "duration": 135,
  "end_reason": "completed",
  "timestamp": "2026-01-03T10:32:25Z"
}
```

**CRM Action**
- call status `completed`
- duration সেট হয়
- যদি call টি কোনো CRM task এর সাথে linked থাকে, task notes এ telephony summary append হয়

---

### 2.4 Call Recording Ready
**Endpoint**
- `POST /api/webhook/bracknet/call-recording`

**Payload**
```json
{
  "event": "call_recording_ready",
  "bracknet_call_id": "BN-CALL-456789",
  "recording_url": "https://bracknet.com/records/BN-CALL-456789.mp3",
  "recording_duration": 135
}
```

**CRM Action**
- `telephony_calls.recording_url` সেভ হয়

---

### 2.5 Missed Call
**Endpoint**
- `POST /api/webhook/bracknet/call-missed`

**Payload**
```json
{
  "event": "call_missed",
  "from": "017XXXXXXXX",
  "to_extension": "201",
  "timestamp": "2026-01-03T11:05:00Z"
}
```

**CRM Action (Implemented)**
- CRM এ একটি `crm_call_tasks` pending task তৈরি হয় (reason: `missed_call`)
- Duplicate avoid করা হয় (একই customer+reason pending থাকলে নতুন তৈরি হয় না)

---

## 3) One-shot Webhook (Backward Compatible)
আগের endpoint এখনও আছে:
- `POST /api/telephony/webhook/bracknet`

যদি Bracknet team event-wise endpoints না করে এক endpoint-এ সব পাঠায়, এই generic receiver কাজ করবে।

---

## 4) DB Schema (Call Log)
Telephony call log টেবিল:
- `telephony_calls`

Core fields:
- `external_call_id` (Bracknet call id)
- `customer_phone`
- `agent_phone` (extension/store করা হয়)
- `status`, `answered_at`, `ended_at`, `duration_seconds`, `recording_url`
- `meta` (raw payload/debug)

---

## 5) Security Rules (Recommended)
বর্তমান implementation ন্যূনতম নিরাপদ রাখা হয়েছে, কিন্তু production-এর জন্য strongly recommend:
- HTTPS only
- Bracknet → CRM webhook IP allowlist
- Webhook signature verification (HMAC-SHA256)
- Replay protection via timestamp/nonce

> Signature scheme Bracknet spec অনুযায়ী finalize করতে হবে, এরপর backend-এ strict verify যোগ করা হবে।

---

## 6) Bracknet Config (ENV)
Backend env vars:
- `TELEPHONY_PROVIDER=bracknet`
- `BRACKNET_API_BASE_URL=...`
- `BRACKNET_API_KEY=...`
- `BRACKNET_WEBHOOK_SECRET=...` (future signature verify)

Mock mode behavior:
- baseUrl/apiKey না থাকলে call control endpoints successful response দেয় কিন্তু external call initiate করে না

---

## 7) Implementation Notes (TrustCart Code)
Backend files:
- `backend/src/modules/telephony/telephony.service.ts`
  - `bracknetStartCall()`
  - `bracknetHangup()`
  - `bracknetTransfer()`
  - `handleBracknetEvent()`
- `backend/src/modules/telephony/bracknet-contract.controller.ts`
  - `/api/call/*`
  - `/api/webhook/bracknet/*`

---

## 8) Quick Testing (Curl)

### Start call
```bash
curl -X POST "http://localhost:3000/api/call/start" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"agent_extension":"201","agent_id":"A102","customer_number":"01700000000","caller_id":"TrustCart","call_type":"outbound","crm_call_id":"CRM-CALL-987654"}'
```

### Webhook call ended
```bash
curl -X POST "http://localhost:3000/api/webhook/bracknet/call-ended" \
  -H "Content-Type: application/json" \
  -d '{"event":"call_ended","bracknet_call_id":"BN-CALL-456789","duration":135,"end_reason":"completed"}'
```

---

## 9) Next Improvements (If you want)
- Webhook → WebSocket push: Agent UI তে realtime ringing/connected/ended
- Incoming call screen-pop: phone number match করে customer profile open
- Recording playback button in UI
- Signature verification finalize
