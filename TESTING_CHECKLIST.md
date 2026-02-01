# Testing Checklist: Timer & Email Fixes

## Pre-Testing Setup

### 1. Deploy Changes
```bash
# Update dependencies
npm install

# Deploy Convex backend changes
npx convex deploy

# Or use dev mode for testing
npx convex dev
```

### 2. Environment Verification
- [ ] `.env.local` has `VITE_CONVEX_URL` set correctly
- [ ] `.env.local` has `VITE_OAUTH_GOOGLE_CLIENT_ID` (if using OAuth)
- [ ] `.env.local` has `VITE_OAUTH_MICROSOFT_CLIENT_ID` (if using OAuth)
- [ ] Backend has `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` configured
- [ ] Test SMTP credentials are correct (verify in email provider settings)

### 3. Browser Preparation
- [ ] Clear browser cache
- [ ] Clear localStorage: `localStorage.clear()` in console
- [ ] Close any open sessions
- [ ] Use incognito/private window if possible

---

## Test 1: Timer Trigger Accuracy

### 1A: One-Minute Timer Test (Fast Feedback)
**Duration:** ~2 minutes total

```
[ ] Open app, log in
[ ] Go to Settings
[ ] Change timer duration to 60 seconds
[ ] Go to Dashboard
[ ] Click "Check In" to reset timer
[ ] Watch countdown
    - Should go: 1:00 → 0:59 → 0:58 ... → 0:01 → 0:00
    - Should NOT jump to 0:49 or similar
[ ] At exactly 0:00, should trigger to ProtocolActive page
[ ] Verify logs: Browser console should show "[TIMER] Client countdown reached 0"
```

**Expected Result:** Timer triggers exactly at 0:00, not early.

**If Timer Triggers Early:**
1. Check browser console for timing errors
2. Verify App.tsx has the updated `setServerRefreshTime(Date.now())` code
3. Check if there's significant clock skew between client and server
4. Try clearing localStorage and retesting

### 1B: Five-Minute Timer Test
**Duration:** ~6 minutes total

```
[ ] Go to Settings
[ ] Change timer duration to 300 seconds (5 minutes)
[ ] Go to Dashboard
[ ] Click "Check In"
[ ] Watch countdown for 5+ seconds
[ ] Verify smooth counting: should NOT jump or skip
[ ] Let it run to completion (or reduce to 1 min if impatient)
[ ] Verify triggers at 0:00
```

**Expected Result:** Smooth countdown with no jumps, triggers at 0:00.

### 1C: Page Refresh During Countdown
**Duration:** ~2 minutes total

```
[ ] Set timer to 2 minutes
[ ] Click "Check In" to start
[ ] Wait 30 seconds (should see ~1:30 remaining)
[ ] Refresh the page (Cmd+R or F5)
[ ] Countdown should resume from ~1:30 (not jump back to 2:00 or drop to 0:00)
[ ] Continue watching countdown
[ ] Verify smooth completion to 0:00
```

**Expected Result:** After refresh, timer resumes from correct position without jumping.

**If Timer Jumps:**
- This indicates the sync time calculation is still off
- Check that both lines were updated:
  - `setServerRefreshTime(Date.now())`
  - `setLastServerSeconds(timerData.remainingSeconds)`

### 1D: Long Duration Test (Optional - Verify No Regression)
**Duration:** 10+ minutes (or skip if time constrained)

```
[ ] Set timer to 1800 seconds (30 minutes)
[ ] Start countdown
[ ] Let it run for 5 minutes
[ ] Verify countdown is accurate (can check against system clock)
[ ] Verify no jumps or unexpected behavior
[ ] Cancel or wait to completion
```

**Expected Result:** Long timers work as well as short timers.

---

## Test 2: Email Attachments

### 2A: Setup Recipients and Files
**Duration:** ~5 minutes

```
[ ] Go to Recipients page
[ ] Add at least 1 test recipient:
    - Name: "Test Recipient"
    - Email: [your test email]
[ ] Go to Vault page
[ ] Upload test files:
    - One audio file (WAV, MP3, or M4A)
    - One image file (PNG or JPG)
    - One document file (PDF or similar)

    For each file:
    [ ] Assign to "Test Recipient"
    [ ] Confirm file appears with correct name and icon
```

**Expected Result:** Files uploaded and assigned successfully.

**If Files Don't Upload:**
- Check browser console for errors
- Verify Convex storage is accessible
- Check file size limits

### 2B: Check File Storage IDs
**Duration:** ~2 minutes

```
[ ] Go to Convex Dashboard
[ ] Select your deployment
[ ] Go to "Data" tab
[ ] Find "files" table
[ ] Look for your uploaded test files
[ ] Verify each file has ONE of:
    - audioStorageId (for audio files)
    - imageStorageId (for image files)
    - documentStorageId (for documents)
[ ] Note the storage ID value
```

**Expected Result:** All uploaded files have storage IDs.

**If Files Missing Storage IDs:**
- This is the attachment problem root cause
- Check upload code in Vault component
- Verify file is being saved to Convex storage before DB record

### 2C: Trigger Timer and Check Logs
**Duration:** ~3 minutes

```
[ ] Go to Convex Dashboard
[ ] Open "Logs" tab (keep this open)
[ ] Go back to app
[ ] Set timer to 1 minute (for fast testing)
[ ] Go to Dashboard
[ ] Click "Check In"
[ ] Wait for countdown to finish (~1 minute)
[ ] Check Convex logs for messages starting with "[EMAIL]"

Look for these exact messages:
[ ] "[EMAIL] Processing file: [filename]"
    - Should see this for each file
[ ] "[EMAIL] File storage IDs - audio: [id], image: none, document: none"
    - Should show the storage IDs you noted above
[ ] "[EMAIL] Retrieving audio file from storage: [id]"
    - Should appear for audio files
[ ] "[EMAIL] Successfully attached audio file: [filename] (bytes)"
    - Should show file size in bytes
```

**Expected Result:** See "Successfully attached" messages for all files.

**If No Attachment Messages:**
1. Check if email was sent at all
   - Look for "[sendNotificationEmails] Starting..."
2. Check if files were found
   - Look for "No recipients configured"
   - Or "found 0 files"
3. Check storage IDs
   - Look for "File storage IDs - audio: none, image: none, document: none"
   - This means files weren't properly assigned

### 2D: Verify Email Received
**Duration:** ~5 minutes

```
[ ] Check email inbox for "Test Recipient"
    - May take 30 seconds to 2 minutes to arrive
    - Check spam folder too
[ ] Open the email
[ ] Look for:
    [ ] Guardian Angel logo at top
    [ ] Message from "[your name]"
    [ ] "Items Assigned to You" section
    [ ] List of files (should show your 3 test files)
[ ] Check for attachments
    [ ] Email should have attachment section
    [ ] Should show 3 file names
    [ ] Should show file sizes
[ ] Download and verify each attachment:
    [ ] Audio file - can play in media player
    [ ] Image file - opens in image viewer
    [ ] Document file - opens in document reader
```

**Expected Result:** Email received with all 3 files attached and downloadable.

**If Email Missing Attachments:**
1. Check Convex logs for error messages
2. Verify SMTP credentials are correct
3. Try uploading files again with fresh storage
4. Check if SMTP provider has attachment size limits

---

## Test 3: Combined Integration Test

### Full Emergency Protocol Flow
**Duration:** ~10 minutes

```
[ ] Clear all prior test data (reset user, clear files/recipients)
[ ] Add 1-2 recipient(s) with YOUR email address
[ ] Upload 2-3 files of different types
[ ] Assign all files to recipient(s)
[ ] Go to Settings
[ ] Set timer to 60 seconds (1 minute)
[ ] Go to Dashboard
[ ] Click "Check In" to start timer
[ ] Watch countdown:
    [ ] Verify smooth countdown
    [ ] Verify no jumps or skips
    [ ] Verify reaches 0:00 exactly
[ ] Verify ProtocolActive page shows
    [ ] Large timer display at 0:00
    [ ] Emergency mode message
    [ ] Pulse animation
[ ] Check email (wait up to 2 minutes):
    [ ] Email arrives from Guardian Angel DMS
    [ ] Email has all 3 attachments
    [ ] Can download each attachment
    [ ] Email is properly formatted
```

**Expected Result:** Complete flow works: timer → trigger → email with attachments.

---

## Test 4: Error Scenarios (Optional Advanced Testing)

### Test Missing Recipient
```
[ ] Create file but don't assign to any recipient
[ ] Trigger timer
[ ] Check Convex logs
[ ] Should see: "[sendNotificationEmails] No recipients for user"
[ ] No email should be sent
```

### Test Missing Files
```
[ ] Add recipient but don't upload any files
[ ] Trigger timer
[ ] Check email
[ ] Should receive email with message: "No specific files were assigned to you"
[ ] Email should not have attachments section
```

### Test File Deleted After Assignment
```
[ ] Upload file and assign to recipient
[ ] Manually delete file from Convex Storage
[ ] Trigger timer
[ ] Check Convex logs
[ ] Should see: "[EMAIL] [filetype] file blob is null from storage"
[ ] Email might be missing that attachment or have partial attachments
```

---

## Browser Console Debugging

### Check Timer Logs
Open browser DevTools (F12) and check Console tab:

```javascript
// Should see logs like:
"[TIMER] Client countdown reached 0"
"[TIMER] checkAndTriggerTimer result: {triggered: true, timerId: '...'}"

// Should NOT see:
"[TIMER] Client countdown reached 0" at 0:49
```

### Test Current State
```javascript
// Check if timer still running
localStorage.getItem('guardian_user_id')  // Should have a user ID

// Check if synced properly
// Can't see timerData directly, but countdown display should be smooth
```

---

## Convex Dashboard Debugging

### Check Timer State
1. Go to Convex Dashboard
2. Select your deployment
3. Go to "Data" tab
4. Open "timers" table
5. Find your timer
6. Check:
   - `status` should be "triggered" after countdown
   - `remainingSeconds` should be ≤ 0
   - `emailsSentAt` should be set to a timestamp

### Check File Records
1. Open "files" table
2. For each test file:
   - [ ] Has `audioStorageId` OR `imageStorageId` OR `documentStorageId`
   - [ ] Has correct `recipientIds` array
   - [ ] `name` matches uploaded file name

### Check Storage
1. Go to "Storage" tab
2. Should see file entries
3. Verify storage IDs match what's in files table
4. File sizes should be > 0 bytes

---

## Success Criteria

### Timer Fix ✅
- [x] Countdown is smooth with no jumps
- [x] Triggers at exactly 0:00 (not 0:49)
- [x] Works with 1-minute, 5-minute, and 1-hour timers
- [x] Page refresh maintains correct time
- [x] No console errors related to timing

### Email Fix ✅
- [x] All files have storage IDs in database
- [x] Convex logs show "Successfully attached" for each file
- [x] Email received with all attachments
- [x] All attachments are downloadable and intact
- [x] Works for audio, images, and documents

---

## Rollback Instructions (If Needed)

### Revert Timer Fix
```bash
# In App.tsx, revert lines 130-141 to original:
const elapsedOnServer = timerData.durationSeconds - timerData.remainingSeconds;
const properRefreshTime = Date.now() - (elapsedOnServer * 1000);
setServerRefreshTime(properRefreshTime);
```

### Revert Email Fix
```bash
# In convex/emails.ts, remove buffer validation blocks
# (revert to original code without the size checks)
```

---

## Troubleshooting Guide

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| Timer triggers at 0:49 | Sync calculation off | Verify `setServerRefreshTime(Date.now())` is in place |
| Timer jumps after refresh | Elapsed time calculation wrong | Check both `setServerRefreshTime` and `setLastServerSeconds` |
| No email attachments | Files missing storage IDs | Re-upload files, check Convex Storage tab |
| Email arrives but no attachments | Storage blob is null | Verify file exists in Convex Storage |
| Empty attachment file | Buffer empty | Re-upload file, check for corruption |
| Logs show no file processing | No recipients assigned | Add recipients and assign files to them |
| SMTP connection error | Wrong credentials | Verify SMTP_HOST, SMTP_USER, SMTP_PASS in .env |

---

## Notes for Future Testing

- After first successful test, subsequent tests should be faster
- Can skip full cleanup between tests (use different recipient emails)
- Consider creating a separate test account for regular testing
- Save successful logs for comparison with future issues
