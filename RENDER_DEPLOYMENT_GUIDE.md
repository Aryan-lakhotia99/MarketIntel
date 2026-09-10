# 🚀 Render Deployment Guide for MarketIntel

## ✅ Prerequisites
- GitHub account with repository access
- Render account (free tier available)
- Updated code pushed to GitHub

---

## 📋 Step 1: Backend Deployment

### 1.1 Create Backend Service
1. Go to [render.com](https://render.com) Dashboard
2. Click **"New +"** → **"Web Service"**
3. Select repository: `Aryan-lakhotia99/MarketIntel`
4. Click **"Connect"**

### 1.2 Configure Backend Settings
- **Name**: `marketintel-backend`
- **Environment**: Python 3
- **Build Command**: `pip install --no-cache-dir -r backend/requirements.txt`
- **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000`
- **Plan**: Free (or upgrade as needed)
- **Branch**: main

### 1.3 Add Environment Variables
Click **"Add Environment Variable"** for each:

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | (leave empty) | Uses SQLite by default. Add PostgreSQL URL for production. |
| `FRONTEND_URL` | (leave empty) | Will update after frontend deployment |
| `PYTHONUNBUFFERED` | `1` | Shows Python logs in real-time |

### 1.4 Deploy
Click **"Create Web Service"**

✅ Wait for deployment to complete (5-10 minutes)

✅ **Copy the Backend URL** from the dashboard (e.g., `https://marketintel-backend.onrender.com`)

---

## 📋 Step 2: Frontend Deployment

### 2.1 Create Frontend Service
1. Click **"New +"** → **"Web Service"** again
2. Select the same repository: `Aryan-lakhotia99/MarketIntel`
3. Click **"Connect"**

### 2.2 Configure Frontend Settings
- **Name**: `marketintel-frontend`
- **Environment**: Node
- **Build Command**: `cd frontend && npm install && npm run build`
- **Start Command**: `cd frontend && npm run start`
- **Plan**: Free (or upgrade as needed)
- **Branch**: main

### 2.3 Add Environment Variables
Click **"Add Environment Variable"** for each:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://marketintel-backend.onrender.com/api/v1` |
| `NEXT_PUBLIC_APP_URL` | `https://marketintel-frontend.onrender.com` |

### 2.4 Deploy
Click **"Create Web Service"**

✅ Wait for deployment to complete (10-15 minutes)

✅ **Copy the Frontend URL** from the dashboard (e.g., `https://marketintel-frontend.onrender.com`)

---

## 📋 Step 3: Update Backend CORS Configuration

### 3.1 Update Backend Environment
1. Go to Backend service → **"Environment"**
2. Update `FRONTEND_URL`:
   ```
   https://marketintel-frontend.onrender.com
   ```
3. Click **"Save"** - Backend will automatically redeploy

✅ Wait for redeploy to complete (~3-5 minutes)

---

## ✅ Verification

### Test Backend Health
```bash
curl https://marketintel-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "Market Intelligence API",
  "version": "0.1.0"
}
```

### Test API Documentation
Open in browser:
```
https://marketintel-backend.onrender.com/docs
```

### Access Frontend
Open in browser:
```
https://marketintel-frontend.onrender.com
```

### Check Browser Console
- Open DevTools (F12)
- Go to **Network** tab
- Reload page
- Verify API calls go to backend without CORS errors

---

## 🐛 Common Errors & Fixes

### ❌ **502 Bad Gateway (Backend)**
**Cause**: Backend service failed to start

**Fix**:
1. Go to Backend service → **"Logs"**
2. Look for error messages
3. Common issues:
   - Missing dependency: Add to `backend/requirements.txt`
   - Wrong start command: Should be `cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000`
   - Port already in use: The code handles this automatically

### ❌ **CORS Policy Error in Browser**
**Cause**: Frontend URL not in CORS allowlist

**Fix**:
1. Go to Backend service → **"Environment"**
2. Verify `FRONTEND_URL` is set to your frontend URL
3. Save and wait for redeploy
4. Clear browser cache and refresh

### ❌ **Cannot GET / (Frontend)**
**Cause**: Frontend failed to build

**Fix**:
1. Go to Frontend service → **"Logs"**
2. Look for npm/Node errors
3. Common issues:
   - Missing packages: Check `frontend/package.json`
   - Build errors: Run `npm run build` locally to debug

### ❌ **ModuleNotFoundError (Python)**
**Cause**: Missing Python package

**Fix**:
1. Add missing package to `backend/requirements.txt`
2. Push to GitHub
3. Render will auto-redeploy

### ❌ **npm ERR! ERESOLVE (Node)**
**Cause**: Node version or dependency conflict

**Fix**:
1. Run `npm install` locally and test
2. Update versions in `frontend/package.json`
3. Push to GitHub and redeploy

---

## 📊 Monitor Logs

To watch real-time deployment logs:

1. Go to service dashboard
2. Click **"Logs"** tab
3. Watch for errors during build and runtime

---

## 🔄 Auto-Deployment

Once connected, Render automatically:
- ✅ Detects GitHub pushes
- ✅ Runs build commands
- ✅ Restarts services
- ✅ Maintains uptime during redeploy

**Just push to GitHub — Render handles the rest!**

---

## 💾 Database (Optional)

### Using SQLite (Default)
- ✅ Works out of the box
- ✅ No configuration needed
- ⚠️ Not ideal for concurrent users

### Switch to PostgreSQL

1. Create free PostgreSQL database:
   - Option A: Use Render's managed PostgreSQL
   - Option B: Use [Neon](https://neon.tech) or [Supabase](https://supabase.com)

2. Copy connection string

3. Set on Backend:
   - Go to **"Environment"**
   - Update `DATABASE_URL` to PostgreSQL URL
   - Save and redeploy

---

## 🎯 Next Steps

1. ✅ Verify both services are running
2. ✅ Test API endpoints
3. ✅ Check frontend loads without errors
4. ✅ Monitor logs for issues
5. ✅ Set up custom domain (optional, paid)
6. ✅ Upgrade to paid plan if needed

---

## 📞 Need Help?

- **Render Docs**: https://render.com/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Next.js Docs**: https://nextjs.org/docs
- **Check Logs**: Your service → "Logs" tab
