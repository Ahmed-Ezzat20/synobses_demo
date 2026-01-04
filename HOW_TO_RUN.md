# 🚀 How to Run OmniASR Application

Complete guide to running your OmniASR speech recognition application locally and in production.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Backend Setup (Modal)](#backend-setup-modal)
4. [Frontend Setup (React)](#frontend-setup-react)
5. [Running Locally](#running-locally)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### Required Software

- **Node.js** 18+ and npm/pnpm
- **Python** 3.10+
- **Modal CLI** (for backend deployment)
- **Git**

### Install Modal CLI

```bash
pip install modal
```

### Authenticate with Modal

```bash
modal token new
```

This will open a browser window for authentication.

---

## ⚡ Quick Start

### Option 1: Use Your Already Deployed Backend

Your backend is already deployed at:
```
https://ahmedezzat0247--omniasr-llm-7b-fastapi-app.modal.run
```

**Just run the frontend:**

```bash
# 1. Clone the repository (if not already done)
git clone https://github.com/Ahmed-Ezzat20/synobses_demo.git
cd synobses_demo

# 2. Install dependencies
npm install
# or
pnpm install

# 3. Start the development server
npm run dev
# or
pnpm dev

# 4. Open browser to http://localhost:5173
```

**In the app:**
1. Enter your backend URL: `https://ahmedezzat0247--omniasr-llm-7b-fastapi-app.modal.run`
2. Click "Connect"
3. Upload an audio file and transcribe!

### Option 2: Full Local Setup

See detailed instructions below for running both backend and frontend.

---

## 🖥️ Backend Setup (Modal)

Your backend is deployed on Modal.com, which provides serverless GPU infrastructure.

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables (Optional)

Create a `.env` file in the `backend/` directory:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# API Keys (comma-separated, leave empty for no auth)
API_KEYS=your-secret-key-1,your-secret-key-2

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_PER_MINUTE=10

# File Size Limit (in MB)
MAX_FILE_SIZE_MB=100

# Logging Level
LOG_LEVEL=INFO
```

### 4. Deploy to Modal

#### Option A: First Time Deployment (Download Models)

This downloads the models first (29.1GB + Silero VAD):

```bash
# Step 1: Download models to Modal volume (run once)
modal run backend/omni_modal.py::download_model

# Step 2: Deploy the application
modal deploy backend/omni_modal.py
```

**Expected time**: 
- Model download: ~40-60 minutes (first time only)
- Deployment: ~2-5 minutes

#### Option B: Quick Deployment (If Models Already Downloaded)

```bash
modal deploy backend/omni_modal.py
```

### 5. Get Your Backend URL

After deployment, Modal will output your URL:

```
✓ Created web function transcribe => https://your-username--omniasr-llm-7b-fastapi-app.modal.run
```

**Save this URL** - you'll need it for the frontend!

### 6. Test Your Backend

```bash
# Health check
curl https://your-url.modal.run/health

# Get languages
curl https://your-url.modal.run/languages

# View API docs
open https://your-url.modal.run/docs
```

---

## 🎨 Frontend Setup (React)

### 1. Navigate to Project Root

```bash
cd /path/to/synobses_demo
```

### 2. Install Dependencies

Using npm:
```bash
npm install
```

Or using pnpm (faster):
```bash
pnpm install
```

### 3. Configure Frontend (Optional)

The frontend is configured to connect to any backend URL you provide in the UI. No configuration needed!

If you want to set a default backend URL, you can create a `.env` file:

```bash
# .env (in project root)
VITE_DEFAULT_API_URL=https://your-url.modal.run
```

Then update `src/context/ApiContext.jsx` to use this default.

### 4. Start Development Server

```bash
npm run dev
# or
pnpm dev
```

The app will start at: **http://localhost:5173**

### 5. Connect to Backend

1. Open http://localhost:5173 in your browser
2. In the sidebar, enter your backend URL:
   ```
   https://your-username--omniasr-llm-7b-fastapi-app.modal.run
   ```
3. (Optional) Enter API key if you configured authentication
4. Click **"Connect"**
5. You should see "Connected" status and available languages

---

## 🏃 Running Locally

### Full Stack (Backend + Frontend)

#### Terminal 1: Backend (Modal)

```bash
# Deploy to Modal (serverless)
cd backend
modal deploy omni_modal.py

# Note: Modal runs in the cloud, not locally
# You'll get a URL like: https://your-url.modal.run
```

#### Terminal 2: Frontend (React)

```bash
# Start frontend dev server
npm run dev

# Open http://localhost:5173
```

### Frontend Only (Using Deployed Backend)

If your backend is already deployed on Modal:

```bash
# Just run the frontend
npm run dev

# Connect to: https://ahmedezzat0247--omniasr-llm-7b-fastapi-app.modal.run
```

---

## 🌐 Production Deployment

### Backend (Already Deployed)

Your backend is already running on Modal in production mode:
```
https://ahmedezzat0247--omniasr-llm-7b-fastapi-app.modal.run
```

To update it:
```bash
cd backend
modal deploy omni_modal.py
```

### Frontend Deployment Options

#### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts to deploy
```

#### Option 2: Netlify

```bash
# Build the app
npm run build

# Deploy the `dist` folder to Netlify
# Via Netlify CLI or drag-and-drop at netlify.com
```

#### Option 3: GitHub Pages

```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts:
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"

# Deploy
npm run deploy
```

#### Option 4: Docker

```bash
# Build Docker image
docker build -f Dockerfile.frontend -t omniasr-frontend .

# Run container
docker run -p 3000:80 omniasr-frontend

# Access at http://localhost:3000
```

### Environment Variables for Production

Set these in your hosting platform (Vercel, Netlify, etc.):

```env
VITE_DEFAULT_API_URL=https://your-backend-url.modal.run
```

---

## 📱 Using the Application

### 1. Connect to Backend

- Enter backend URL
- (Optional) Enter API key
- Click "Connect"
- Wait for "Connected" status

### 2. Select Language

Choose from 2000+ supported languages in the dropdown.

### 3. Upload Audio File

**Supported formats:**
- MP3, WAV, MP4, WebM, OGG, M4A, FLAC

**File size limit:**
- Maximum: 100MB

**Processing modes:**
- **Standard mode**: For audio <40 seconds
- **Large file mode**: For audio >40 seconds (uses VAD chunking)

### 4. Transcribe

- Click "Transcribe" button
- Wait for processing (progress shown)
- View results with:
  - Full transcription text
  - Segment timeline with timestamps
  - Processing metrics
  - Export options (TXT, JSON, SRT)

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v --cov
```

### Frontend Tests

```bash
npm run test
# or
pnpm test
```

### Manual Testing Checklist

- [ ] Health check endpoint responds
- [ ] Languages load successfully
- [ ] Short audio (<40s) transcribes correctly
- [ ] Long audio (>40s) transcribes with VAD
- [ ] API key authentication works
- [ ] Error messages display properly
- [ ] Export functionality works (TXT, JSON, SRT)
- [ ] Segment timeline displays correctly

---

## 🐛 Troubleshooting

### Backend Issues

#### "Runner failed with exception: timeout"

**Solution**: The model is downloading. This happens on first deployment.

```bash
# Pre-download models first
modal run backend/omni_modal.py::download_model

# Then deploy
modal deploy backend/omni_modal.py
```

#### "GitHub rate limit exceeded"

**Solution**: Wait 10-15 minutes and try again. The retry logic will handle it.

```bash
# Check rate limit status
curl -I https://api.github.com/rate_limit

# Wait until reset time, then retry
modal deploy backend/omni_modal.py
```

#### "API key invalid"

**Solution**: Check your API key configuration.

```bash
# Verify API keys in backend/.env
cat backend/.env | grep API_KEYS

# Redeploy with new keys
modal deploy backend/omni_modal.py
```

### Frontend Issues

#### "Cannot connect to backend"

**Causes & Solutions:**

1. **Wrong URL**: Verify backend URL is correct
   ```
   https://your-username--omniasr-llm-7b-fastapi-app.modal.run
   ```

2. **CORS error**: Add your frontend URL to backend `ALLOWED_ORIGINS`
   ```env
   ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
   ```

3. **Backend not deployed**: Deploy backend first
   ```bash
   modal deploy backend/omni_modal.py
   ```

#### "File upload fails"

**Check:**
- File size < 100MB
- File format is supported (MP3, WAV, etc.)
- Backend is running and connected

#### "Timeout error"

**Solution**: For very large files, increase timeout in `src/context/ApiContext.jsx`:

```javascript
// Line 25
timeout: 600000, // Increase to 10 minutes
```

#### Dependencies not installing

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Or with pnpm
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### General Issues

#### Port already in use

```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or use a different port
npm run dev -- --port 3000
```

#### Modal authentication issues

```bash
# Re-authenticate
modal token new

# Verify authentication
modal token list
```

---

## 📊 Performance Tips

### Backend Optimization

1. **Keep containers warm**: Set `min_containers=1` to avoid cold starts
   ```python
   @app.cls(
       min_containers=1,  # Keeps 1 container always ready
       ...
   )
   ```

2. **Increase concurrency**: For high traffic
   ```python
   @modal.concurrent(max_inputs=20, target_inputs=10)
   ```

3. **Monitor usage**: Check Modal dashboard for metrics

### Frontend Optimization

1. **Build for production**:
   ```bash
   npm run build
   ```

2. **Enable caching**: Results are cached in browser

3. **Lazy loading**: Components load on demand

---

## 🔐 Security Best Practices

### Backend

1. **Enable API key authentication**:
   ```env
   API_KEYS=your-secret-key-1,your-secret-key-2
   ```

2. **Configure CORS properly**:
   ```env
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

3. **Set rate limits**:
   ```env
   RATE_LIMIT_PER_MINUTE=10
   ```

4. **Monitor logs**: Check Modal dashboard for suspicious activity

### Frontend

1. **Never commit API keys**: Use environment variables
2. **Use HTTPS**: Always in production
3. **Validate input**: File size and type checks
4. **Handle errors gracefully**: Don't expose internal details

---

## 📚 Additional Resources

### Documentation

- [README.md](./README_UPDATED.md) - Project overview
- [API.md](./docs/API.md) - API reference
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Deployment guide
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Change log

### External Links

- [Modal Documentation](https://modal.com/docs)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [OmniLingual ASR Model](https://huggingface.co/omniASR_LLM_7B_v2)

---

## 🆘 Getting Help

### Issues

Report issues on GitHub:
```
https://github.com/Ahmed-Ezzat20/synobses_demo/issues
```

### Logs

**Backend logs**:
```bash
modal app logs omniasr-llm-7b --follow
```

**Frontend logs**:
- Check browser console (F12)
- Check terminal where `npm run dev` is running

---

## 🎉 Quick Reference

### Backend Commands

```bash
# Deploy backend
modal deploy backend/omni_modal.py

# View logs
modal app logs omniasr-llm-7b --follow

# Check status
modal app list

# Stop app
modal app stop omniasr-llm-7b
```

### Frontend Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test
```

### URLs

- **Backend API**: https://ahmedezzat0247--omniasr-llm-7b-fastapi-app.modal.run
- **API Docs**: https://ahmedezzat0247--omniasr-llm-7b-fastapi-app.modal.run/docs
- **Frontend (local)**: http://localhost:5173

---

**Version**: 2.3.0  
**Last Updated**: January 4, 2026  
**Status**: ✅ Production Ready
