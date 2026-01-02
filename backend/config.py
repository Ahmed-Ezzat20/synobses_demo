"""
Configuration management for OmniASR backend
"""
import os
from typing import List, Set
from pydantic import BaseModel, Field, validator


class Settings(BaseModel):
    """Application settings"""
    
    # API Configuration
    api_title: str = Field(default="OmniASR API", description="API title")
    api_version: str = Field(default="2.3.0", description="API version")
    api_description: str = Field(
        default="Multilingual Automatic Speech Recognition API with intelligent audio processing",
        description="API description"
    )
    
    # Security
    api_keys: Set[str] = Field(default_factory=set, description="Valid API keys")
    allowed_origins: List[str] = Field(default=["*"], description="Allowed CORS origins")
    
    # Model Configuration
    model_card: str = Field(default="omniASR_LLM_7B_v2", description="Model card name")
    model_dir: str = Field(default="/model", description="Model cache directory")
    
    # File Upload Limits
    max_file_size: int = Field(default=100 * 1024 * 1024, description="Maximum file size in bytes")
    allowed_mime_types: List[str] = Field(
        default=[
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave',
            'audio/x-wav', 'audio/mp4', 'audio/webm', 'audio/ogg',
            'video/mp4', 'video/webm'
        ],
        description="Allowed MIME types"
    )
    
    # Rate Limiting (requests per minute)
    rate_limit_health: str = Field(default="30/minute", description="Rate limit for health endpoint")
    rate_limit_languages: str = Field(default="10/minute", description="Rate limit for languages endpoint")
    rate_limit_transcribe: str = Field(default="20/minute", description="Rate limit for transcribe endpoint")
    rate_limit_transcribe_large: str = Field(default="10/minute", description="Rate limit for large transcribe endpoint")
    
    # Processing Configuration
    vad_min_speech_duration_ms: int = Field(default=250, description="Minimum speech duration for VAD")
    vad_max_speech_duration_s: int = Field(default=40, description="Maximum speech duration for VAD")
    vad_min_silence_duration_ms: int = Field(default=500, description="Minimum silence duration for VAD")
    vad_speech_pad_ms: int = Field(default=100, description="Speech padding for VAD")
    batch_size: int = Field(default=4, description="Batch size for transcription")
    
    # Logging
    log_level: str = Field(default="INFO", description="Logging level")
    
    # Modal Configuration
    gpu_type: str = Field(default="L4", description="GPU type for Modal")
    scaledown_window: int = Field(default=1800, description="Scaledown window in seconds")
    timeout: int = Field(default=1200, description="Timeout in seconds")
    min_containers: int = Field(default=0, description="Minimum number of containers")
    max_inputs: int = Field(default=10, description="Maximum concurrent inputs")
    target_inputs: int = Field(default=8, description="Target concurrent inputs")
    
    @validator('api_keys', pre=True)
    def parse_api_keys(cls, v):
        """Parse API keys from environment variable"""
        if isinstance(v, str):
            keys = set(k.strip() for k in v.split(',') if k.strip())
            return keys
        return v
    
    @validator('allowed_origins', pre=True)
    def parse_allowed_origins(cls, v):
        """Parse allowed origins from environment variable"""
        if isinstance(v, str):
            origins = [o.strip() for o in v.split(',') if o.strip()]
            return origins
        return v
    
    @validator('log_level')
    def validate_log_level(cls, v):
        """Validate log level"""
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in valid_levels:
            raise ValueError(f"Invalid log level. Must be one of: {', '.join(valid_levels)}")
        return v.upper()
    
    class Config:
        env_prefix = ""
        case_sensitive = False


def load_settings() -> Settings:
    """Load settings from environment variables"""
    return Settings(
        api_keys=os.getenv("API_KEYS", ""),
        allowed_origins=os.getenv("ALLOWED_ORIGINS", "*"),
        model_card=os.getenv("MODEL_CARD", "omniASR_LLM_7B_v2"),
        model_dir=os.getenv("MODEL_DIR", "/model"),
        max_file_size=int(os.getenv("MAX_FILE_SIZE_MB", "100")) * 1024 * 1024,
        rate_limit_health=os.getenv("RATE_LIMIT_HEALTH", "30/minute"),
        rate_limit_languages=os.getenv("RATE_LIMIT_LANGUAGES", "10/minute"),
        rate_limit_transcribe=os.getenv("RATE_LIMIT_TRANSCRIBE", "20/minute"),
        rate_limit_transcribe_large=os.getenv("RATE_LIMIT_TRANSCRIBE_LARGE", "10/minute"),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
        batch_size=int(os.getenv("BATCH_SIZE", "4")),
        gpu_type=os.getenv("GPU_TYPE", "L4"),
        min_containers=int(os.getenv("MIN_CONTAINERS", "0")),
    )


# Global settings instance
settings = load_settings()
