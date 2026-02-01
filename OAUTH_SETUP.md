# OAuth Setup Guide for Guardian Angel DMS

This guide walks you through setting up Google and Microsoft OAuth authentication for the Guardian Angel DMS application.

## Overview

The OAuth implementation allows users to sign in using their Google or Microsoft accounts instead of (or in addition to) email/password authentication. OAuth users have encryption keys automatically generated server-side for secure file management.

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Choose "Web application"
   - Add authorized JavaScript origins:
     - `http://localhost:3000` (for development)
     - `http://localhost:5173` (for Vite dev server)
     - Your production domain
   - Add authorized redirect URIs:
     - `http://localhost:3000` (for development)
     - `http://localhost:5173` (for Vite dev server)
     - Your production domain
   - Click "Create"
5. Copy the **Client ID** (you'll need it in the next step)

## Step 2: Create Microsoft OAuth Credentials

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "App registrations" and click it
3. Click "New registration"
4. Enter an application name (e.g., "Guardian Angel DMS")
5. Select "Single page application (SPA)" as the platform type
6. Add redirect URIs:
   - `http://localhost:3000` (for development)
   - `http://localhost:5173` (for Vite dev server)
   - Your production domain
7. Click "Register"
8. Copy the **Application (client) ID** from the Overview page

## Step 3: Configure Environment Variables

1. Open `.env.local` in the project root
2. Add the OAuth Client IDs (obtained from steps 1 and 2):
   ```
   VITE_OAUTH_GOOGLE_CLIENT_ID=your-google-client-id
   VITE_OAUTH_MICROSOFT_CLIENT_ID=your-microsoft-client-id
   ```

## Step 4: Install Dependencies

Run the following command to install the OAuth libraries:
```bash
npm install
```

This will install:
- `@react-oauth/google` - Google OAuth integration
- `@microsoft/msal-browser` - Microsoft OAuth client
- `@microsoft/msal-react` - Microsoft OAuth React wrapper

## Step 5: Deploy Database Schema

The schema has been updated to support OAuth:
- `password` field is now optional (for OAuth users)
- Added `authProvider`, `oauthProviderId`, `oauthEmail`, `oauthName`, `oauthAvatarUrl` fields
- Added index on `oauthProviderId` for efficient lookups

Deploy the schema changes to your Convex backend:
```bash
npx convex dev
```

Or if you have a production deployment:
```bash
npx convex deploy
```

## Step 6: Start the Development Server

```bash
npm run dev
```

The app will open at the configured URL (typically `http://localhost:5173`).

## Step 7: Test OAuth Login

1. Navigate to the login page
2. Below the "Sign In" button, you should see two new buttons:
   - A Google login button (with mail icon)
   - A Microsoft login button (with cloud icon)
3. Click either button to test the OAuth flow
4. You should be redirected to the OAuth provider's login/consent screen
5. After authentication, you'll be redirected back to the app and logged in

## How OAuth Authentication Works

### OAuth Flow Diagram
```
User clicks OAuth button
        ↓
OAuth provider authentication screen
        ↓
User approves access
        ↓
OAuth token/profile returned to app
        ↓
App calls createOrUpdateOAuthUser action
        ↓
Backend checks for existing user
├─ If new user: Create account with random encryption key
├─ If existing: Update OAuth info
└─ Return userId
        ↓
User stored in localStorage
        ↓
User logged in and routed to dashboard
```

### Encryption Key Management

For OAuth users, encryption keys are:
- **Generated randomly** during account creation
- **Stored server-side** in the database (encrypted by Convex)
- **User doesn't see or need to remember** the key
- **Same key used** across all devices for decryption

This differs from password-based users who derive their encryption key from their password.

## Troubleshooting

### "OAuth buttons not showing"
- Check that `.env.local` has the correct Client IDs
- Verify the OAuth libraries are installed: `npm install @react-oauth/google @microsoft/msal-browser @microsoft/msal-react`
- Check browser console for any errors

### "Google OAuth redirect fails"
- Verify authorized JavaScript origins and redirect URIs in Google Cloud Console
- Check that localhost or your domain is added to the authorized list
- For Vite dev server, use `http://localhost:5173` (not 3000)

### "Microsoft OAuth fails"
- Ensure the Application ID is correct in `.env.local`
- Check Azure Portal that redirect URIs include your domain
- Verify MSAL configuration uses the correct authority URL

### "User can't decrypt files after OAuth login"
- The server-generated encryption key should be applied automatically
- Check that `masterEncryptionKey` is set in the user database record
- Files uploaded by OAuth users should use this key for encryption

## Database Schema Changes

The users table now includes:

```typescript
password: v.optional(v.string())  // Now optional for OAuth users
authProvider: v.optional(v.string())  // "password", "google", "microsoft"
oauthProviderId: v.optional(v.string())  // Unique ID from OAuth provider
oauthEmail: v.optional(v.string())  // Email from OAuth provider
oauthName: v.optional(v.string())  // Name from OAuth provider
oauthAvatarUrl: v.optional(v.string())  // Avatar URL from provider
```

## Account Linking (Future Feature)

Currently, OAuth users with the same email as password accounts will:
- Update the existing account with OAuth info
- Allow login via either password or OAuth

Full account linking with multiple OAuth providers is planned for a future release.

## Production Deployment

When deploying to production:

1. Update OAuth provider configurations:
   - Google Cloud Console: Add your production domain to authorized origins/redirect URIs
   - Azure Portal: Add your production domain to redirect URIs

2. Update `.env.local` with production domain:
   ```
   VITE_OAUTH_GOOGLE_CLIENT_ID=your-production-google-client-id
   VITE_OAUTH_MICROSOFT_CLIENT_ID=your-production-microsoft-client-id
   ```

3. Deploy the Convex backend:
   ```bash
   npx convex deploy
   ```

4. Build and deploy the frontend:
   ```bash
   npm run build
   ```

## Security Notes

- OAuth tokens are never stored in localStorage (only in provider session)
- User IDs are stored in localStorage for session persistence
- Encryption keys for files are server-managed and not exposed to clients
- All OAuth operations go through Convex actions (server-side validation)
- HTTPS is recommended for production (OAuth requires secure context)

## Support

For issues or questions:
- Check the browser console for error messages
- Review the implementation in `/pages/Login.tsx`
- Check Convex logs in the dashboard for backend errors
- Verify OAuth provider credentials and configuration
