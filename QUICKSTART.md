# ⚡ Quick Start Guide

Get OmniASR running in 2 minutes!

---

## 🎯 Fastest Way to Run

Your backend is already deployed and running! Just start the frontend:

### Step 1: Clone & Install

```bash
git clone https://github.com/Ahmed-Ezzat20/synobses_demo.git
cd synobses_demo
npm install
```

### Step 2: Run

```bash
npm run dev
```

Or use the quick start script:

```bash
./start.sh
```

### Step 3: Open & Connect

1. Open **http://localhost:5173** in your browser
2. Enter backend URL:
   ```
   https://ahmedezzat0247--omniasr-llm-7b-fastapi-app.modal.run
   ```
3. Click **"Connect"**
4. Upload audio and transcribe! 🎉

---

## 🎬 That's It!

You're ready to transcribe audio in 2000+ languages.

### What You Can Do:

✅ Upload audio files (MP3, WAV, MP4, etc.)  
✅ Choose from 2000+ languages  
✅ Get timestamped transcriptions  
✅ Export as TXT, JSON, or SRT  
✅ View segment timeline  
✅ See processing metrics  

---

## 📚 Need More Details?

- **Full Guide**: See [HOW_TO_RUN.md](./HOW_TO_RUN.md)
- **API Docs**: https://ahmedezzat0247--omniasr-llm-7b-fastapi-app.modal.run/docs
- **Project README**: [README_UPDATED.md](./README_UPDATED.md)

---

## 🐛 Troubleshooting

### Can't connect to backend?

Make sure you're using the correct URL:
```
https://ahmedezzat0247--omniasr-llm-7b-fastapi-app.modal.run
```

### Dependencies won't install?

```bash
rm -rf node_modules package-lock.json
npm install
```

### Port already in use?

```bash
npm run dev -- --port 3000
```

---

## 🚀 Deploy Your Own Backend

Want to deploy your own backend on Modal?

```bash
# Install Modal
pip install modal

# Authenticate
modal token new

# Deploy
cd backend
modal deploy omni_modal.py
```

See [HOW_TO_RUN.md](./HOW_TO_RUN.md) for complete backend setup.

---

**Happy Transcribing! 🎙️✨**
