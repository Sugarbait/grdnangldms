# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Guardian Angel DMS is a secure digital legacy management system that automatically triggers a protocol to distribute sensitive information to designated recipients when a user's check-in timer expires (inactivity-based dead man's switch). The application combines a React frontend with a Convex backend, Tailwind CSS for styling, and Nodemailer for email distribution.

**Key Mission**: When a timer expires after user inactivity, the system automatically sends configured files to designated recipients via email.

## Architecture

### Frontend (React + Vite)
- **Entry Point**: `index.tsx` → `App.tsx` (main router and state management)
- **Pages** (`/pages`): Core user-facing routes - Dashboard, Vault, Recipients, Settings, UploadWizard, AddRecipient, ProtocolActive, Login, Terms, Privacy
- **Components** (`/components`): Reusable UI - Layout, AudioPlayer
- **Styling**: Tailwind CSS via CDN with custom dark theme colors (primary blue: `#1754cf`)
- **Icons**: Material Symbols Outlined (Google Fonts)

### Backend (Convex)
Convex provides a serverless backend with real-time database, API generation, and scheduled jobs.

**Key Files**:
- `schema.ts`: Database schema defining tables (users, files, recipients, timers)
- `timer.ts`: Timer query/mutations for countdown logic and triggering
- `emails.ts`: Email action handler triggered when timer expires
- `emailHelpers.ts`: Internal queries/mutations for email workflow
- `fileStorage.ts`: Convex file storage operations (separate from database)
- `files.ts`, `recipients.ts`, `users.ts`: CRUD operations for core entities
- `cronHandler.ts`, `crons.ts`: Scheduled job coordination

## Critical Timer & Protocol System

### Timer Countdown Architecture
The timer uses a **hybrid client-server approach** to maintain accuracy across page refreshes and network latency:

1. **Server Side** (`timer.ts`):
   - Stores `lastReset` (timestamp when timer started)
   - `durationSeconds` (total countdown duration)
   - Calculates `remaining = durationSeconds - (Date.now() - lastReset) / 1000`
   - Status tracks: `"active"`, `"triggered"`, or `"stopped"`
   - `stop()` mutation sets status to `"stopped"` and clears `lastReset`

2. **Client Side** (`App.tsx`):
   - Queries server every render to get `remainingSeconds`
   - Calculates elapsed time locally: `elapsed = Date.now() - serverRefreshTime`
   - Display uses: `displaySeconds = remainingSeconds - elapsed`
   - **Critical**: When syncing from server, set `serverRefreshTime = Date.now() - (elapsedOnServer * 1000)` to ensure countdown continues from correct position after page refresh
   - **Session Management**: 15-minute inactivity timeout enforced even across page refreshes. Session stored in localStorage with keys `guardian_user_id` (user ID) and `guardian_session_expires_at` (expiration timestamp). On page load, session is validated against expiration time. On inactivity (no user interaction), session expires after 15 minutes and user is logged out. Activity extends session automatically.

3. **Trigger Threshold** (`timer.ts` line 61):
   - Trigger occurs when `remaining <= 2` (not `<= 0`) to handle 2-second client-server timing window
   - Client determines trigger locally when countdown reaches 0, then calls `checkAndTrigger` mutation
   - This asymmetry accounts for network latency and local countdown precision

4. **Stop Button** (Dashboard):
   - Users can stop the active timer by clicking the "Stop Timer" button
   - Calls `timer.stop()` mutation which sets status to `"stopped"`
   - Dashboard displays remaining time as 00:00:00:00 when stopped

### Emergency Protocol Flow
1. **Client Countdown Reaches 0**: `App.tsx` sets `localTriggerState = true`
2. **Protocol Activates**: ProtocolActive page displays
3. **Server Trigger Confirmation**: `checkAndTrigger` mutation verifies and updates timer status to `"triggered"`
4. **Email Queue**: Background cron jobs detect triggered timer and send emails
5. **File Distribution**: Recipients with assigned files receive emails with their items

## File Management & Encryption

### Message Encryption
- **Client-side encryption**: Messages encrypted with CryptoJS using user's encryption key
- **Dual storage**: Each message stores both:
  - `content`: Encrypted version (for client-side viewing in vault)
  - `plaintext`: Unencrypted original (for email delivery to recipients)
- **isEncrypted flag**: Accurately tracks whether content was actually encrypted (not just marked as encrypted)

### Email Content Handling
- **Recipient Files**: Only recipients with assigned files receive emails (empty recipient lists are skipped)
- **Email Format**: Monotone, professional layout without colorful emojis
- **Multi-file support**: Recipients can receive messages, images, audio files, and documents in single email

### File Types & Storage
- **Audio files**: Uploaded to Convex file storage, referenced via `audioStorageId`
- **Images**: Stored in Convex file storage, embedded as base64 in emails via `imageStorageId`
- **Documents/PDFs**: Stored in Convex file storage, sent as download links via `documentStorageId`
- **Messages**: Stored as text with optional encryption, encrypted version in `content`, plaintext in `plaintext`

## Development Workflow

### Setup
```bash
npm install
# Ensure .env.local has VITE_CONVEX_URL pointing to your Convex deployment
npm run dev  # Runs on http://localhost:3000 (or 3001 if 3000 is in use)
```

### Common Commands
```bash
npm run dev      # Start development server on http://localhost:3000
npm run build    # Build for production
npm run preview  # Preview production build locally
npx convex dev    # Sync Convex functions to dev deployment (requires login)
npx convex deploy --yes  # Deploy to production (non-interactive)
npx convex logs --prod --history 50  # View recent production logs
```

### Build & Deployment
- Frontend: Uses Vite for fast dev server and optimized builds
- Backend: Convex handles serverless function deployment
- Both production and localhost:3000 can use same Convex deployment (production database)
- After backend changes, redeploy with `npx convex deploy --yes` to update validators

### Testing Timer Logic
1. Set custom duration in Settings (e.g., 1 minute for quick testing)
2. Click "Check In" on Dashboard to reset timer
3. Wait for timer to expire (display reaches 00:00)
4. Verify email recipients receive files (requires SMTP configured in .env.local)

### Testing Email System
- Recipients must have files assigned to receive emails
- Check Convex production logs for email send status: `npx convex logs --prod`
- SMTP credentials must be set: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- Emails include unencrypted plaintext messages and download links for files

## Key Technical Patterns

### Convex Patterns
- **Queries**: Read-only, real-time subscriptions, used with `useQuery(api.module.function, args)`
- **Mutations**: Write operations, used with `useMutation(api.module.function)`
- **Actions**: Node.js environment, can use npm packages (e.g., nodemailer, @google/genai), used with `useAction(api.module.function)`
- **Internal Queries/Mutations**: Helper functions prefixed with `internal`, accessed via `ctx.runQuery/runMutation`

### React Hooks Usage
- `useQuery`: Subscribes to real-time query data
- `useMutation`: Returns async function for mutations
- `useAction`: Returns async function for actions
- Local state for UI-only values (e.g., `showModal`, `displaySeconds`)

### File Storage
- **Convex Files Table**: Stores metadata (name, size, type, recipientIds)
- **Convex File Storage**: Separate storage for binary files (up to 1 MiB per document limit)
- **Upload Pattern**: Client generates signed URL via `generateUploadUrl` action, uploads blob directly from browser, receives `storageId`, saves to database
- **Retrieval**: Use storage IDs to get URLs for email links or embedding

### Recipient ID Type Handling
- **Critical**: Recipient IDs may be either Convex ID objects or strings depending on context
- When comparing recipient IDs: `typeof id === 'string' ? id : id.toString()`
- When selecting recipients in UI: Always convert ID to string before checking array inclusion
- **Common Issue**: Edit modal recipient checkboxes won't show selected state without proper type conversion

### State Synchronization
- Authentication stored in `localStorage` with key `guardian_user_id`
- Timer syncs server data to local countdown on every query update
- Protocol state is local first (client countdown) with server confirmation via mutation
- **Robust session handling**: App waits for 5 consecutive null checks (15+ seconds) before logging out - prevents logout during server restarts/code changes

## Database Schema

### users
- `name`, `email`, `password`, `avatarUrl`, `lastCheckIn` (timestamp)
- Index: `by_email`

### timers
- `userId`, `status` ("active" or "triggered"), `durationSeconds`, `lastReset`
- `emailsSentAt`, `reminderSentAt`: Timestamps preventing duplicate emails
- `reminderSeconds`: Optional pre-expiry reminder threshold
- Indexes: `by_user`, `by_status`

### files
- `userId`, `name`, `size`, `type`, `recipientIds` (array of strings)
- `content`: Encrypted text or data
- `plaintext`: Unencrypted plaintext for messages (used in emails)
- `audioStorageId`, `imageStorageId`, `documentStorageId`: References to Convex file storage
- `isEncrypted`: Accurately reflects if content was actually encrypted
- `addedDate`: User-friendly date string

### recipients
- `userId`, `name`, `relationship`, `email`, `phone`, `avatarUrl`, `status`
- `canTriggerCheckIn`: Boolean allowing recipient to reset timer via email link
- `checkInAuthToken`, `checkInAuthTokenExpiry`: Token for authenticated check-in
- Index: `by_user`

## Common Issues & Solutions

### Messages Won't Save in Upload Wizard
**Problem**: "Server Error" when trying to save messages to vault
**Solution**:
- Ensure `files.ts` mutation accepts `plaintext` field in args validation
- Check that `isEncrypted` flag is set correctly (only true if encryption actually happened)
- Verify Convex deployment is up-to-date: `npx convex deploy --yes`

### Recipients Not Selected in Edit Modal
**Problem**: Can't select/deselect recipients when editing files
**Solution**:
- Check `toggleRecipient` function converts ID to string: `typeof id === 'string' ? id : id.toString()`
- Verify checkbox comparisons use `tempRecipientIds.includes(typeof r._id === 'string' ? r._id : r._id.toString())`
- This is a common issue due to Convex ID object vs string type mismatch

### Audio/Image Recipients Not Receiving Emails
**Problem**: Second recipient doesn't get email even though file assigned to both
**Solution**:
- Verify `recipientIds` array in file payload contains both recipient IDs as strings
- Check email handler doesn't skip recipients - must have `if (recipientFiles.length === 0) continue;` to skip only empty recipients
- Recipient IDs must match exactly between files table and filtering logic

### Recipient Logout on Server Restart
**Problem**: User gets logged out when dev server restarts
**Solution**: Fixed - App now waits for 5 consecutive failed user lookups before logging out (15+ second window for reconnection). No action needed unless using older version.

### Email Attachment Missing/Corrupted
**Problem**: Recipients don't receive audio or image files
**Solution**:
- Verify file has proper `audioStorageId`, `imageStorageId`, or `documentStorageId`
- Check SMTP configuration in Convex .env.local
- Review production logs: `npx convex logs --prod`
- For audio: Ensure client upload completed before file save

### Timer Resets on Page Refresh
**Problem**: Timer count jumps back to start duration
**Solution**: Ensure `serverRefreshTime` is set correctly when syncing: `serverRefreshTime = Date.now() - (elapsedOnServer * 1000)`

### Files Not Sending on Second Timer Test
**Problem**: No email on subsequent timer expirations
**Solution**: Clear `emailsSentAt` and `reminderSentAt` flags when resetting timer

### Client-Server Timing Mismatch
**Problem**: Client countdown reaches 0 but server trigger fails
**Solution**: Trigger threshold is `remaining <= 2` to allow 2-second window for network variance

## Styling & UI

- **Tailwind CDN**: Loaded via `index.html` script tag, includes forms and container-queries plugins
- **Dark Theme**: Hardcoded in HTML `<html class="dark">`, uses custom dark colors
- **Custom Colors**:
  - Primary: `#1754cf` (blue)
  - Background: `#0f1115`
  - Surface: `#1a1d24`, `#14161b` (darker)
  - Accent: `#F59E0B` (amber)
- **Material Symbols**: Used for icon buttons throughout (size typically `text-[10px]` for spinner arrows, `text-xl` for navigation)
- **Custom Animations**: Pulse ring effect for active timer display (`pulse-ring` class with keyframe animation)

### Responsive Design
- Uses Tailwind breakpoints for mobile/tablet/desktop layouts
- Mobile-specific considerations:
  - Avoid fixed bottom floating buttons (not visible on small screens)
  - Use header buttons for main actions instead
  - Test responsive previews at different heights (70vh for PDFs may be too large on mobile)

### Input Fields with Custom Arrows
- Number inputs use `[appearance:textfield]` to hide browser spinners
- Custom Material Symbols buttons overlay via absolute positioning
- Arrow positioning: `right-2 top-[1.875rem]` for consistent vertical alignment

### Email Design
- Monotone, professional layout without colorful emojis
- Section headers use uppercase gray text (`color: #374151`)
- Download buttons use primary blue (`#1754cf`) for call-to-action
- Recipient info box at top with gradient background

## Environment Variables

### Frontend (.env.local)
- `GEMINI_API_KEY`: For Google Generative AI features
- `VITE_CONVEX_URL`: Convex deployment URL (auto-generated by Convex CLI, points to production or dev)

### Backend (Convex .env.local, server-only)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Email delivery via Nodemailer
- Any other sensitive credentials for background actions

## Important Notes

1. **Convex Deployment Sync**: After any schema or function changes, redeploy with `npx convex deploy --yes` - validators don't auto-update
2. **File Size Limits**: Convex documents max 1 MiB; larger files use separate storage system
3. **Email SMTP**: Ensure from address and SMTP credentials match provider requirements (e.g., Hostinger)
4. **Timestamps**: All use `Date.now()` (milliseconds UTC), no timezone conversions needed
5. **Cron Jobs**: Scheduled via `crons.ts`, check `cronHandler.ts` for background logic
6. **Reminder Emails**: Triggered when `remaining <= reminderSeconds && remaining > 0`
7. **Type Safety**: Always convert Convex ID objects to strings when comparing with string arrays
8. **Recipients & Emails**: Only recipients with assigned files receive emails - this is intentional to avoid spam
