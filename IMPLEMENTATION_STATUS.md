# Stripe Monetization Implementation Status

## ✅ COMPLETED: Backend Implementation (Phase 1)

### Database Schema (convex/schema.ts)
- ✅ Added `subscriptions` table with proper indexing
- ✅ Added denormalized fields to `users` table
- ✅ Indexes on `by_user` and `by_stripe_customer`
- ✅ Schema deployed to Convex

### Subscription Management (convex/subscriptions.ts)
- ✅ `getSubscription` - Query user's active subscription
- ✅ `isTrialActive` - Check if trial is still valid
- ✅ `canAccessPaidFeatures` - Determine if user can use features
- ✅ `getFileUploadLimit` - Returns 5 (trial), Infinity (paid), 0 (expired/canceled)
- ✅ `initializeTrial` - Create trial on signup (24 hours)
- ✅ `updateSubscriptionFromWebhook` - Update from Stripe events (idempotent)
- ✅ `markTrialExpired` - Transition trial status on expiry
- ✅ `cancelSubscription` - Handle user-initiated cancellation
- ✅ Helper queries for trial expiry detection

### Stripe API Integration (convex/stripeActions.ts)
- ✅ `createStripeCustomer` - Create customer on signup (temp ID until checkout)
- ✅ `createCheckoutSession` - Generate checkout URL for upgrades
- ✅ `getBillingPortalUrl` - Access billing portal for existing customers
- ✅ `cancelStripeSubscription` - Cancel subscription (immediate or at period end)
- ✅ `handleStripeWebhook` - Process webhook events with signature verification
- ✅ Event handlers for: subscription created/updated/deleted, payment failed
- ✅ Webhook idempotency via lastWebhookId checking

### HTTP Webhook Endpoint (convex/http.ts)
- ✅ POST `/stripe/webhook` endpoint
- ✅ Signature verification
- ✅ Request body handling
- ✅ Error responses (400, 500)

### Email Notifications (convex/emails.ts)
- ✅ `sendTrialExpiringEmail` - 1 hour before trial ends
- ✅ `sendTrialExpiredEmail` - When trial ends
- ✅ Both emails have professional design with logo
- ✅ Include upgrade CTA with link to pricing page

### Trial Expiry Automation (convex/cronHandler.ts + emailHelpers.ts)
- ✅ Phase 0: Trial expiry checks (every 5 minutes)
- ✅ Detects trials expiring in next hour → sends email
- ✅ Detects expired trials → sends email + updates status
- ✅ Idempotent processing (no duplicate emails)
- ✅ Existing phases (check-in alerts, reminders, emergency emails) unchanged

### User Account Initialization (convex/users.ts)
- ✅ `createNewUser` - Initialize trial on signup (24-hour duration)
- ✅ `createOAuthUser` - Initialize trial for OAuth users
- ✅ Creates temp Stripe customer ID (format: `temp_{userId}_{timestamp}`)
- ✅ Updates user with subscriptionStatus and stripeCustomerId

### Environment Configuration (convex/.env.local)
- ✅ STRIPE_SECRET_KEY - Set with your test key
- ✅ STRIPE_WEBHOOK_SECRET - Placeholder (update after webhook setup)
- ✅ STRIPE_PRICE_ID - Placeholder (update after product creation)
- ✅ VITE_APP_URL - Set for email links
- ✅ Convex deployment complete and working

### Deployment
- ✅ `npx convex deploy --yes` - All backend functions deployed successfully
- ✅ Schema validation passed
- ✅ Indexes created on Convex

---

## 📝 TODO: Frontend Implementation (Phase 2-4)

### Phase 2: User Integration & Feature Gates

#### Vault Page (pages/Vault.tsx)
- [ ] Show file upload limit based on subscription status
- [ ] Display "Upgrade to upload more files" message for trial/expired users
- [ ] Disable upload button when limit reached
- [ ] Show remaining files in trial (e.g., "4 of 5 files used")

#### UploadWizard (pages/UploadWizard.tsx)
- [ ] Check file upload limit before allowing upload
- [ ] Show premium feature messaging
- [ ] Prevent upload if limit reached, show upgrade CTA

#### Settings Page (pages/Settings.tsx)
- [ ] Display current subscription status
- [ ] Show trial end date / subscription renewal date
- [ ] Add subscription management section with:
  - [ ] "Upgrade to Premium" button → Checkout
  - [ ] "Manage Billing" button → Billing Portal (if active)
  - [ ] "Cancel Subscription" button (if active)
- [ ] Show file upload limit

### Phase 3: Pricing Page (pages/Pricing.tsx)

Create new pricing page with:
- [ ] Hero section with "Transparent Pricing"
- [ ] Trial offer: "Free 24-hour trial, no credit card required"
- [ ] Two pricing tiers:
  - **Free/Trial**: 5 files, limited features
  - **Guardian Angel Plus**: $1.99/month, unlimited files, full features
- [ ] Feature comparison table
- [ ] "Start Free Trial" and "Upgrade Now" CTAs
- [ ] FAQ section addressing common questions

### Phase 4: Payment Flow Integration

#### Checkout Flow (new hook: hooks/useSubscription.ts)
- [ ] Create `useSubscription` hook to manage subscription state
- [ ] Fetch user's subscription on app load (App.tsx)
- [ ] Integrate with `subscriptions.canAccessPaidFeatures` query
- [ ] Handle subscription status updates

#### Stripe Integration (pages/Checkout.tsx or modal)
- [ ] Implement Stripe checkout using @stripe/react-stripe-js
- [ ] Add VITE_STRIPE_PUBLIC_KEY to .env.local
- [ ] Redirect to checkout on upgrade click:
  ```typescript
  const { url } = await createCheckoutSession({
    userId: currentUserId,
    successUrl: `${window.location.origin}/billing?success=true`,
    cancelUrl: `${window.location.origin}/pricing?cancel=true`,
  });
  window.location.href = url;
  ```
- [ ] Handle return from Stripe checkout
- [ ] Show success/error messages

#### Billing Portal (pages/Billing.tsx)
- [ ] Show subscription details
- [ ] "Manage Billing" button → Opens Stripe portal
- [ ] "Cancel Subscription" option with confirmation
- [ ] Display current period dates and next renewal

### Phase 5: Final Integration & Testing

#### App.tsx Updates
- [ ] Initialize subscription check on app load
- [ ] Set subscription status in app state/context
- [ ] Pass subscription status to pages/components

#### Environment Variables
- [ ] Add VITE_STRIPE_PUBLIC_KEY to frontend .env.local
- [ ] Verify all Convex environment variables are set

#### Testing
- [ ] Test trial initialization on new signup
- [ ] Test file upload limit (5 files for trial, unlimited for paid)
- [ ] Test checkout flow with Stripe test card
- [ ] Test webhook processing (check Convex logs)
- [ ] Test trial expiry emails (check logs + mailbox)
- [ ] Test subscription management (upgrade, cancel, billing portal)

---

## Quick Setup Checklist

Before implementing frontend features:

1. **Stripe Product Setup**
   - [ ] Create product "Guardian Angel DMS Plus" in Stripe
   - [ ] Set price to $1.99/month
   - [ ] Copy Price ID and update STRIPE_PRICE_ID in convex/.env.local
   - [ ] Redeploy: `npx convex deploy --yes`

2. **Webhook Setup**
   - [ ] Go to Stripe Dashboard → Webhooks
   - [ ] Add endpoint: https://dazzling-scorpion-38.convex.cloud/stripe/webhook
   - [ ] Select events: subscription created/updated/deleted, payment failed
   - [ ] Copy signing secret and update STRIPE_WEBHOOK_SECRET in convex/.env.local
   - [ ] Redeploy: `npx convex deploy --yes`

3. **Frontend Setup**
   - [ ] Add VITE_STRIPE_PUBLIC_KEY to frontend .env.local
   - [ ] Install `@stripe/react-stripe-js` and `@stripe/js`
   - [ ] Create Pricing page
   - [ ] Create Billing page
   - [ ] Add feature gates to Vault and UploadWizard

4. **Testing**
   - [ ] Create test account → Check for trial in database
   - [ ] Test file upload limit
   - [ ] Trigger trial expiry → Check for emails
   - [ ] Test upgrade flow → Use Stripe test card 4242 4242 4242 4242

---

## Subscription State Diagram

```
              [New User Signup]
                      |
                      ↓
            [Initialize Trial]
         (24 hours from now)
                      |
        ┌─────────────┴─────────────┐
        ↓                           ↓
    [Trial Active]         [After 1 hour]
   (5 files limit)      [Trial Expiring Email]
        |                           |
        |                           ↓
        │                      [After 24 hours]
        │                  [Trial Expired Email]
        │                           |
        ├──────────────────────────→ [Trial Expired]
        │                      (0 files/view-only)
        │                           |
        ↓                           ↓
    [Checkout]              [Upgrade Button]
        |                           |
        ↓                           ↓
   [Payment Success]          [Payment Success]
        |                           |
        └──────────────┬────────────┘
                       ↓
                 [Active Subscription]
              (Unlimited files)
                       |
         ┌─────────────┼─────────────┐
         ↓             ↓             ↓
    [Cancel]   [Payment Fails] [Renew]
         |             |             |
         ↓             ↓             ↓
     [Canceled]  [Past Due]    [Active]
```

---

## Key Implementation Notes

1. **File Upload Limit Logic**
   - Trial: Show "4 of 5 files used" → Can't upload more
   - Active: Show "Unlimited files"
   - Trial_expired/Canceled: Show "Upgrade to upload files"

2. **Stripe Checkout**
   - Always call `createCheckoutSession` action (not direct Stripe.js)
   - Action creates real Stripe customer ID on first checkout
   - Replaces temp customer ID with real one

3. **Webhook Processing**
   - All webhooks are idempotent (checked via lastWebhookId)
   - Safe to receive duplicate events
   - Updates both subscriptions table and users table for consistency

4. **Email Notifications**
   - Sent automatically by cron job (every 5 minutes)
   - Each email sent maximum once per trial cycle
   - Include professional design with logo and CTA

5. **Testing Payments**
   - Use Stripe test card: 4242 4242 4242 4242
   - Any future expiry date and any 3-digit CVC
   - Payment completes instantly in test mode

