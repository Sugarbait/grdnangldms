# OAuth API Reference

## Backend Actions

### `createOrUpdateOAuthUser`
**File:** `convex/auth.ts`

Creates a new OAuth user or updates an existing one with OAuth information.

#### Arguments
```typescript
{
  provider: string          // "google" | "microsoft"
  providerId: string        // Unique ID from OAuth provider
  email: string            // Email address
  name: string             // User's name
  avatarUrl?: string       // Optional avatar URL
}
```

#### Returns
```typescript
{
  userId: string           // ID of created or updated user
  isNewUser: boolean       // true if newly created, false if updated
}
```

#### Behavior
- **If user doesn't exist**: Creates new account with:
  - Random encryption key generated and stored
  - Email marked as verified (provider already verified)
  - Timer initialized (7 days)
  - Onboarding required

- **If user exists**: Updates with:
  - OAuth provider info
  - Name and avatar from provider
  - Keeps existing account data

#### Example Usage (Frontend)
```typescript
const createOrUpdateOAuthUserAction = useAction(api.auth.createOrUpdateOAuthUser);

const result = await createOrUpdateOAuthUserAction({
  provider: 'google',
  providerId: 'decoded.sub',        // Google's sub claim
  email: decoded.email,
  name: decoded.name,
  avatarUrl: decoded.picture,
});

localStorage.setItem('guardian_user_id', result.userId);
```

---

## Internal Mutations

### `createOAuthUser`
**File:** `convex/users.ts`

Internal mutation that actually inserts the OAuth user into the database.

#### Arguments
```typescript
{
  name: string
  email: string
  authProvider: string           // "google" | "microsoft"
  oauthProviderId: string       // provider_id combination
  oauthEmail: string
  oauthName: string
  oauthAvatarUrl: string
  masterEncryptionKey: string   // Generated encryption key
  emailVerified: boolean        // Always true for OAuth
  lastCheckIn: number           // Current timestamp
}
```

#### Returns
```typescript
userId: string  // The ID of created user
```

---

### `updateOAuthUser`
**File:** `convex/users.ts`

Internal mutation that updates an existing user with OAuth information.

#### Arguments
```typescript
{
  userId: Id<"users">
  authProvider: string
  oauthProviderId: string
  oauthEmail: string
  oauthName: string
  oauthAvatarUrl: string
}
```

---

## Frontend Components

### `GoogleLoginButton`
**File:** `pages/Login.tsx`

React component that handles Google OAuth sign-in.

#### Props
```typescript
interface OAuthButtonProps {
  onSuccess: (response: any) => void  // Called with Google token response
  onError: () => void                 // Called on auth failure
  isLoading: boolean                  // Disable button during auth
}
```

#### Token Response Format
```typescript
{
  credential: string  // JWT token with these claims:
  // - sub: Google user ID
  // - email: User email
  // - name: User name
  // - picture: Avatar URL
  // - email_verified: true/false
}
```

---

### `MicrosoftLoginButton`
**File:** `pages/Login.tsx`

React component that handles Microsoft OAuth sign-in via MSAL.

#### Props
```typescript
interface OAuthButtonProps {
  onSuccess: (response: any) => void  // Called with MSAL response
  onError: () => void                 // Called on auth failure
  isLoading: boolean                  // Disable button during auth
}
```

#### Response Format
```typescript
{
  account: {
    localAccountId: string            // Microsoft unique ID
    username: string                  // Email address
    name: string                      // User name
    // ... other MSAL properties
  }
}
```

---

## Environment Variables

### Required for Frontend
```bash
VITE_OAUTH_GOOGLE_CLIENT_ID=xxxxx
VITE_OAUTH_MICROSOFT_CLIENT_ID=xxxxx
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

- Found in: `.env.local`
- Scope: Frontend only (client IDs are public)

---

## Database Schema

### Users Table OAuth Fields

```typescript
password: v.optional(v.string())           // Now optional for OAuth users
authProvider: v.optional(v.string())       // "password" | "google" | "microsoft"
oauthProviderId: v.optional(v.string())   // Unique ID like "google_123456"
oauthEmail: v.optional(v.string())        // Email from provider
oauthName: v.optional(v.string())         // Name from provider
oauthAvatarUrl: v.optional(v.string())    // Avatar URL
```

### Indexes
- `by_email` - Query users by email
- `by_oauth_provider_id` - **NEW** - Query OAuth users by provider ID

---

## Error Handling

### Common OAuth Errors

**"Google sign-in failed"**
- Client ID not configured in `.env.local`
- Google Cloud domain not in authorized list
- Network/CORS issues

**"Microsoft sign-in failed"**
- Client ID not configured in `.env.local`
- Azure Portal redirect URI missing
- MSAL configuration error

**"This identity node is already registered"**
- Email already exists in database
- Can occur if user tries to OAuth with email used for password signup

### Backend Error Messages

```typescript
// In createOrUpdateOAuthUser action
throw new ConvexError("This identity node is already registered...");
throw new ConvexError("User not found.");  // Shouldn't happen
```

---

## Security Considerations

### Token Handling
- OAuth tokens NOT stored in localStorage
- Tokens immediately exchanged for userId
- Only userId persisted for session

### Encryption Keys
- Generated randomly for OAuth users (not password-based)
- Stored encrypted in database by Convex
- Never exposed to client
- Same as password-derived keys functionally

### Account Linking
Currently, if a user:
1. Signs up with password using `test@example.com`
2. Later tries to OAuth with same email

Result: The OAuth info is merged with the existing account. Both login methods work for the same account.

Future: Implement explicit account linking with user confirmation.

---

## Data Flow Diagram

```
Google/Microsoft OAuth Response
  ↓
Login.tsx Handler (handleGoogleSignIn / handleMicrosoftSignIn)
  ↓
Parse Token / Get Account Info
  ↓
Call createOrUpdateOAuthUser action
  ↓
Convex Backend
  ├─ Check if user exists by email
  ├─ If new: Generate encryption key, create user
  └─ If exists: Update OAuth fields
  ↓
Return userId
  ↓
localStorage.setItem('guardian_user_id', userId)
  ↓
onLogin(userId) - Route to dashboard
```

---

## Testing OAuth Locally

### Prerequisites
1. Google OAuth app created in Cloud Console
2. Microsoft OAuth app created in Azure Portal
3. Client IDs in `.env.local`
4. `npm install` completed

### Steps
1. `npm run dev`
2. Navigate to login page
3. Click OAuth button
4. Authenticate with provider
5. Check Convex dashboard for new user record
6. Verify fields populated: `oauthProviderId`, `authProvider`, `masterEncryptionKey`

### Debug Tips
```javascript
// In browser console
localStorage.getItem('guardian_user_id')  // Should show user ID
sessionStorage.getItem('guardian_encryption_key_source')  // Should show "oauth"

// Check Convex logs
// Dashboard > [Project] > Logs
// Look for createOrUpdateOAuthUser action calls
```

---

## Troubleshooting

### Button doesn't appear
```typescript
// Check App.tsx has OAuth providers
<GoogleOAuthProvider clientId={googleClientId}>
  <MsalProvider instance={msalInstance}>
    <AppContent />
  </MsalProvider>
</GoogleOAuthProvider>
```

### Login fails with network error
- Check `.env.local` for correct Client IDs
- Verify OAuth app allows localhost/your domain
- Check browser console for specific error

### User created but encryption key missing
- Should auto-generate in `createOrUpdateOAuthUser`
- Check Convex logs for any errors
- Verify `generateEncryptionKey()` function exists in `convex/encryption.ts`

### Same email signup twice (password then OAuth)
- First signup: Creates with password
- OAuth with same email: Updates existing account
- User can now login with either method
- Future: Add explicit linking confirmation

---

## Code Examples

### Complete OAuth Login Flow
```typescript
// In Login.tsx handleGoogleSignIn function
const handleGoogleSignIn = async (credentialResponse: any) => {
  const token = credentialResponse.credential;

  // Decode JWT
  const decoded = JSON.parse(
    atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
  );

  // Create or update user
  const result = await createOrUpdateOAuthUserAction({
    provider: 'google',
    providerId: decoded.sub,
    email: decoded.email,
    name: decoded.name,
    avatarUrl: decoded.picture,
  });

  // Store session
  localStorage.setItem('guardian_user_id', result.userId);

  // Navigate
  onLogin(result.userId as Id<"users">);
};
```

### Backend User Creation
```typescript
// In auth.ts createOrUpdateOAuthUser action
const userId = await ctx.runMutation(internal.users.createOAuthUser, {
  name: args.name,
  email: args.email,
  authProvider: args.provider,
  oauthProviderId: `${args.provider}_${args.providerId}`,
  oauthEmail: args.email,
  oauthName: args.name,
  oauthAvatarUrl: args.avatarUrl || "",
  masterEncryptionKey: generateEncryptionKey(),  // Random key!
  emailVerified: true,  // Provider verified
  lastCheckIn: Date.now(),
});
```
