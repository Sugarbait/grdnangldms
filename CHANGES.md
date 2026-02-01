# Guardian Angel DMS - Recent Changes Documentation

## Overview
This document outlines all changes made to the Guardian Angel DMS application, including UI improvements, bug fixes, and new features.

---

## 1. Password Reset Flow Enhancement

### Changes Made
- **File**: `pages/Login.tsx`
- **New Mode Added**: `reset-sent` authentication mode

### What Changed
Previously, when users clicked "Send Reset Email", they were immediately redirected back to the login screen with a brief success message. Now, users see a dedicated confirmation screen with clear next steps.

### Features Added
- **Confirmation Screen**: Displays "Email Sent!" with the recipient's email address
- **Next Steps Guide**: Shows 4-step instructions on how to reset their password
- **Resend Option**: Users can click "Try again" to resend the reset email if needed
- **Security Note**: Displays 1-hour expiration notice for reset links

### User Flow
1. User enters email and clicks "Send Reset Email"
2. Modal displays confirmation with next steps
3. User can either:
   - Click "Back to Sign In" to return to login
   - Click "Try again" to resend the reset email

---

## 2. Password Reset Page - Eye Icon Centering Fix

### Changes Made
- **File**: `pages/ResetPassword.tsx`
- **Lines**: 127-145

### What Changed
The visibility toggle eye icon was misaligned in the password input field. It was positioned too low using a hardcoded `top-[2.25rem]` value.

### Solution
Changed from absolute positioning to flexbox centering:
```typescript
// Before
<div className="relative">
  {/* input */}
  <button className="absolute right-3 top-[2.25rem]">
    {/* eye icon */}
  </button>
</div>

// After
<div className="relative flex items-center">
  {/* input */}
  <button className="absolute right-3">
    {/* eye icon */}
  </button>
</div>
```

### Result
Eye icon is now perfectly centered vertically within the input field.

---

## 3. File Preview and Edit Modal System

### Changes Made
- **File**: `pages/Vault.tsx`
- **Major Refactor**: Preview modal now comes before edit modal

### What Changed
Users now preview files before editing, providing better UX flow.

### Features
- **Click Item** → Preview modal opens (shows file preview)
- **Click "Edit Details"** → Edit modal opens (manage name and recipients)
- **Click "Close"** → Return to vault list

### Preview Supports
- **Images**: Full image display
- **PDFs**: Embedded viewer with toolbar
- **Audio**: Audio player with controls
- **Notes**: Text content with decryption support (if encrypted)
- **Documents**: Download link (preview not available)

---

## 4. File Renaming Feature

### Changes Made
- **Backend**: `convex/files.ts` - New `rename` mutation added
- **Frontend**: `pages/Vault.tsx` - Rename input field in edit modal

### What Changed
Users can now rename any file type (audio, images, documents, messages).

### How It Works
1. Click on item in vault
2. Click "Edit Details" in preview modal
3. Edit the "File Name" field at the top
4. Adjust recipients if needed
5. Click "Save Changes"
6. Both name and recipient changes save together

### Backend Implementation
```typescript
// New mutation in convex/files.ts
export const rename = mutation({
  args: { fileId: v.id("files"), newName: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, { name: args.newName });
  },
});
```

---

## 5. Save Changes UI Improvements

### Changes Made
- **File**: `pages/Vault.tsx`
- **Lines**: 55-57 (new state), 176-203 (enhanced save logic), 324-342 (button updates)

### What Changed
"Save Changes" button now provides clear feedback during save operations.

### Features Added
- **Loading State**: Button shows "Saving..." with hourglass icon while processing
- **Disabled State**: Both Delete and Save buttons are disabled during save
- **Error Display**: Error messages appear above buttons if save fails
- **Error Recovery**: Users can fix issues and try again

### User Experience
```
Before Click:        During Save:         After Success:
[Delete] [Save] →   [Delete] [Saving...] → Modal closes
                                           File updated
```

If error occurs:
```
[Error message shown]
[Delete] [Save Changes] → User can fix and retry
```

---

## 6. File Encryption Removal from Email

### Changes Made
- **File**: `convex/emails.ts`
- **Lines**: 141-152 (message content), various logging additions

### What Changed
Files are no longer sent with encryption barriers in emails. Recipients receive files immediately accessible without needing decryption keys.

### What This Means
- **Text Content**: Sent plaintext in email body (no encryption message)
- **Audio/Images**: Attached directly without encryption wrapper
- **Documents**: Available for immediate download
- **Overall**: Removed complexity for recipients, better UX

### Code Change
```typescript
// Before
const contentDisplay = f.isEncrypted
  ? `<em>[Encrypted content - recipient needs password to decrypt]</em>`
  : f.content;

// After
// All content sent unencrypted for accessibility
const contentDisplay = f.content;
```

---

## 7. Emergency Protocol File Attachment Fix

### Changes Made
- **File**: `convex/emails.ts`
- **Lines**: 69-126 (recipient file filtering and attachment logic)

### What Changed
Fixed critical bug where files weren't being attached to emergency protocol emails.

### The Issue
- `recipientIds` are stored as **strings** in the database
- Code was comparing them to `recipient._id` (object)
- Recipients weren't being matched, so no files were sent

### The Solution
Convert recipient IDs to strings before comparison:
```typescript
// Before
const recipientFiles = files.filter((f) =>
  f.recipientIds.includes(recipient._id)  // Wrong type comparison
);

// After
const recipientIdString = recipient._id.toString();
const recipientFiles = files.filter((f) =>
  f.recipientIds.includes(recipientIdString)  // Correct type match
);
```

### Enhanced Logging
Added detailed logging showing:
- Which recipients receive which files
- File storage IDs (audio, image)
- File content types
- Recipient matching details

---

## 8. Audio Player Preview Fix

### Changes Made
- **File**: `pages/Vault.tsx`
- **Lines**: 517-545 (audio preview section)

### What Changed
Audio player in preview modal now works with both legacy and modern audio storage formats.

### The Issue
- Audio files were stored in legacy `audioData` (base64) format
- Preview modal only checked for `audioStorageId` (modern format)
- Audio showed "No audio file attached" in preview

### The Solution
Added fallback support:
```typescript
{previewUrl ? (
  <AudioPlayer src={previewUrl} />                    // Modern format
) : previewingFile.audioData ? (
  <AudioPlayer src={previewingFile.audioData} />      // Legacy format
) : previewingFile.audioStorageId ? (
  <p>Loading audio...</p>                              // Loading state
) : (
  <p>No audio file attached</p>                        // No file
)}
```

### Result
- Legacy audio files play immediately
- New audio files stream from Convex storage
- Clear loading and error states

---

## 9. Button Label Clarity

### Changes Made
- **File**: `pages/Vault.tsx`
- **Line**: 524

### What Changed
Renamed preview modal button from "Edit Access" to "Edit Details"

### Why
- "Edit Access" was ambiguous - users weren't sure what they could edit
- "Edit Details" clearly indicates file name and recipient management
- Better aligns with actual modal functionality

---

## 10. Convex Backend Deployment

### Changes Made
- **Executed**: `npx convex dev`

### What This Did
- Synchronized new `rename` mutation to Convex backend
- Made `files.rename` function available to frontend
- Enabled file renaming functionality across the application

### Required for Production
When deploying to production, run: `npx convex deploy`

---

## Deployment Checklist

### Development Environment
- [x] Run `npx convex dev` to sync backend mutations
- [x] Frontend build passes (`npm run build`)
- [x] All features tested locally

### Production Deployment
- [ ] Run `npx convex deploy` to sync Convex backend
- [ ] Run `npm run build` for production build
- [ ] Test password reset flow
- [ ] Test file previews and renaming
- [ ] Test emergency protocol with file attachments
- [ ] Verify audio files play in preview

---

## Testing Guide

### Password Reset Flow
1. Click "Forgot?" on login page
2. Enter email and click "Send Reset Email"
3. Verify "Email Sent!" screen appears with next steps
4. Check email for reset link (or test inbox)
5. Click reset link and set new password
6. Verify redirect to login
7. Login with new password

### File Management
1. Upload or select an audio file, image, document, or message
2. Click on item in vault
3. Verify preview modal displays correctly:
   - **Images**: Show image preview
   - **Audio**: Play button works, can seek through audio
   - **Documents**: Show download link or PDF viewer
   - **Notes**: Show text content
4. Click "Edit Details"
5. Edit file name
6. Change recipients (optional)
7. Click "Save Changes"
8. Verify button shows "Saving..." state
9. Verify modal closes after save
10. Verify changes persisted in vault list

### Emergency Protocol
1. Set timer to expire (or manually test)
2. Verify timer expires
3. Check that recipients receive emails
4. Verify file attachments are included
5. Verify files open without decryption barriers

---

## Files Modified Summary

| File | Lines Changed | Type | Purpose |
|------|--------------|------|---------|
| `pages/Login.tsx` | +71 lines | Feature | Password reset confirmation screen |
| `pages/ResetPassword.tsx` | 127-145 | Fix | Eye icon centering |
| `pages/Vault.tsx` | Major refactor | Feature | Preview/edit flow, renaming, audio fixes |
| `convex/files.ts` | +8 lines | Feature | File rename mutation |
| `convex/emails.ts` | ~100 lines | Enhancement | File attachment & encryption fixes |

---

## Known Limitations & Notes

1. **Audio Format**: Legacy `audioData` (base64) still supported, but new uploads use `audioStorageId` (modern Convex storage)
2. **File Encryption**: Files are sent unencrypted in emergency emails for accessibility
3. **Preview Loading**: Audio/PDF previews require successful `getFileUrl` call to Convex file storage
4. **Rename Requires Deployment**: New `files.rename` mutation requires `npx convex dev` or `npx convex deploy`

---

## Version Information
- **Build Date**: January 30, 2026
- **Frontend Framework**: React + TypeScript + Vite
- **Backend**: Convex with Node.js actions
- **Styling**: Tailwind CSS with dark theme
- **Icons**: Google Material Symbols

---

## Future Improvements
- Implement proper TOTP verification (currently accepts any 6-digit code)
- Add image compression before email attachment
- Implement file versioning
- Add file organization/folders
- Enhanced error recovery UI
- Bulk file operations (rename, delete, share)
