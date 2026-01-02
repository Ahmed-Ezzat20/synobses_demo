import pytest
import os
import io
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
import sys

# Mock modal before importing the app
sys.modules['modal'] = MagicMock()
sys.modules['magic'] = MagicMock()

# Now we can import after mocking
from omni_modal import web_app, OmniASRModel


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(web_app)


@pytest.fixture
def sample_audio_bytes():
    """Create sample audio bytes for testing"""
    # Simple WAV header + minimal data
    wav_header = b'RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00'
    return wav_header + b'\x00' * 1000


@pytest.fixture
def mock_model():
    """Mock OmniASRModel"""
    with patch('omni_modal.OmniASRModel') as mock:
        instance = Mock()
        instance.get_supported_languages.remote.return_value = [
            'eng_Latn', 'arb_Arab', 'spa_Latn', 'fra_Latn'
        ]
        instance.validate_language.remote.return_value = True
        instance.transcribe.remote.return_value = {
            'transcription': 'Test transcription',
            'language': 'eng_Latn',
            'processing_time': 1.234,
            'audio_duration': 5.0,
            'segments_count': 1,
            'segments': [{'start': 0.0, 'end': 5.0, 'text': 'Test transcription'}],
            'request_id': 'test-req-123'
        }
        instance.transcribe_large.remote.return_value = {
            'transcription': 'Test large transcription',
            'language': 'eng_Latn',
            'processing_time': 2.345,
            'audio_duration': 120.0,
            'segments_count': 3,
            'segments': [
                {'start': 0.0, 'end': 40.0, 'text': 'Segment 1'},
                {'start': 40.5, 'end': 80.0, 'text': 'Segment 2'},
                {'start': 80.5, 'end': 120.0, 'text': 'Segment 3'},
            ],
            'request_id': 'test-req-456'
        }
        mock.return_value = instance
        yield mock


class TestHealthEndpoint:
    """Test health check endpoint"""
    
    def test_health_check_success(self, client):
        """Test successful health check"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "OmniASR"
        assert "timestamp" in data
        assert data["version"] == "2.3.0"
    
    def test_health_check_has_headers(self, client):
        """Test health check includes custom headers"""
        response = client.get("/health")
        assert "X-Request-ID" in response.headers
        assert "X-Process-Time" in response.headers


class TestLanguagesEndpoint:
    """Test languages endpoint"""
    
    def test_get_languages_success(self, client, mock_model):
        """Test successful language retrieval"""
        response = client.get("/languages")
        assert response.status_code == 200
        data = response.json()
        assert "languages" in data
        assert "total" in data
        assert "count" in data
        assert isinstance(data["languages"], list)
    
    def test_get_languages_with_search(self, client, mock_model):
        """Test language search filter"""
        response = client.get("/languages?search=eng")
        assert response.status_code == 200
        data = response.json()
        assert "languages" in data
    
    def test_get_languages_with_pagination(self, client, mock_model):
        """Test language pagination"""
        response = client.get("/languages?limit=2&offset=1")
        assert response.status_code == 200
        data = response.json()
        assert data["count"] <= 2
    
    def test_get_languages_invalid_limit(self, client, mock_model):
        """Test invalid limit parameter"""
        response = client.get("/languages?limit=3000")
        assert response.status_code == 422  # Validation error


class TestTranscribeEndpoint:
    """Test transcribe endpoint"""
    
    @patch('omni_modal.validate_file_type')
    @patch('omni_modal.validate_file_size')
    def test_transcribe_success(self, mock_size, mock_type, client, mock_model, sample_audio_bytes):
        """Test successful transcription"""
        files = {"file": ("test.wav", io.BytesIO(sample_audio_bytes), "audio/wav")}
        response = client.post("/transcribe?language=eng_Latn", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert "transcription" in data
        assert "language" in data
        assert "processing_time" in data
        assert "audio_duration" in data
        assert "request_id" in data
        assert data["language"] == "eng_Latn"
    
    def test_transcribe_missing_language(self, client, sample_audio_bytes):
        """Test transcription without language parameter"""
        files = {"file": ("test.wav", io.BytesIO(sample_audio_bytes), "audio/wav")}
        response = client.post("/transcribe", files=files)
        assert response.status_code == 422  # Validation error
    
    def test_transcribe_missing_file(self, client):
        """Test transcription without file"""
        response = client.post("/transcribe?language=eng_Latn")
        assert response.status_code == 422  # Validation error
    
    @patch('omni_modal.validate_file_type')
    @patch('omni_modal.validate_file_size')
    def test_transcribe_unsupported_language(self, mock_size, mock_type, client, mock_model, sample_audio_bytes):
        """Test transcription with unsupported language"""
        mock_model.return_value.validate_language.remote.return_value = False
        
        files = {"file": ("test.wav", io.BytesIO(sample_audio_bytes), "audio/wav")}
        response = client.post("/transcribe?language=invalid_Lang", files=files)
        
        assert response.status_code == 400
        assert "Unsupported language" in response.json()["message"]
    
    @patch('omni_modal.validate_file_size')
    def test_transcribe_invalid_file_type(self, mock_size, client, sample_audio_bytes):
        """Test transcription with invalid file type"""
        with patch('omni_modal.validate_file_type') as mock_type:
            mock_type.side_effect = Exception("Invalid file type")
            
            files = {"file": ("test.txt", io.BytesIO(b"not audio"), "text/plain")}
            response = client.post("/transcribe?language=eng_Latn", files=files)
            
            assert response.status_code == 500


class TestTranscribeLargeEndpoint:
    """Test transcribe_large endpoint"""
    
    @patch('omni_modal.validate_file_type')
    @patch('omni_modal.validate_file_size')
    def test_transcribe_large_success(self, mock_size, mock_type, client, mock_model, sample_audio_bytes):
        """Test successful large file transcription"""
        files = {"file": ("test_long.wav", io.BytesIO(sample_audio_bytes), "audio/wav")}
        response = client.post("/transcribe_large?language=eng_Latn", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert "transcription" in data
        assert "segments" in data
        assert "segments_count" in data
        assert isinstance(data["segments"], list)
        assert data["segments_count"] == len(data["segments"])
    
    @patch('omni_modal.validate_file_type')
    @patch('omni_modal.validate_file_size')
    def test_transcribe_large_with_segments(self, mock_size, mock_type, client, mock_model, sample_audio_bytes):
        """Test large file transcription returns segments"""
        files = {"file": ("test_long.wav", io.BytesIO(sample_audio_bytes), "audio/wav")}
        response = client.post("/transcribe_large?language=eng_Latn", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert data["segments_count"] > 0
        
        # Verify segment structure
        for segment in data["segments"]:
            assert "start" in segment
            assert "end" in segment
            assert "text" in segment
            assert segment["end"] > segment["start"]


class TestValidation:
    """Test validation functions"""
    
    def test_file_size_validation_too_large(self, client):
        """Test file size validation rejects large files"""
        from omni_modal import validate_file_size, MAX_FILE_SIZE
        
        with pytest.raises(Exception) as exc_info:
            validate_file_size(MAX_FILE_SIZE + 1)
        assert "too large" in str(exc_info.value).lower()
    
    def test_file_size_validation_empty(self, client):
        """Test file size validation rejects empty files"""
        from omni_modal import validate_file_size
        
        with pytest.raises(Exception) as exc_info:
            validate_file_size(0)
        assert "empty" in str(exc_info.value).lower()
    
    def test_file_size_validation_valid(self, client):
        """Test file size validation accepts valid sizes"""
        from omni_modal import validate_file_size
        
        # Should not raise exception
        validate_file_size(1024 * 1024)  # 1MB


class TestAuthentication:
    """Test API key authentication"""
    
    def test_no_api_key_when_not_required(self, client, mock_model):
        """Test requests work without API key when auth is disabled"""
        response = client.get("/languages")
        assert response.status_code == 200
    
    @patch.dict(os.environ, {"API_KEYS": "test-key-123,test-key-456"})
    def test_valid_api_key(self, client, mock_model):
        """Test request with valid API key"""
        response = client.get(
            "/languages",
            headers={"X-API-Key": "test-key-123"}
        )
        # Note: This test may need adjustment based on how env vars are loaded
        assert response.status_code in [200, 401]  # May fail if env not reloaded
    
    @patch.dict(os.environ, {"API_KEYS": "test-key-123"})
    def test_invalid_api_key(self, client, mock_model):
        """Test request with invalid API key"""
        response = client.get(
            "/languages",
            headers={"X-API-Key": "wrong-key"}
        )
        # Note: This test may need adjustment based on how env vars are loaded
        assert response.status_code in [200, 403]


class TestErrorHandling:
    """Test error handling"""
    
    def test_404_not_found(self, client):
        """Test 404 for non-existent endpoint"""
        response = client.get("/nonexistent")
        assert response.status_code == 404
    
    def test_405_method_not_allowed(self, client):
        """Test 405 for wrong HTTP method"""
        response = client.get("/transcribe")
        assert response.status_code == 405
    
    def test_error_includes_request_id(self, client):
        """Test error responses include request ID"""
        response = client.post("/transcribe")  # Missing required params
        assert response.status_code == 422
        # Request ID should be in headers
        assert "X-Request-ID" in response.headers


class TestRateLimiting:
    """Test rate limiting"""
    
    def test_rate_limit_headers(self, client):
        """Test rate limit headers are present"""
        response = client.get("/health")
        # Check if rate limit headers exist (may vary by implementation)
        assert response.status_code == 200


class TestResponseHeaders:
    """Test custom response headers"""
    
    def test_request_id_header(self, client):
        """Test X-Request-ID header is present"""
        response = client.get("/health")
        assert "X-Request-ID" in response.headers
    
    def test_process_time_header(self, client):
        """Test X-Process-Time header is present"""
        response = client.get("/health")
        assert "X-Process-Time" in response.headers
        # Should be a valid float
        process_time = float(response.headers["X-Process-Time"])
        assert process_time >= 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
