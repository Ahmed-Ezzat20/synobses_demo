# API Documentation

Complete reference for the OmniASR REST API.

---

## Base URL

```
https://your-backend.modal.run
```

---

## Authentication

API key authentication is optional and configured via environment variables.

### Using API Keys

If authentication is enabled, include the API key in the request header:

```http
X-API-Key: your-api-key-here
```

### Example with curl

```bash
curl -H "X-API-Key: your-api-key" \
     https://your-backend.modal.run/health
```

### Example with JavaScript

```javascript
const response = await fetch('https://your-backend.modal.run/health', {
  headers: {
    'X-API-Key': 'your-api-key'
  }
});
```

---

## Rate Limiting

All endpoints are rate-limited to prevent abuse.

**Default Limits**:
- `/health`: 30 requests/minute
- `/languages`: 10 requests/minute
- `/transcribe`: 20 requests/minute
- `/transcribe_large`: 10 requests/minute

**Rate Limit Headers**:
```http
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1609459200
```

**429 Response** (Too Many Requests):
```json
{
  "error": "RateLimitExceeded",
  "message": "Rate limit exceeded. Please try again later.",
  "request_id": "req-123456"
}
```

---

## Common Response Headers

All responses include:

```http
X-Request-ID: req-abc123-456
X-Process-Time: 0.123
Content-Type: application/json
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "request_id": "req-123456"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing API key |
| 403 | Forbidden | Invalid API key |
| 413 | Payload Too Large | File too large |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Endpoints

### 1. Health Check

Check if the service is operational.

**Endpoint**: `GET /health`

**Rate Limit**: 30/minute

**Authentication**: Not required

**Response**:
```json
{
  "status": "healthy",
  "service": "OmniASR",
  "timestamp": 1704182400.123,
  "version": "2.3.0"
}
```

**Example**:
```bash
curl https://your-backend.modal.run/health
```

---

### 2. Get Supported Languages

Retrieve list of supported languages with optional filtering and pagination.

**Endpoint**: `GET /languages`

**Rate Limit**: 10/minute

**Authentication**: Required (if enabled)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `search` | string | No | - | Filter languages by substring |
| `limit` | integer | No | 100 | Max results (1-2000) |
| `offset` | integer | No | 0 | Pagination offset |

**Response**:
```json
{
  "total": 150,
  "count": 100,
  "languages": [
    "eng_Latn",
    "arb_Arab",
    "spa_Latn",
    "fra_Latn",
    "deu_Latn",
    ...
  ]
}
```

**Examples**:

```bash
# Get all languages
curl https://your-backend.modal.run/languages

# Search for English variants
curl https://your-backend.modal.run/languages?search=eng

# Pagination
curl https://your-backend.modal.run/languages?limit=50&offset=50
```

---

### 3. Transcribe Short Audio

Transcribe audio files under 40 seconds.

**Endpoint**: `POST /transcribe`

**Rate Limit**: 20/minute

**Authentication**: Required (if enabled)

**Content-Type**: `multipart/form-data`

**Form Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | file | Yes | Audio file to transcribe |

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `language` | string | Yes | Language code (e.g., 'eng_Latn') |

**Supported File Types**:
- MP3 (.mp3)
- WAV (.wav)
- MP4 (.mp4)
- WebM (.webm)
- OGG (.ogg)
- M4A (.m4a)
- FLAC (.flac)

**Max File Size**: 100MB

**Response**:
```json
{
  "transcription": "Hello, this is a test transcription.",
  "language": "eng_Latn",
  "processing_time": 1.234,
  "audio_duration": 10.5,
  "segments_count": 1,
  "segments": [
    {
      "start": 0.0,
      "end": 10.5,
      "text": "Hello, this is a test transcription."
    }
  ],
  "request_id": "abc123-456"
}
```

**Examples**:

```bash
# Basic transcription
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -F "file=@audio.mp3" \
  "https://your-backend.modal.run/transcribe?language=eng_Latn"

# With different language
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -F "file=@audio.wav" \
  "https://your-backend.modal.run/transcribe?language=arb_Arab"
```

**JavaScript Example**:
```javascript
const formData = new FormData();
formData.append('file', audioFile);

const response = await fetch(
  'https://your-backend.modal.run/transcribe?language=eng_Latn',
  {
    method: 'POST',
    headers: {
      'X-API-Key': 'your-api-key'
    },
    body: formData
  }
);

const result = await response.json();
console.log(result.transcription);
```

**Error Responses**:

**400 - File Too Long**:
```json
{
  "error": "HTTPException",
  "message": "File too long (45.2s). Please use /transcribe_large for files > 40s.",
  "request_id": "req-123"
}
```

**400 - Unsupported Language**:
```json
{
  "error": "HTTPException",
  "message": "Unsupported language: xyz_Latn. Use /languages endpoint to get supported languages.",
  "request_id": "req-123"
}
```

**400 - Invalid File**:
```json
{
  "error": "HTTPException",
  "message": "Invalid file type: text/plain. Allowed types: audio/mpeg, audio/wav, ...",
  "request_id": "req-123"
}
```

---

### 4. Transcribe Large Audio

Transcribe audio files of any length using intelligent Voice Activity Detection (VAD) for automatic segmentation.

**Endpoint**: `POST /transcribe_large`

**Rate Limit**: 10/minute

**Authentication**: Required (if enabled)

**Content-Type**: `multipart/form-data`

**Parameters**: Same as `/transcribe`

**Processing**:
1. Audio is analyzed with Silero VAD
2. Speech segments are automatically detected
3. Segments are transcribed in batches
4. Results are combined with timestamps

**Response**:
```json
{
  "transcription": "First segment text. Second segment text. Third segment text.",
  "language": "eng_Latn",
  "processing_time": 12.456,
  "audio_duration": 120.0,
  "segments_count": 3,
  "segments": [
    {
      "start": 0.0,
      "end": 38.5,
      "text": "First segment text."
    },
    {
      "start": 39.2,
      "end": 75.8,
      "text": "Second segment text."
    },
    {
      "start": 76.5,
      "end": 120.0,
      "text": "Third segment text."
    }
  ],
  "request_id": "def789-012"
}
```

**Examples**:

```bash
# Transcribe long audio
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -F "file=@long_audio.mp3" \
  "https://your-backend.modal.run/transcribe_large?language=eng_Latn"
```

**Benefits**:
- Handles arbitrarily long audio
- Automatic silence removal
- Detailed segment timestamps
- Batch processing for efficiency

---

## Response Fields

### Transcription Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `transcription` | string | Full transcription text |
| `language` | string | Language code used |
| `processing_time` | float | Processing time in seconds |
| `audio_duration` | float | Audio duration in seconds |
| `segments_count` | integer | Number of segments |
| `segments` | array | Array of segment objects |
| `request_id` | string | Unique request identifier |

### Segment Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `start` | float | Start time in seconds |
| `end` | float | End time in seconds |
| `text` | string | Transcribed text for segment |

---

## Best Practices

### 1. Choose the Right Endpoint

- **Use `/transcribe`** for:
  - Audio <40 seconds
  - Real-time transcription needs
  - Simple use cases

- **Use `/transcribe_large`** for:
  - Audio >40 seconds
  - Need for detailed timestamps
  - Long recordings (meetings, lectures)

### 2. Handle Errors Gracefully

```javascript
try {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.json();
    console.error(`Error: ${error.message}`);
    // Handle specific error codes
    if (response.status === 429) {
      // Wait and retry
    }
  }
  
  const result = await response.json();
  // Process result
} catch (error) {
  console.error('Network error:', error);
}
```

### 3. Implement Retry Logic

```javascript
async function transcribeWithRetry(file, language, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await transcribe(file, language);
    } catch (error) {
      if (error.status === 429) {
        // Rate limited, wait and retry
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else if (i === maxRetries - 1) {
        throw error;
      }
    }
  }
}
```

### 4. Validate Files Client-Side

```javascript
function validateFile(file) {
  const maxSize = 100 * 1024 * 1024; // 100MB
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4'];
  
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }
}
```

### 5. Use Request IDs for Debugging

Always log the `request_id` from responses for troubleshooting:

```javascript
const result = await transcribe(file, language);
console.log(`Transcription completed: ${result.request_id}`);
```

---

## Rate Limit Handling

### Check Remaining Requests

```javascript
const response = await fetch(url, options);
const remaining = response.headers.get('X-RateLimit-Remaining');
const reset = response.headers.get('X-RateLimit-Reset');

if (remaining < 5) {
  console.warn('Approaching rate limit');
}
```

### Implement Backoff

```javascript
async function fetchWithBackoff(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || 60;
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }
    
    return response;
  }
  
  throw new Error('Max retries exceeded');
}
```

---

## WebSocket Support

Currently not supported. All transcription is request/response based.

For real-time transcription, poll the `/transcribe` endpoint or wait for future WebSocket support.

---

## Changelog

### v2.3.0 (Current)
- Added request ID tracking
- Enhanced error messages
- Improved validation
- Added rate limiting headers

### v2.2.0
- Added segment timestamps
- Improved VAD processing
- Performance optimizations

### v2.1.0
- Added `/transcribe_large` endpoint
- Silero VAD integration

### v2.0.0
- Initial public release

---

## Support

For API issues or questions:
- Check the [troubleshooting guide](DEPLOYMENT.md#troubleshooting)
- Review [GitHub issues](https://github.com/Ahmed-Ezzat20/synobses_demo/issues)
- Contact support with request ID for faster resolution

---

**Last Updated**: January 2026
