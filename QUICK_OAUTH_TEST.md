# Quick OAuth Test Setup

## ⚡ Fastest Way to Test Google OAuth

### Option 1: Use a Test Client ID (Quick Demo)
Google provides a public test client ID you can use to test the OAuth flow:

```
Client ID: 764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com
```

Add this to `.env.local`:
```
VITE_OAUTH_GOOGLE_CLIENT_ID=764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com
```

⚠️ **Note:** This is a public test ID - don't use in production. It's for testing only.

### Option 2: Get Your Own Client ID (Recommended)
Follow the full setup in `OAUTH_CREDENTIALS_SETUP.md` to get your own credentials.

---

## Steps to Test

1. **Update `.env.local`** with a Client ID (use Option 1 above or get your own)

2. **Restart the dev server:**
   ```bash
   npm run dev
   ```

3. **Refresh browser** at http://localhost:3000/login

4. **Click "Continue with Google"** button

5. **You should see:**
   - Google login popup/redirect
   - Permission request to access your profile
   - Redirect back to your app with user data

---

## Troubleshooting

### Still nothing happens when clicking?
1. Open browser DevTools (F12)
2. Go to Console tab
3. Click the Google button
4. You should see logs showing what's happening

### Getting an alert about missing Client ID?
- Add a valid `VITE_OAUTH_GOOGLE_CLIENT_ID` to `.env.local`
- Restart dev server (`npm run dev`)
- Refresh browser

### Getting a CORS error?
- The Client ID must be registered for your domain
- Make sure `http://localhost:3000` is in Google Cloud Console authorized origins
- See `OAUTH_CREDENTIALS_SETUP.md` for details

---

## What Happens After Login

Once you authenticate with Google OAuth:
1. App receives your user data (email, name, picture)
2. Backend creates/updates your account in the database
3. You're automatically logged into the app
4. Encryption key is generated for your files
5. You're routed to the dashboard

---

## Next Steps

- [ ] Test Google OAuth with test ID or your own
- [ ] Test Microsoft OAuth (similar setup)
- [ ] Verify user is created in Convex dashboard
- [ ] Test file upload and encryption
- [ ] Test email notifications

---

## Need Help?

See these files for more info:
- `OAUTH_CREDENTIALS_SETUP.md` - Full setup instructions
- `OAUTH_SETUP.md` - Detailed technical guide
- `OAUTH_API_REFERENCE.md` - API documentation
