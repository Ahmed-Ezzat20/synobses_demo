"""
Monitoring and metrics collection for OmniASR
"""
import time
import logging
from typing import Dict, Any, Optional
from collections import defaultdict
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class MetricsCollector:
    """Collect and track application metrics"""
    
    def __init__(self):
        self.metrics = defaultdict(list)
        self.counters = defaultdict(int)
        self.start_time = time.time()
    
    def record_transcription(
        self,
        request_id: str,
        language: str,
        audio_duration: float,
        processing_time: float,
        segments_count: int,
        mode: str,
        success: bool = True,
        error: Optional[str] = None
    ):
        """Record transcription metrics"""
        metric = {
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": request_id,
            "language": language,
            "audio_duration": audio_duration,
            "processing_time": processing_time,
            "segments_count": segments_count,
            "mode": mode,
            "success": success,
            "error": error,
            "rtf": processing_time / audio_duration if audio_duration > 0 else 0  # Real-time factor
        }
        
        self.metrics["transcriptions"].append(metric)
        self.counters[f"transcriptions_{mode}"] += 1
        
        if success:
            self.counters["transcriptions_success"] += 1
        else:
            self.counters["transcriptions_failed"] += 1
        
        logger.info(f"[METRICS] Transcription recorded: {json.dumps(metric)}")
    
    def record_request(self, endpoint: str, method: str, status_code: int, duration: float):
        """Record API request metrics"""
        metric = {
            "timestamp": datetime.utcnow().isoformat(),
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "duration": duration
        }
        
        self.metrics["requests"].append(metric)
        self.counters[f"requests_{endpoint}"] += 1
        self.counters[f"status_{status_code}"] += 1
        
        logger.debug(f"[METRICS] Request recorded: {json.dumps(metric)}")
    
    def record_error(self, error_type: str, error_message: str, request_id: Optional[str] = None):
        """Record error metrics"""
        metric = {
            "timestamp": datetime.utcnow().isoformat(),
            "error_type": error_type,
            "error_message": error_message,
            "request_id": request_id
        }
        
        self.metrics["errors"].append(metric)
        self.counters[f"errors_{error_type}"] += 1
        
        logger.error(f"[METRICS] Error recorded: {json.dumps(metric)}")
    
    def get_summary(self) -> Dict[str, Any]:
        """Get metrics summary"""
        uptime = time.time() - self.start_time
        
        # Calculate averages for transcriptions
        transcriptions = self.metrics.get("transcriptions", [])
        avg_processing_time = 0
        avg_audio_duration = 0
        avg_rtf = 0
        
        if transcriptions:
            successful = [t for t in transcriptions if t["success"]]
            if successful:
                avg_processing_time = sum(t["processing_time"] for t in successful) / len(successful)
                avg_audio_duration = sum(t["audio_duration"] for t in successful) / len(successful)
                avg_rtf = sum(t["rtf"] for t in successful) / len(successful)
        
        return {
            "uptime_seconds": round(uptime, 2),
            "counters": dict(self.counters),
            "averages": {
                "processing_time": round(avg_processing_time, 3),
                "audio_duration": round(avg_audio_duration, 2),
                "real_time_factor": round(avg_rtf, 3)
            },
            "total_transcriptions": len(transcriptions),
            "total_requests": len(self.metrics.get("requests", [])),
            "total_errors": len(self.metrics.get("errors", []))
        }
    
    def get_recent_metrics(self, metric_type: str, limit: int = 100) -> list:
        """Get recent metrics of a specific type"""
        return self.metrics.get(metric_type, [])[-limit:]
    
    def reset(self):
        """Reset all metrics"""
        self.metrics.clear()
        self.counters.clear()
        self.start_time = time.time()
        logger.info("[METRICS] Metrics reset")


# Global metrics collector instance
metrics_collector = MetricsCollector()


def get_metrics_collector() -> MetricsCollector:
    """Get the global metrics collector instance"""
    return metrics_collector
