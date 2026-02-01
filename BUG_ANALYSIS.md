# Bug Analysis: Timer Trigger & Email Attachments

## Issue 1: Timer Going into Emergency Mode at 0:49 (Early Trigger)

### Problem Description
The timer enters "emergency mode" (ProtocolActive page) approximately 11 seconds early at 0:49 instead of waiting until 0:00.

### Root Cause Analysis

**The Problem is in the Client-Server Synchronization Logic**

The issue stems from how the client calculates the "proper refresh time" when syncing with the server:

**File:** `App.tsx` lines 140-142
```typescript
const elapsedOnServer = timerData.durationSeconds - timerData.remainingSeconds;
const properRefreshTime = Date.now() - (elapsedOnServer * 1000);
setServerRefreshTime(properRefreshTime);
```

**Why This Causes Early Trigger:**

1. **What the code does:**
   - Gets elapsed time from server: `elapsedOnServer = duration - remaining`
   - Sets `serverRefreshTime` to simulate when the timer started
   - The countdown interval then calculates: `newDisplay = Math.max(0, lastServerSeconds - elapsedSeconds)`

2. **The timing issue:**
   - When you query the server at 0:49 remaining, there's a small delay between:
     - Server calculating `remaining` time
     - Client receiving that data
   - During this delay (milliseconds), the actual remaining time decreases
   - Client receives server data saying "49 seconds remaining" but 200ms have passed
   - Client's calculated `properRefreshTime` is slightly off by 200ms
   - The interval then counts down from 49 seconds, but since the clock was set slightly ahead, it hits 0 before actual 0:00

3. **Cascading effect:**
   - 100ms interval updates + network latency + calculation lag
   - Results in ~10-12 seconds of accumulated error
   - Timer triggers at 0:49 instead of 0:00

### Visual Timeline

```
Server State:     0:49  0:48  0:47  0:46  0:45 ...
                  |     |     |     |     |
Network Latency:  ~200ms delay in receiving data
                  |
Client Receives:  0:49 (but 200ms has already passed)
Client Sets:      serverRefreshTime = Now - (elapsed * 1000)
                  (calculation is off by 200ms)
                  |
Client Countdown: Starts from 49s but clock is 200ms ahead
                  Accumulates error every 100ms interval
                  |
After 11 seconds: Error accumulates to ~11 seconds
Timer Triggers:   at 0:49 instead of 0:00
```

### Why It's Not Caught in Testing

- Works fine with long timers (7 days, 1 hour) because error is negligible
- Only noticeable with short timers (under 2 minutes) where error is proportionally larger
- The server's `remaining <= 2` threshold (timer.ts line 62) masks the client's early trigger

## Issue 2: Missing Email Attachments

### Problem Description
Recipients are not receiving file attachments in notification emails, even though files are configured.

### Root Cause Analysis

**Multiple potential issues in the attachment retrieval pipeline:**

**File:** `convex/emails.ts` lines 94-198

**Possible Causes:**

1. **File Storage IDs Not Set**
   - Files must have one of: `audioStorageId`, `imageStorageId`, or `documentStorageId`
   - If all are `undefined`, the file is skipped (lines 98, 130, 162)
   - Only `file.content` (text) files are included in email body

2. **Blob Retrieval Failure**
   - `ctx.storage.get(file.audioStorageId)` might return null
   - If blob is null, warning logged but attachment skipped (lines 105, 122-124)
   - Error in try-catch caught but not propagated (lines 125-127)

3. **Buffer Conversion Issue**
   - `blob.arrayBuffer()` might fail
   - `Buffer.from(arrayBuffer)` might produce empty buffer
   - No validation that buffer has content

4. **File Not Found**
   - File recorded in database but actual file deleted from Convex storage
   - Common if storage was cleared or files expired

5. **SMTP Transporter Issue**
   - Attachment added to array but nodemailer fails to send
   - Email sent without attachments silently
   - No error thrown (covered by try-catch)

### Diagnosis Steps to Check

```typescript
// In sendNotificationEmails logs, look for:

1. "[EMAIL] Processing file: [filename]"
   - If missing: File not being processed at all
   - Check: Does file have audioStorageId, imageStorageId, or documentStorageId?

2. "[EMAIL] Retrieving audio file from storage: [storageId]"
   - If missing: File skipped due to no storage ID

3. "[EMAIL] Successfully attached [file]: [size] bytes"
   - If missing: Blob retrieval failed or error occurred

4. "[EMAIL] Audio file not found in storage: [storageId]"
   - If present: File exists in DB but not in storage

5. "[EMAIL] Total attachments for [recipient]: 0"
   - If shows 0: No attachments processed at all
   - Check network/SMTP logs for why email was sent without attachments
```

### Convex Logs Locations

Check these for debugging:
1. **Convex Dashboard** → Select Deployment → Logs
2. Filter by action: `sendNotificationEmails`
3. Look for the specific file processing logs above
4. Check for SMTP errors in transporter

---

## Solutions

### Fix 1: Timer Early Trigger (0:49 Problem)

**The Fix: Adjust client-side trigger threshold**

Instead of triggering at `newDisplay <= 0`, trigger when close to 0 but with additional buffer:

**File:** `App.tsx` line 160

**Current code:**
```typescript
if (newDisplay <= 0 && !hasTriggered) {
```

**Fixed code:**
```typescript
if (newDisplay <= 0.5 && !hasTriggered) {
```

This gives the server 0.5 seconds to verify the trigger, matching the server's `remaining <= 2` threshold philosophy.

**Alternative Fix: Server-side adjustment**

If client-side fix insufficient, also adjust server trigger threshold:

**File:** `convex/timer.ts` line 62

**Current:**
```typescript
if (remaining <= 2) {
```

**Adjusted:**
```typescript
if (remaining <= 3) {
```

This gives more window for client-server sync errors.

### Fix 2: Missing Email Attachments

**Step 1: Verify File Storage IDs are Set**

Check that files have storage IDs when uploaded:
- Audio files: should have `audioStorageId`
- Images: should have `imageStorageId`
- Documents: should have `documentStorageId`

**Step 2: Debug Attachment Processing**

Add validation to ensure files have storage:

**File:** `convex/emails.ts` line 94, add before the loop:
```typescript
console.log(`[EMAIL] DEBUG: File details: storageIds = {
  audio: ${file.audioStorageId},
  image: ${file.imageStorageId},
  document: ${file.documentStorageId}
}`);
```

**Step 3: Test File Upload**

1. Upload a test file
2. Check Convex Dashboard → Storage to verify file exists
3. Note the storage ID
4. Verify it matches the ID in files table

**Step 4: Check SMTP Configuration**

Verify `.env.local` has these set:
```
SMTP_HOST=your-smtp-host
SMTP_PORT=465
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
```

**Step 5: Re-test Email Sending**

1. Set timer to 1 minute for testing
2. Wait for expiration
3. Check Convex logs for attachment processing
4. Verify email received with attachments

---

## Verification Checklist

### For Timer Fix
- [ ] Trigger happens at 0:00 (not 0:49)
- [ ] Works with 1-minute timers
- [ ] Works with 7-day timers
- [ ] Countdown smooth without jumps

### For Email Attachments
- [ ] Files have storage IDs in database
- [ ] Convex logs show "Successfully attached" messages
- [ ] Email received with file attachments
- [ ] Recipients can download files
- [ ] Works for audio, images, and documents

---

## Recommended Implementation Order

1. **Fix timer trigger first** (simpler, immediate)
2. **Debug email attachments** (requires testing)
3. **Verify end-to-end** with complete flow
