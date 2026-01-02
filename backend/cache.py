"""
Caching layer for OmniASR to improve performance
"""
import hashlib
import time
import logging
from typing import Optional, Dict, Any
from collections import OrderedDict

logger = logging.getLogger(__name__)


class LRUCache:
    """Simple LRU cache implementation"""
    
    def __init__(self, max_size: int = 100, ttl: int = 3600):
        """
        Initialize LRU cache
        
        Args:
            max_size: Maximum number of items in cache
            ttl: Time to live in seconds
        """
        self.cache: OrderedDict = OrderedDict()
        self.max_size = max_size
        self.ttl = ttl
        self.hits = 0
        self.misses = 0
    
    def _is_expired(self, timestamp: float) -> bool:
        """Check if cache entry is expired"""
        return time.time() - timestamp > self.ttl
    
    def get(self, key: str) -> Optional[Any]:
        """Get item from cache"""
        if key not in self.cache:
            self.misses += 1
            logger.debug(f"[CACHE] Miss: {key}")
            return None
        
        value, timestamp = self.cache[key]
        
        if self._is_expired(timestamp):
            del self.cache[key]
            self.misses += 1
            logger.debug(f"[CACHE] Expired: {key}")
            return None
        
        # Move to end (most recently used)
        self.cache.move_to_end(key)
        self.hits += 1
        logger.debug(f"[CACHE] Hit: {key}")
        return value
    
    def set(self, key: str, value: Any) -> None:
        """Set item in cache"""
        if key in self.cache:
            # Update existing item
            self.cache.move_to_end(key)
        elif len(self.cache) >= self.max_size:
            # Remove least recently used item
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
            logger.debug(f"[CACHE] Evicted: {oldest_key}")
        
        self.cache[key] = (value, time.time())
        logger.debug(f"[CACHE] Set: {key}")
    
    def delete(self, key: str) -> None:
        """Delete item from cache"""
        if key in self.cache:
            del self.cache[key]
            logger.debug(f"[CACHE] Deleted: {key}")
    
    def clear(self) -> None:
        """Clear all cache"""
        self.cache.clear()
        self.hits = 0
        self.misses = 0
        logger.info("[CACHE] Cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_requests = self.hits + self.misses
        hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": round(hit_rate, 2),
            "ttl": self.ttl
        }


class TranscriptionCache:
    """Cache for transcription results"""
    
    def __init__(self, max_size: int = 50, ttl: int = 3600):
        """
        Initialize transcription cache
        
        Args:
            max_size: Maximum number of cached transcriptions
            ttl: Time to live in seconds (default 1 hour)
        """
        self.cache = LRUCache(max_size=max_size, ttl=ttl)
    
    def _generate_key(self, audio_bytes: bytes, language: str, mode: str) -> str:
        """Generate cache key from audio content and parameters"""
        content_hash = hashlib.sha256(audio_bytes).hexdigest()
        return f"{mode}:{language}:{content_hash}"
    
    def get(self, audio_bytes: bytes, language: str, mode: str) -> Optional[Dict[str, Any]]:
        """Get cached transcription result"""
        key = self._generate_key(audio_bytes, language, mode)
        result = self.cache.get(key)
        
        if result:
            logger.info(f"[CACHE] Transcription cache hit for {mode}/{language}")
        
        return result
    
    def set(self, audio_bytes: bytes, language: str, mode: str, result: Dict[str, Any]) -> None:
        """Cache transcription result"""
        key = self._generate_key(audio_bytes, language, mode)
        self.cache.set(key, result)
        logger.info(f"[CACHE] Cached transcription for {mode}/{language}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return self.cache.get_stats()
    
    def clear(self) -> None:
        """Clear cache"""
        self.cache.clear()


class LanguageCache:
    """Cache for language list"""
    
    def __init__(self, ttl: int = 86400):  # 24 hours default
        """
        Initialize language cache
        
        Args:
            ttl: Time to live in seconds (default 24 hours)
        """
        self.languages: Optional[list] = None
        self.timestamp: Optional[float] = None
        self.ttl = ttl
    
    def get(self) -> Optional[list]:
        """Get cached language list"""
        if self.languages is None:
            return None
        
        if self.timestamp and time.time() - self.timestamp > self.ttl:
            logger.debug("[CACHE] Language cache expired")
            self.languages = None
            self.timestamp = None
            return None
        
        logger.debug("[CACHE] Language cache hit")
        return self.languages
    
    def set(self, languages: list) -> None:
        """Cache language list"""
        self.languages = languages
        self.timestamp = time.time()
        logger.info(f"[CACHE] Cached {len(languages)} languages")
    
    def clear(self) -> None:
        """Clear cache"""
        self.languages = None
        self.timestamp = None
        logger.info("[CACHE] Language cache cleared")


# Global cache instances
transcription_cache = TranscriptionCache(max_size=50, ttl=3600)
language_cache = LanguageCache(ttl=86400)


def get_transcription_cache() -> TranscriptionCache:
    """Get global transcription cache instance"""
    return transcription_cache


def get_language_cache() -> LanguageCache:
    """Get global language cache instance"""
    return language_cache
