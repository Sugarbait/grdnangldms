# Database Setup - Email Download Links

## ✅ Good News: No Migration Needed!

Your database schema is **already fully compatible** with the email download links fix. No migration or setup required!

---

## What's Already in Place

### Files Table Structure
✅ `audioStorageId` - For audio files (already defined in schema)
✅ `imageStorageId` - For image files (already defined in schema)
✅ `documentStorageId` - For document files (already defined in schema)
✅ `content` - For text-based messages (already defined in schema)
✅ `recipientIds` - For assigning files to recipients (already defined in schema)

All the fields the email system needs are already in your schema!

### Recipients Table
✅ `userId` - Links to user
✅ `email` - Where to send notifications
✅ All other fields needed for email delivery

### Timers Table
✅ `emailsSentAt` - Tracks email delivery to prevent duplicates
✅ `status` - Tracks timer state (active/stopped/triggered)
✅ All coordination fields for emergency protocol

---

## Existing Data Compatibility

### If you have existing files:

**Files uploaded before the fix:**
- They still work!
- Storage IDs were already being saved
- The new email system will use them automatically

**Files without storage IDs:**
- These are content-only files (text messages)
- They'll appear in the email as messages, not downloads
- No action needed

**New files uploaded after the fix:**
- Automatically get proper storage IDs
- Will have clickable download links in emails

---

## What to Do Before Testing

### Option 1: Test with New Files (Recommended)
1. Upload a fresh file through the app
2. This ensures proper storage ID setup
3. Assign to a recipient
4. Set short timer and test

### Option 2: Use Existing Files
1. Any existing uploaded files should work
2. The email system will try to generate links
3. If files were properly uploaded, links will work
4. Check Convex logs if files don't link

---

## Database Verification Checklist

Run this to verify your database is ready:

### In Convex Dashboard:

1. **Check Files Table**
   ```
   Go to: Tables → files
   Look for: audioStorageId, imageStorageId, documentStorageId fields
   Status: ✅ Should exist and be optional
   ```

2. **Check Recipients Table**
   ```
   Go to: Tables → recipients
   Look for: email field with recipient email addresses
   Status: ✅ Should exist and be populated
   ```

3. **Check Timers Table**
   ```
   Go to: Tables → timers
   Look for: status field with values like "active", "triggered"
   Status: ✅ Should exist for your user
   ```

### Sample Record Structure (for reference)

**File Record Example:**
```json
{
  "_id": "file_123",
  "userId": "user_456",
  "name": "Family_Recording.mp3",
  "type": "audio",
  "audioStorageId": "storage_abc789",
  "imageStorageId": null,
  "documentStorageId": null,
  "recipientIds": ["recipient_001", "recipient_002"],
  "content": null,
  "addedDate": "2024-01-15",
  "isEncrypted": true
}
```

**Recipient Record Example:**
```json
{
  "_id": "recipient_001",
  "userId": "user_456",
  "name": "John Doe",
  "email": "john@example.com",
  "relationship": "Brother",
  "status": "active"
}
```

**Timer Record Example:**
```json
{
  "_id": "timer_789",
  "userId": "user_456",
  "status": "active",
  "durationSeconds": 604800,
  "lastReset": 1705315200000,
  "emailsSentAt": null
}
```

---

## Ready to Test?

✅ Your database is fully compatible
✅ No migrations needed
✅ No schema changes required
✅ Everything is ready to go!

### Next Steps:
1. Upload a test file
2. Assign to a recipient
3. Set timer to 1 minute
4. Wait for expiration
5. Check email for download links
6. Monitor Convex logs for diagnostics

---

## Troubleshooting Database Issues

If something seems wrong:

### "I don't see storage IDs in existing files"
- These are old files that used different storage method
- **Fix**: Upload new files through the app - they'll have proper storage IDs
- Old files can still be downloaded through the app, just won't email as attachments

### "Recipient email is empty"
- **Fix**: Go to Recipients page and verify emails are saved
- Save again if needed before testing

### "Timer status is not updating"
- **Fix**: Check that your user has a timer record in the timers table
- Dashboard automatically creates timers for new users
- If missing, creating a new user will generate one

---

## No Action Required ✅

**Everything is ready!** Your database schema includes all required fields:

- ✅ Storage ID fields (audio, image, document)
- ✅ Recipient assignment fields
- ✅ Timer tracking fields
- ✅ Email delivery tracking fields

You can proceed directly to testing without any database setup or migration. The email download links will work immediately with your existing data!

---

## Questions?

If you encounter database-related issues during testing:
1. Check Convex Dashboard logs for errors
2. Verify file storage IDs exist in the files table
3. Ensure recipients have valid email addresses
4. Verify timer status is "triggered" when testing protocol

All diagnostic information is logged in Convex - check there first!
