# Subscription Re-purchase Display Fix

## Issue
After a user cancelled their verified badge subscription and then purchased a new 1-month plan, the new purchase was not showing as "Active" on the subscription page. Instead, it was showing as "Purchased" (disabled button), preventing users from seeing their active subscription status.

## Root Cause
The frontend logic in `VerifiedBadge.jsx` was checking for ANY subscription with the same `planMonths`, regardless of status. This meant:

1. User cancels 1-month subscription → status becomes 'cancelled'
2. User buys a NEW 1-month subscription → status is 'active'
3. Frontend finds BOTH subscriptions (old cancelled + new active)
4. The logic didn't prioritize active subscriptions over cancelled ones
5. Result: Button showed "Purchased" instead of "Active"

## Solution

### Frontend Changes (`frontend/src/pages/User/VerifiedBadge.jsx`)

**Before (lines 510-524):**
```javascript
const hasPurchasedPlan = userSubscriptions.some(sub => 
  sub.planMonths === planMonths && 
  (sub.status === 'active' || (sub.expiryDate && new Date(sub.expiryDate) > new Date()))
);
const purchasedSubscription = userSubscriptions.find(sub => 
  sub.planMonths === planMonths && 
  (sub.status === 'active' || (sub.expiryDate && new Date(sub.expiryDate) > new Date()))
);
```

**After (lines 510-540):**
```javascript
// Only consider active subscriptions that haven't expired
const activeSubscription = userSubscriptions.find(sub => 
  sub.planMonths === planMonths && 
  sub.status === 'active' &&
  sub.expiryDate && 
  new Date(sub.expiryDate) > new Date()
);

// Check for any past purchase (including expired/cancelled) only if no active subscription
const hasPurchasedPlan = activeSubscription || userSubscriptions.some(sub => 
  sub.planMonths === planMonths && 
  sub.status !== 'cancelled' &&
  sub.expiryDate && 
  new Date(sub.expiryDate) > new Date()
);

const purchasedSubscription = activeSubscription || userSubscriptions.find(sub => 
  sub.planMonths === planMonths && 
  sub.status !== 'cancelled' &&
  sub.expiryDate && 
  new Date(sub.expiryDate) > new Date()
);

const isActive = activeSubscription !== undefined;
```

## Key Improvements

1. **Priority for Active Subscriptions**: 
   - First checks for `activeSubscription` (status === 'active' AND not expired)
   - This ensures active subscriptions are always found first

2. **Exclude Cancelled Subscriptions**:
   - When checking for past purchases, explicitly excludes `status === 'cancelled'`
   - This prevents cancelled subscriptions from interfering with new purchases

3. **Clear Active Status**:
   - `isActive` is now simply `activeSubscription !== undefined`
   - This makes the logic clearer and more reliable

## User Experience

### Before Fix:
- User cancels 1-month plan ❌
- User buys new 1-month plan ✅
- Button shows: "Purchased" (gray, disabled) ❌
- User confused about subscription status

### After Fix:
- User cancels 1-month plan ❌
- User buys new 1-month plan ✅
- Button shows: "✓ Active until [date]" (green) ✅
- User can clearly see their active subscription

## Testing Scenarios

1. **New Purchase After Cancellation**:
   - Cancel any plan
   - Purchase the same plan again
   - ✅ Should show "✓ Active until [date]"

2. **Different Plan After Cancellation**:
   - Cancel 1-month plan
   - Purchase 3-month plan
   - ✅ 1-month should be buyable again
   - ✅ 3-month should show "✓ Active until [date]"

3. **Multiple Cancelled Plans**:
   - Cancel multiple plans over time
   - Purchase any plan
   - ✅ Only active subscription should show as active
   - ✅ Other plans should be buyable

## Related Files
- `frontend/src/pages/User/VerifiedBadge.jsx` - Subscription display and purchase logic
- `backend/src/routes/subscriptions.js` - Subscription creation and cancellation
- `backend/src/models/Subscription.js` - Subscription model

## Status
✅ **FIXED** - Frontend logic updated to prioritize active subscriptions
🔄 **Action Required**: Refresh the browser to see changes (Ctrl+Shift+R or Cmd+Shift+R)

