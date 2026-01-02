# OmniASR - Multilingual Speech Recognition Platform

![Version](https://img.shields.io/badge/version-2.3.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

Modern full-stack application for **OmniASR** Automatic Speech Recognition service with enterprise-grade features including security, monitoring, and comprehensive testing.

---

## 🚀 Features

### Core Functionality
- **Multilingual Support**: 100+ languages powered by OmniLingual ASR LLM 7B v2
- **Dual Processing Modes**: 
  - Standard mode for audio <40 seconds
  - Large file mode with intelligent VAD chunking for any length
- **Detailed Timestamps**: Segment-level transcription with precise timing
- **Export Options**: Download as TXT, JSON, or SRT subtitle format

### Security & Performance
- **API Key Authentication**: Optional authentication layer
- **Rate Limiting**: Configurable request throttling
- **Input Validation**: File type and size validation
- **Caching Layer**: LRU cache for improved performance
- **Request Tracking**: Unique request IDs for debugging

### Developer Experience
- **Comprehensive Testing**: Unit and integration tests for backend and frontend
- **CI/CD Pipeline**: Automated testing and deployment via GitHub Actions
- **Monitoring & Metrics**: Built-in metrics collection and logging
- **Type Safety**: Pydantic models for API validation
- **Error Handling**: Detailed error messages and recovery

---

## 📋 Prerequisites

### Backend
- Python 3.11+
- Modal.com account (for deployment)
- GPU access (L4 recommended)

### Frontend
- Node.js 18+
- npm or yarn

---

## 🛠️ Installation

### Clone Repository
```bash
git clone https://github.com/Ahmed-Ezzat20/synobses_demo.git
cd synobses_demo
```

### Backend Setup

1. **Install dependencies**:
```bash
cd backend
pip install -r requirements.txt
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Download models** (optional, for local testing):
```bash
modal run omni_modal.py::download_model
```

4. **Deploy to Modal**:
```bash
modal deploy omni_modal.py
```

### Frontend Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Start development server**:
```bash
npm run dev
```

3. **Build for production**:
```bash
npm run build
npm run preview  # Preview production build
```

---

## 🔧 Configuration

### Backend Configuration

Edit `backend/.env`:

```env
# API Keys (comma-separated, leave empty to disable auth)
API_KEYS=your-secret-key-1,your-secret-key-2

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:5173

# File Upload Limits
MAX_FILE_SIZE_MB=100

# Rate Limiting (requests per minute)
RATE_LIMIT_HEALTH=30
RATE_LIMIT_LANGUAGES=10
RATE_LIMIT_TRANSCRIBE=20
RATE_LIMIT_TRANSCRIBE_LARGE=10

# Logging
LOG_LEVEL=INFO

# Processing
BATCH_SIZE=4
GPU_TYPE=L4
MIN_CONTAINERS=0
```

### Frontend Configuration

The frontend automatically detects the backend URL. For production, you may want to set a default backend URL in `src/context/ApiContext.jsx`.

---

## 📖 Usage

### 1. Connect to Backend

1. Open the application in your browser
2. Enter your backend URL (e.g., `https://your-app.modal.run`)
3. (Optional) Enter API key if authentication is enabled
4. Click **Connect**

### 2. Transcribe Audio

1. **Select Language**: Choose from 100+ supported languages
2. **Choose Mode**: 
   - Standard (<40s): Fast processing for short clips
   - Large File: Intelligent chunking for longer audio
3. **Upload File**: Drag-and-drop or browse for audio file
4. **Transcribe**: Click the transcribe button and wait for results

### 3. Export Results

- **Copy**: Copy transcription to clipboard
- **Download TXT**: Plain text file
- **Download JSON**: Full data including metadata
- **Download SRT**: Subtitle format with timestamps

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

Run with coverage:
```bash
pytest tests/ --cov=. --cov-report=html
```

### Frontend Tests

```bash
npm test              # Run tests
npm run test:ui       # Run with UI
npm run test:coverage # Generate coverage report
```

### Linting

```bash
npm run lint          # ESLint
```

---

## 🚀 Deployment

### Backend Deployment (Modal.com)

1. **Set up Modal credentials**:
```bash
modal token new
```

2. **Deploy**:
```bash
cd backend
modal deploy omni_modal.py
```

3. **Monitor**:
```bash
modal app logs omniasr-llm-7b
```

### Frontend Deployment

#### Option 1: Netlify

```bash
npm run build
netlify deploy --prod --dir=dist
```

#### Option 2: Vercel

```bash
npm run build
vercel --prod
```

#### Option 3: Static Hosting (S3, GitHub Pages, etc.)

```bash
npm run build
# Upload contents of dist/ to your hosting provider
```

---

## 🏗️ Architecture

### Backend Architecture

```
┌─────────────────────────────────────────────┐
│           FastAPI Application               │
│  ┌─────────────────────────────────────┐   │
│  │  Rate Limiter & Authentication      │   │
│  └──────────────┬──────────────────────┘   │
│                 │                            │
│  ┌──────────────▼──────────────────────┐   │
│  │     API Endpoints                   │   │
│  │  /health  /languages  /transcribe   │   │
│  └──────────────┬──────────────────────┘   │
│                 │                            │
│  ┌──────────────▼──────────────────────┐   │
│  │   Validation & Caching Layer        │   │
│  └──────────────┬──────────────────────┘   │
│                 │                            │
│  ┌──────────────▼──────────────────────┐   │
│  │      OmniASR Model (Modal)          │   │
│  │  ┌────────────┐  ┌──────────────┐  │   │
│  │  │ ASR Model  │  │  Silero VAD  │  │   │
│  │  └────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Frontend Architecture

```
┌─────────────────────────────────────────────┐
│              React Application              │
│  ┌─────────────────────────────────────┐   │
│  │         ApiContext Provider          │   │
│  │  (State Management & HTTP Client)    │   │
│  └──────────────┬──────────────────────┘   │
│                 │                            │
│  ┌──────────────▼──────────────────────┐   │
│  │          App Component               │   │
│  │  ┌────────────────────────────────┐ │   │
│  │  │  Sidebar (Connection)          │ │   │
│  │  ├────────────────────────────────┤ │   │
│  │  │  LanguageSelector              │ │   │
│  │  ├────────────────────────────────┤ │   │
│  │  │  ModeToggler                   │ │   │
│  │  ├────────────────────────────────┤ │   │
│  │  │  FileUpload                    │ │   │
│  │  ├────────────────────────────────┤ │   │
│  │  │  ResultsCard (with Export)     │ │   │
│  │  └────────────────────────────────┘ │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 📊 API Documentation

Once deployed, access interactive API documentation at:
- **Swagger UI**: `https://your-backend.modal.run/docs`
- **ReDoc**: `https://your-backend.modal.run/redoc`

### Key Endpoints

#### `GET /health`
Health check endpoint.

**Response**:
```json
{
  "status": "healthy",
  "service": "OmniASR",
  "timestamp": 1234567890.123,
  "version": "2.3.0"
}
```

#### `GET /languages`
Get supported languages.

**Parameters**:
- `search` (optional): Filter languages
- `limit` (optional): Max results (default: 100)
- `offset` (optional): Pagination offset

**Response**:
```json
{
  "total": 150,
  "count": 100,
  "languages": ["eng_Latn", "arb_Arab", ...]
}
```

#### `POST /transcribe`
Transcribe short audio files (<40s).

**Parameters**:
- `file`: Audio file (multipart/form-data)
- `language`: Language code (query parameter)

**Headers** (if auth enabled):
- `X-API-Key`: Your API key

**Response**:
```json
{
  "transcription": "Hello world",
  "language": "eng_Latn",
  "processing_time": 1.234,
  "audio_duration": 5.0,
  "segments_count": 1,
  "segments": [
    {
      "start": 0.0,
      "end": 5.0,
      "text": "Hello world"
    }
  ],
  "request_id": "abc123-456"
}
```

#### `POST /transcribe_large`
Transcribe long audio files with VAD chunking.

Same parameters and response format as `/transcribe`, but optimized for longer files.

---

## 🔍 Monitoring & Metrics

### Metrics Collection

The backend automatically collects:
- **Transcription Metrics**: Duration, processing time, RTF
- **Request Metrics**: Endpoint usage, status codes
- **Error Metrics**: Error types and frequencies

### Logging

Structured logging with request IDs for tracing:

```
[2026-01-02 10:30:45] [INFO] [req-123] Starting transcription for audio.wav in eng_Latn
[2026-01-02 10:30:47] [INFO] [req-123] Transcription completed in 2.34s
```

### Accessing Logs

```bash
# Modal logs
modal app logs omniasr-llm-7b

# Follow logs in real-time
modal app logs omniasr-llm-7b --follow
```

---

## 🐛 Troubleshooting

### Common Issues

#### Backend Connection Failed
- **Symptom**: "Connection failed" error in frontend
- **Solutions**:
  - Verify backend URL is correct (no trailing slash)
  - Check CORS configuration in backend
  - Ensure backend is deployed and running
  - Check API key if authentication is enabled

#### File Upload Fails
- **Symptom**: "Invalid file type" or "File too large"
- **Solutions**:
  - Ensure file is audio format (MP3, WAV, etc.)
  - Check file size is under 100MB
  - Verify file is not corrupted

#### Transcription Takes Too Long
- **Symptom**: Request times out or takes >5 minutes
- **Solutions**:
  - Use Large File mode for audio >40s
  - Check GPU availability in Modal dashboard
  - Consider splitting very long files

#### API Key Authentication Issues
- **Symptom**: 401 or 403 errors
- **Solutions**:
  - Verify API key is correct
  - Check `API_KEYS` environment variable in backend
  - Ensure `X-API-Key` header is being sent

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pytest` for backend, `npm test` for frontend)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- **Backend**: Follow PEP 8, use type hints
- **Frontend**: Follow ESLint configuration
- **Commits**: Use conventional commit messages

---

## 📄 License

MIT © 2026 OmniASR

---

## 🙏 Acknowledgments

- **OmniLingual ASR**: For the powerful multilingual ASR model
- **Modal.com**: For serverless GPU infrastructure
- **Silero VAD**: For voice activity detection
- **React & FastAPI**: For excellent frameworks

---

## 📞 Support

For issues, questions, or feature requests:
- **GitHub Issues**: [Create an issue](https://github.com/Ahmed-Ezzat20/synobses_demo/issues)
- **Documentation**: See `/docs` folder for detailed guides

---

## 🗺️ Roadmap

### v2.4.0 (Planned)
- [ ] Real-time streaming transcription
- [ ] Speaker diarization
- [ ] Language auto-detection
- [ ] Audio recording in browser

### v2.5.0 (Future)
- [ ] Translation support
- [ ] Custom vocabulary
- [ ] Batch processing
- [ ] Mobile app

---

## 📈 Performance

### Benchmarks

| Audio Length | Mode | Processing Time | RTF |
|--------------|------|-----------------|-----|
| 10s | Standard | 1.2s | 0.12x |
| 30s | Standard | 3.5s | 0.12x |
| 120s | Large | 14.5s | 0.12x |
| 600s | Large | 72s | 0.12x |

*RTF (Real-Time Factor): Lower is better. 0.12x means processing is 8x faster than real-time.*

---

**Built with ❤️ by the OmniASR Team**
