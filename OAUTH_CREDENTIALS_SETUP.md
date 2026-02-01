# OAuth Credentials Setup Guide

Both Google and Microsoft OAuth buttons are now fully functional! Follow these steps to get your OAuth credentials set up.

## Google OAuth Setup

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Click "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Select "Web application"
   - Add authorized JavaScript origins:
     - `http://localhost:3000`
     - `http://localhost:5173`
     - Your production domain
   - Add authorized redirect URIs (same as above)
   - Click "Create"

5. Copy the **Client ID**

### Step 2: Add to .env.local

Add to your `.env.local` file:
```
VITE_OAUTH_GOOGLE_CLIENT_ID=your-google-client-id-here
```

---

## Microsoft OAuth Setup

### Step 1: Register App in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "App registrations" and click it
3. Click "New registration"
4. Fill in the form:
   - **Name:** Guardian Angel DMS
   - **Supported account types:** Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI:** Web - `http://localhost:3000`

5. Click "Register"

### Step 2: Configure Platform Settings

1. In the app's page, go to "Authentication"
2. Under "Platform configurations," click "Add a platform"
3. Select "Single-page application (SPA)"
4. Add Redirect URIs:
   - `http://localhost:3000`
   - `http://localhost:5173`
   - Your production domain
5. Click "Configure"

### Step 3: Copy Client ID

1. Go to "Overview"
2. Copy the **Application (client) ID**

### Step 4: Add to .env.local

Add to your `.env.local` file:
```
VITE_OAUTH_MICROSOFT_CLIENT_ID=your-microsoft-client-id-here
```

---

## Test the OAuth Buttons

1. Ensure your `.env.local` has both Client IDs
2. Start the dev server: `npm run dev`
3. Go to http://localhost:3000/login
4. You should see two buttons:
   - "Continue with Google"
   - "Continue with Microsoft"
5. Click either button to test the OAuth flow

---

## How It Works

### Google OAuth Flow
1. User clicks "Continue with Google"
2. Redirected to Google login/consent screen
3. Google returns a JWT token with user info
4. App parses token to get email, name, avatar
5. Backend creates or updates user account
6. User logged in automatically

### Microsoft OAuth Flow
1. User clicks "Continue with Microsoft"
2. Redirected to Microsoft login page
3. User signs in and approves permissions
4. Microsoft redirects back with `id_token`
5. Backend processes token and creates account
6. User logged in automatically

---

## Handling OAuth Responses

The OAuth tokens are securely processed on the backend. Your `createOrUpdateOAuthUser` action in Convex handles:

1. Checking if user exists by email
2. Creating new account or updating existing one
3. Generating encryption keys for new OAuth users
4. Returning user ID for session storage

---

## Troubleshooting

### "Google sign-in failed"
- Verify `VITE_OAUTH_GOOGLE_CLIENT_ID` is correct in `.env.local`
- Check Google Cloud Console settings match your domain
- Clear browser cache and try again

### "Microsoft sign-in failed"
- Verify `VITE_OAUTH_MICROSOFT_CLIENT_ID` is correct in `.env.local`
- Check Azure Portal app registration redirect URI matches your domain
- Ensure app is configured as SPA (Single-page application)

### Button doesn't appear
- Verify both Client IDs are in `.env.local`
- Restart dev server after changing `.env.local`
- Check browser console for errors

### Can't find Client ID
- Google: "APIs & Services" > "Credentials" - look for OAuth 2.0 Client ID
- Microsoft: "App registrations" > Your app > "Overview" - look for Application (client) ID

---

## Production Deployment

When deploying to production:

1. **Update redirect URIs:**
   - Google Cloud Console: Add your production domain
   - Azure Portal: Add your production domain

2. **Update environment variables:**
   ```
   VITE_OAUTH_GOOGLE_CLIENT_ID=your-prod-google-id
   VITE_OAUTH_MICROSOFT_CLIENT_ID=your-prod-microsoft-id
   ```

3. **Deploy:**
   ```bash
   npm run build
   npm run preview  # Test production build locally
   ```

---

## Security Notes

- Never commit `.env.local` to version control
- Client IDs are public; they don't grant access without server validation
- All token verification happens on secure Convex backend
- Encryption keys generated server-side, never exposed to client
- Users' personal data handled according to OAuth provider privacy policies

---

## Next Steps

1. Get Google Client ID from Google Cloud Console
2. Get Microsoft Client ID from Azure Portal
3. Add both to `.env.local`
4. Restart dev server
5. Test OAuth buttons on login page

Let me know if you need help with any step! 🚀
