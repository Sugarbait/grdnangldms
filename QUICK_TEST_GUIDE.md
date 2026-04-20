# Quick Test Guide - Stripe Payment Flow

## 🎯 Test in 5 Minutes

### Setup
1. Start your dev server: `npm run dev`
2. Your app should be running at `http://localhost:3000`

### Test Flow

#### Step 1: Create Test Account (30 seconds)
```
1. Go to http://localhost:3000/#/
2. Click "Get Started" or "Sign Up"
3. Fill in test account:
   - Name: Test User
   - Email: test@example.com
   - Password: TestPass123
4. Check email for verification (if configured)
   OR manually verify if needed
5. Click "Sign In"
```

#### Step 2: Verify Trial is Active (30 seconds)
```
1. Go to Dashboard
2. Confirm you see:
   - 24-hour timer
   - "Free Trial" status
   - Upload limit: 5 files
3. Try uploading 6 files
   → Should be blocked after 5
```

#### Step 3: Start Upgrade (30 seconds)
```
1. Click Settings (or navigate to /settings)
2. Click "Pricing" or "Upgrade Now"
3. Go to Pricing page
4. Scroll to "Guardian Angel Plus"
5. Click "Upgrade Now" button
```

#### Step 4: Complete Test Payment (2 minutes)
```
You should be redirected to Stripe checkout page.

Fill in with:
- Email: test@example.com
- Card Number: 4242 4242 4242 4242
- Expiry: 12 / 25 (or any future month/year)
- CVC: 123 (any 3 digits)
- Cardholder Name: Test User

Click "Pay" button
```

#### Step 5: Verify Success (1 minute)
```
You should see:
1. Success message: "Payment successful!"
2. Redirect back to pricing page
3. Subscription status shows as "active"

Then verify:
1. Go to Vault
2. Try uploading 6+ files
   → Should all succeed now!
3. Upload limit should be "Unlimited"
```

---

## Expected Results

### Before Payment
```
Subscription Status: trial
Upload Limit: 5 files
Trial Ends: [24h from signup]
Features: Limited
```

### After Payment
```
Subscription Status: active
Upload Limit: Unlimited ✅
Next Billing: [1 month from payment]
Features: All unlocked ✅
```

---

## Stripe Test Cards

### Success
```
Card: 4242 4242 4242 4242
Status: Successful charge
Use when: Testing normal payment flow
```

### Requires Action
```
Card: 4000 0025 0000 3155
Status: Requires authentication
Use when: Testing 3D Secure
```

### Fails
```
Card: 4000 0000 0000 0002
Status: Charge declined
Use when: Testing failure handling
```

### All future expiry dates work: 12/25, 06/30, etc.
### All CVC codes work: 123, 456, 789, etc.

---

## What to Check

### ✅ Payment Works
- [ ] Stripe checkout page loads
- [ ] Can enter test card
- [ ] Payment processes
- [ ] Redirect back to app

### ✅ Trial Removed
- [ ] Subscription status: "trial" → "active"
- [ ] Trial countdown disappears
- [ ] No more "24h trial" message

### ✅ Uploads Unlimited
- [ ] Can upload 6+ files
- [ ] No "5 file limit" error
- [ ] Upload counter doesn't block at 5

### ✅ Billing Works
- [ ] Stripe shows monthly renewal
- [ ] Next charge date visible
- [ ] Can view subscription in Stripe Dashboard

---

## Troubleshooting

### Payment page doesn't open
**Check**:
- Stripe keys are configured
- `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` are set
- Backend is running: `npx convex dev`

### Payment succeeds but subscription doesn't update
**Check**:
- Webhook endpoint is working
- Check logs: `npx convex logs`
- Look for webhook events in Stripe Dashboard
- May need to manually run webhook for testing

### Upload limit still shows 5 after payment
**Check**:
- Refresh the page (Ctrl+F5)
- Check `subscriptions` table in Convex
- Verify status is actually "active" in database

### "Payment successful" but subscription shows "trial"
**Check**:
- Webhook secret in `convex/.env.local`
- Webhook is being delivered by Stripe
- No errors in Convex logs

---

## Advanced Testing

### Check Webhook in Stripe Dashboard
```
1. Go to stripe.com → Dashboard
2. Left menu → Developers → Webhooks
3. Look for endpoint: /stripe/webhook
4. View recent events
5. Should see "customer.subscription.created"
```

### Check Database Update
```
1. Go to Convex Dashboard
2. View "subscriptions" table
3. Find your test user's subscription
4. Verify status changed to "active"
5. Verify stripeSubscriptionId is set
```

### Check Backend Logs
```
1. Terminal: npx convex logs --prod
2. Look for messages like:
   - "[Webhook] Received event: customer.subscription.created"
   - "[Subscriptions] Updated subscription"
   - "[Stripe] Created checkout session"
```

---

## Success = Green Checkmarks ✅

```
✅ Trial users see 5-file limit
✅ Clicking "Upgrade Now" → Stripe checkout
✅ Payment processes with test card
✅ Webhook updates subscription
✅ Subscription status: "active"
✅ Upload limit: Unlimited
✅ Can upload 6+ files
✅ Monthly auto-renewal enabled
```

If all these are true, your payment system is working perfectly!

---

## Need Help?

Check these files:
- `convex/stripeActions.ts` - Payment processing
- `convex/subscriptions.ts` - Subscription state
- `convex/http.ts` - Webhook endpoint
- `pages/Pricing.tsx` - Upgrade button
- `convex/schema.ts` - Database schema

All are fully implemented and ready to test!
