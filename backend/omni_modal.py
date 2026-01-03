import modal
import os
import time
import tempfile
import json
import hashlib
import logging
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Form, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import magic

# Configuration
MODEL_DIR = "/model"
MODEL_CARD = "omniASR_LLM_7B_v2"
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
ALLOWED_MIME_TYPES = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 
    'audio/x-wav', 'audio/mp4', 'audio/webm', 'audio/ogg',
    'video/mp4', 'video/webm'  # Video files with audio tracks
]
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
API_KEYS = set(os.getenv("API_KEYS", "").split(",")) if os.getenv("API_KEYS") else set()

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Define container image
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("libsndfile1", "ffmpeg", "libmagic1")
    .uv_pip_install(
        "omnilingual-asr",
        "torch==2.8.0",
        "fairseq2==0.6.0",
        "fastapi[standard]",
        "pydantic",
        "librosa",
        "soundfile",
        "numpy",
        "torchaudio",
        "python-magic",
        "slowapi",
    )
    .env({"HF_HUB_CACHE": MODEL_DIR, "TORCH_HOME": MODEL_DIR})
)

model_cache = modal.Volume.from_name("omniasr-cache", create_if_missing=True)

app = modal.App(
    "omniasr-llm-7b",
    image=image,
)

# --- Request/Response Models ---


class Segment(BaseModel):
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")
    text: str = Field(..., description="Transcribed text for this segment")


class TranscriptionResponse(BaseModel):
    transcription: str = Field(..., description="Full transcription text")
    language: str = Field(..., description="Language code used for transcription")
    processing_time: float = Field(..., description="Processing time in seconds")
    audio_duration: float = Field(..., description="Audio duration in seconds")
    segments_count: Optional[int] = Field(None, description="Number of segments")
    segments: Optional[List[Segment]] = Field(None, description="Detailed segments with timestamps")
    request_id: str = Field(..., description="Unique request identifier")


class LanguageResponse(BaseModel):
    total: int = Field(..., description="Total number of languages")
    count: int = Field(..., description="Number of languages returned")
    languages: List[str] = Field(..., description="List of language codes")


class HealthResponse(BaseModel):
    status: str = Field(..., description="Service status")
    service: str = Field(..., description="Service name")
    timestamp: float = Field(..., description="Current timestamp")
    version: str = Field(..., description="API version")


class ErrorResponse(BaseModel):
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    request_id: Optional[str] = Field(None, description="Request identifier")


# --- Authentication ---


async def verify_api_key(x_api_key: Optional[str] = Header(None)) -> bool:
    """Verify API key if authentication is enabled"""
    if not API_KEYS or len(API_KEYS) == 0 or (len(API_KEYS) == 1 and "" in API_KEYS):
        # No API keys configured, allow all requests
        return True
    
    if not x_api_key:
        raise HTTPException(
            status_code=401,
            detail="API key required. Provide X-API-Key header."
        )
    
    if x_api_key not in API_KEYS:
        raise HTTPException(
            status_code=403,
            detail="Invalid API key"
        )
    
    return True


# --- Validation Functions ---


def validate_file_size(file_size: int) -> None:
    """Validate file size is within limits"""
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE / (1024*1024):.0f}MB"
        )
    if file_size == 0:
        raise HTTPException(
            status_code=400,
            detail="Empty file uploaded"
        )


def validate_file_type(file_bytes: bytes, filename: str) -> None:
    """Validate file type using magic numbers"""
    try:
        mime = magic.from_buffer(file_bytes, mime=True)
        logger.info(f"Detected MIME type: {mime} for file: {filename}")
        
        if mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {mime}. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}"
            )
    except Exception as e:
        logger.error(f"Error detecting file type: {e}")
        # Fallback to extension check
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ['.mp3', '.wav', '.mp4', '.webm', '.ogg', '.m4a', '.flac']:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file extension: {ext}"
            )


def generate_request_id(content: bytes) -> str:
    """Generate unique request ID based on content hash and timestamp"""
    content_hash = hashlib.sha256(content).hexdigest()[:16]
    timestamp = str(int(time.time() * 1000))[-8:]
    return f"{content_hash}-{timestamp}"


# --- Model & Logic ---


@app.function(timeout=3600, volumes={MODEL_DIR: model_cache})
def download_model():
    """Download and cache both the ASR model and Silero VAD."""
    from omnilingual_asr.models.inference.pipeline import ASRInferencePipeline
    import torch

    logger.info(f"📥 Downloading {MODEL_CARD}...")
    ASRInferencePipeline(model_card=MODEL_CARD)

    logger.info("📥 Downloading Silero VAD...")
    torch.hub.set_dir(MODEL_DIR)
    
    # Retry logic for GitHub rate limits
    max_retries = 3
    retry_delay = 60  # seconds
    
    for attempt in range(max_retries):
        try:
            torch.hub.load(
                repo_or_dir="snakers4/silero-vad", 
                model="silero_vad", 
                force_reload=False,  # Don't force reload to use cache if available
                trust_repo=True
            )
            logger.info("✅ Silero VAD downloaded successfully")
            break
        except Exception as e:
            if "rate limit" in str(e).lower() and attempt < max_retries - 1:
                logger.warning(f"⚠️ GitHub rate limit hit. Waiting {retry_delay}s before retry {attempt + 2}/{max_retries}...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            elif attempt == max_retries - 1:
                logger.error(f"❌ Failed to download Silero VAD after {max_retries} attempts: {e}")
                raise RuntimeError(f"Failed to download Silero VAD: {str(e)}")
            else:
                logger.error(f"❌ Error downloading Silero VAD: {e}")
                raise

    logger.info("✅ All models cached successfully.")


@app.cls(
    gpu="L4",
    scaledown_window=1800,
    timeout=3600,  # 1 hour timeout for model downloads
    volumes={MODEL_DIR: model_cache},
    min_containers=0,  # Changed to 0 to reduce costs when idle
)
@modal.concurrent(max_inputs=10, target_inputs=8)
class OmniASRModel:
    @modal.enter()
    def load_model(self):
        """Initialize models on container startup"""
        import torch
        from omnilingual_asr.models.inference.pipeline import ASRInferencePipeline
        from omnilingual_asr.models.wav2vec2_llama.lang_ids import supported_langs

        self.start_time = time.time()

        # Load ASR Pipeline
        logger.info(f"🚀 Loading {MODEL_CARD}...")
        self.pipeline = ASRInferencePipeline(model_card=MODEL_CARD)
        self.supported_languages = supported_langs

        # Load Silero VAD with retry logic
        logger.info("Loading Silero VAD...")
        torch.hub.set_dir(MODEL_DIR)
        
        max_retries = 3
        retry_delay = 30
        
        for attempt in range(max_retries):
            try:
                self.vad_model, utils = torch.hub.load(
                    repo_or_dir="snakers4/silero-vad", 
                    model="silero_vad", 
                    trust_repo=True,
                    force_reload=False  # Use cache if available
                )
                (self.get_speech_timestamps, _, self.read_audio, _, _) = utils
                logger.info("✅ Silero VAD loaded successfully")
                break
            except Exception as e:
                if "rate limit" in str(e).lower() and attempt < max_retries - 1:
                    logger.warning(f"⚠️ GitHub rate limit hit. Retrying in {retry_delay}s... (attempt {attempt + 2}/{max_retries})")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                elif attempt == max_retries - 1:
                    logger.error(f"❌ Failed to load Silero VAD after {max_retries} attempts")
                    raise RuntimeError(f"Failed to load Silero VAD: {str(e)}")
                else:
                    raise

        self.model_loaded = True
        logger.info("✅ Models ready!")

    @modal.method()
    def get_supported_languages(self, search: Optional[str] = None) -> List[str]:
        """Get list of supported languages with optional search filter"""
        languages = list(self.supported_languages)
        if search:
            search_lower = search.lower()
            languages = [l for l in languages if search_lower in l.lower()]
        return languages

    @modal.method()
    def validate_language(self, language: str) -> bool:
        """Validate if language is supported"""
        return language in self.supported_languages

    @modal.method()
    def transcribe(
        self,
        audio_bytes: bytes,
        filename: str,
        language: str,
        request_id: str,
    ) -> Dict[str, Any]:
        """Transcribe a single file (used for short files)"""
        import librosa

        logger.info(f"[{request_id}] Starting transcription for {filename} in {language}")
        
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=os.path.splitext(filename)[1]
        ) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            # Get audio duration
            try:
                duration = librosa.get_duration(path=tmp_path)
                logger.info(f"[{request_id}] Audio duration: {duration:.2f}s")
            except Exception as e:
                logger.error(f"[{request_id}] Error getting duration: {e}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid audio file: {str(e)}"
                )
            
            # Transcribe
            start = time.time()
            try:
                transcriptions = self.pipeline.transcribe(
                    [tmp_path],
                    lang=[language],
                )
                process_time = time.time() - start
                logger.info(f"[{request_id}] Transcription completed in {process_time:.2f}s")
            except Exception as e:
                logger.error(f"[{request_id}] Transcription error: {e}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Transcription failed: {str(e)}"
                )

            return {
                "transcription": transcriptions[0],
                "language": language,
                "processing_time": round(process_time, 3),
                "audio_duration": round(duration, 2),
                "segments_count": 1,
                "segments": [
                    {"start": 0.0, "end": round(duration, 2), "text": transcriptions[0]}
                ],
                "request_id": request_id,
            }
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    @modal.method()
    def transcribe_large(
        self, audio_bytes: bytes, filename: str, language: str, request_id: str
    ) -> Dict[str, Any]:
        """Split audio using Silero VAD and transcribe chunks with timestamps"""
        import soundfile as sf
        import torch

        logger.info(f"[{request_id}] Starting large file transcription for {filename}")
        
        suffix = os.path.splitext(filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as main_tmp:
            main_tmp.write(audio_bytes)
            main_path = main_tmp.name

        chunk_paths = []
        chunk_metadata = []  # Store start/end times

        try:
            # Read audio for VAD
            try:
                wav = self.read_audio(main_path, sampling_rate=16000)
            except Exception as e:
                logger.error(f"[{request_id}] Error reading audio: {e}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid audio file: {str(e)}"
                )

            # Get speech timestamps
            speech_timestamps = self.get_speech_timestamps(
                wav,
                self.vad_model,
                sampling_rate=16000,
                min_speech_duration_ms=250,
                max_speech_duration_s=40,
                min_silence_duration_ms=500,
                speech_pad_ms=100,
            )

            logger.info(f"[{request_id}] Found {len(speech_timestamps)} speech segments")

            if not speech_timestamps:
                logger.warning(f"[{request_id}] No speech detected, falling back to standard transcription")
                return self.transcribe.local(audio_bytes, filename, language, request_id)

            data, samplerate = sf.read(main_path)

            for i, ts in enumerate(speech_timestamps):
                # Calculate times
                start_sec = ts["start"] / 16000
                end_sec = ts["end"] / 16000

                # Convert samples to indices for cutting
                ratio = samplerate / 16000
                start_sample = int(ts["start"] * ratio)
                end_sample = int(ts["end"] * ratio)

                chunk_data = data[start_sample:end_sample]

                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as c_tmp:
                    sf.write(c_tmp.name, chunk_data, samplerate)
                    chunk_paths.append(c_tmp.name)
                    chunk_metadata.append({"start": start_sec, "end": end_sec})

            # Transcribe all chunks
            start_time = time.time()
            try:
                chunk_results = self.pipeline.transcribe(
                    chunk_paths, lang=[language] * len(chunk_paths), batch_size=4
                )
                processing_time = time.time() - start_time
                logger.info(f"[{request_id}] Batch transcription completed in {processing_time:.2f}s")
            except Exception as e:
                logger.error(f"[{request_id}] Batch transcription error: {e}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Transcription failed: {str(e)}"
                )

            # Combine results with timestamps
            detailed_segments = []
            full_text_parts = []

            for i, text in enumerate(chunk_results):
                text = text.strip()
                if text:
                    full_text_parts.append(text)
                    detailed_segments.append(
                        {
                            "start": round(chunk_metadata[i]["start"], 3),
                            "end": round(chunk_metadata[i]["end"], 3),
                            "text": text,
                        }
                    )

            full_transcription = " ".join(full_text_parts)
            total_duration = len(data) / samplerate

            logger.info(f"[{request_id}] Generated {len(detailed_segments)} segments")

            return {
                "transcription": full_transcription,
                "language": language,
                "processing_time": round(processing_time, 3),
                "audio_duration": round(total_duration, 2),
                "segments_count": len(detailed_segments),
                "segments": detailed_segments,
                "request_id": request_id,
            }

        finally:
            if os.path.exists(main_path):
                os.unlink(main_path)
            for p in chunk_paths:
                if os.path.exists(p):
                    os.unlink(p)


# --- FastAPI App ---

web_app = FastAPI(
    title="OmniASR API",
    version="2.3.0",
    description="Multilingual Automatic Speech Recognition API with intelligent audio processing",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
web_app.state.limiter = limiter
web_app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
web_app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request ID middleware
@web_app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add request ID to all requests"""
    request_id = request.headers.get("X-Request-ID", f"req-{int(time.time()*1000)}")
    request.state.request_id = request_id
    
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = str(round(process_time, 3))
    
    logger.info(f"[{request_id}] {request.method} {request.url.path} - {response.status_code} - {process_time:.3f}s")
    
    return response


# Exception handlers
@web_app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom HTTP exception handler"""
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"[{request_id}] HTTP {exc.status_code}: {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTPException",
            "message": exc.detail,
            "request_id": request_id,
        }
    )


@web_app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler"""
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"[{request_id}] Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred",
            "request_id": request_id,
        }
    )


@web_app.get(
    "/health",
    response_model=HealthResponse,
    tags=["1. Health"],
    summary="Health check endpoint"
)
@limiter.limit("30/minute")
async def health(request: Request):
    """Check if the service is healthy and operational"""
    return {
        "status": "healthy",
        "service": "OmniASR",
        "timestamp": time.time(),
        "version": "2.3.0"
    }


@web_app.get(
    "/languages",
    response_model=LanguageResponse,
    tags=["2. Supported Languages"],
    summary="Get supported languages",
    dependencies=[Depends(verify_api_key)]
)
@limiter.limit("10/minute")
async def get_supported_languages(
    request: Request,
    search: Optional[str] = Query(None, description="Search filter for language codes"),
    limit: int = Query(100, ge=1, le=2000, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Offset for pagination")
):
    """
    Retrieve list of supported language codes with optional search and pagination.
    
    - **search**: Filter languages by substring match (case-insensitive)
    - **limit**: Maximum number of languages to return (1-2000)
    - **offset**: Number of languages to skip for pagination
    """
    try:
        model = OmniASRModel()
        all_langs = model.get_supported_languages.remote(search)
        
        return {
            "total": len(all_langs),
            "count": len(all_langs[offset : offset + limit]),
            "languages": all_langs[offset : offset + limit],
        }
    except Exception as e:
        logger.error(f"Error fetching languages: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch supported languages")


@web_app.post(
    "/transcribe",
    response_model=TranscriptionResponse,
    tags=["3. Transcribe (<40s)"],
    summary="Transcribe short audio files",
    dependencies=[Depends(verify_api_key)]
)
@limiter.limit("20/minute")
async def transcribe(
    request: Request,
    file: UploadFile = File(..., description="Audio file to transcribe"),
    language: str = Query(..., description="Target language code (e.g., 'eng_Latn', 'arb_Arab')"),
):
    """
    Transcribe short audio files (recommended for <40 seconds).
    
    - **file**: Audio file (MP3, WAV, MP4, WebM, OGG)
    - **language**: Language code from /languages endpoint
    
    Returns transcription with timing information and metadata.
    """
    content = await file.read()
    request_id = generate_request_id(content)
    
    # Validate file size
    validate_file_size(len(content))
    
    # Validate file type
    validate_file_type(content, file.filename or "audio")
    
    # Validate language
    model = OmniASRModel()
    is_valid = model.validate_language.remote(language)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: {language}. Use /languages endpoint to get supported languages."
        )
    
    # Transcribe
    try:
        result = model.transcribe.remote(content, file.filename or "audio.wav", language, request_id)
        
        # Check duration and suggest large file mode if needed
        if result["audio_duration"] > 45.0:
            raise HTTPException(
                status_code=400,
                detail=f"File too long ({result['audio_duration']}s). Please use /transcribe_large for files > 40s.",
            )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{request_id}] Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@web_app.post(
    "/transcribe_large",
    response_model=TranscriptionResponse,
    tags=["4. Transcribe Large"],
    summary="Transcribe long audio files",
    dependencies=[Depends(verify_api_key)]
)
@limiter.limit("10/minute")
async def transcribe_large_file(
    request: Request,
    file: UploadFile = File(..., description="Audio file to transcribe"),
    language: str = Query(..., description="Target language code (e.g., 'eng_Latn', 'arb_Arab')"),
):
    """
    Transcribe long audio files using intelligent Voice Activity Detection (VAD).
    
    Automatically segments audio into speech chunks and provides detailed timestamps.
    
    - **file**: Audio file (MP3, WAV, MP4, WebM, OGG)
    - **language**: Language code from /languages endpoint
    
    Returns transcription with detailed segment timestamps.
    """
    content = await file.read()
    request_id = generate_request_id(content)
    
    # Validate file size
    validate_file_size(len(content))
    
    # Validate file type
    validate_file_type(content, file.filename or "audio")
    
    # Validate language
    model = OmniASRModel()
    is_valid = model.validate_language.remote(language)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: {language}. Use /languages endpoint to get supported languages."
        )
    
    # Transcribe
    try:
        result = model.transcribe_large.remote(
            content, file.filename or "audio.wav", language, request_id
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{request_id}] Large file transcription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.function()
@modal.asgi_app()
def fastapi_app():
    return web_app
