# Quick Environment Variables Setup

## For Testing (5 Users) - Vercel Only

### Step 1: Get Your ngrok URL

Start ngrok:
```bash
npx ngrok http 7000
```

Copy the URL (e.g., `https://fitchy-asymmetrically-nigel.ngrok-free.dev`)

---

### Step 2: Add to Vercel

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these 2 variables:

```
VITE_API_URL = https://fitchy-asymmetrically-nigel.ngrok-free.dev/api
VITE_SOCKET_URL = https://fitchy-asymmetrically-nigel.ngrok-free.dev
```

**Important:** Replace `fitchy-asymmetrically-nigel.ngrok-free.dev` with YOUR ngrok URL!

---

### Step 3: Redeploy

After adding variables, click **Redeploy** in Vercel.

---

## That's It! ✅

Your frontend will now connect to your local backend through ngrok.

---

## For Production (Later)

When you're ready for production, you'll need:

### Frontend (Vercel):
- `VITE_API_URL` = Your backend URL (Railway/Render)
- `VITE_SOCKET_URL` = Your backend URL (Railway/Render)

### Backend (Railway/Render):
- `MONGO_URI` = MongoDB Atlas connection
- `JWT_ACCESS_SECRET` = Random secret key
- `JWT_REFRESH_SECRET` = Random secret key
- `FRONTEND_URL` = Your Vercel URL
- `RAZORPAY_KEY_ID` = Your Razorpay key
- `RAZORPAY_KEY_SECRET` = Your Razorpay secret
- `CLOUDINARY_*` = Your Cloudinary credentials
- `MAILJET_*` = Your Mailjet credentials

See `ENVIRONMENT_VARIABLES.md` for complete list.

