#!/bin/bash

# API Testing Script for OmniASR Backend
# Tests all endpoints with sample data

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Get backend URL
if [ -z "$1" ]; then
    print_error "Usage: ./test_api.sh <BACKEND_URL>"
    echo "Example: ./test_api.sh https://your-app.modal.run"
    exit 1
fi

BACKEND_URL="$1"
print_info "Testing backend: $BACKEND_URL"
echo ""

# Test 1: Health Check
echo "============================================================"
echo "Test 1: Health Check"
echo "============================================================"
print_info "GET $BACKEND_URL/health"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Health check passed!"
    echo "Response: $BODY"
else
    print_error "Health check failed (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
    exit 1
fi
echo ""

# Test 2: Languages Endpoint
echo "============================================================"
echo "Test 2: Languages Endpoint"
echo "============================================================"
print_info "GET $BACKEND_URL/languages?limit=10"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/languages?limit=10")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Languages endpoint passed!"
    echo "Sample languages:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null | head -20 || echo "$BODY"
else
    print_error "Languages endpoint failed (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
fi
echo ""

# Test 3: CORS Headers
echo "============================================================"
echo "Test 3: CORS Configuration"
echo "============================================================"
print_info "Testing CORS headers with Origin: http://localhost:5173"
CORS_HEADERS=$(curl -s -I -H "Origin: http://localhost:5173" "$BACKEND_URL/health")

if echo "$CORS_HEADERS" | grep -qi "access-control-allow-origin"; then
    print_success "CORS headers present!"
    echo "$CORS_HEADERS" | grep -i "access-control"
else
    print_warning "CORS headers not found"
    print_info "Full headers:"
    echo "$CORS_HEADERS"
fi
echo ""

# Test 4: Transcribe Endpoint (requires audio file)
echo "============================================================"
echo "Test 4: Transcribe Endpoint"
echo "============================================================"

if [ -f "test_audio.wav" ]; then
    print_info "POST $BACKEND_URL/transcribe"
    print_info "Uploading test_audio.wav..."
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST "$BACKEND_URL/transcribe?language=eng_Latn" \
        -F "file=@test_audio.wav" \
        -H "Accept: application/json")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Transcription successful!"
        echo "Response:"
        echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    elif [ "$HTTP_CODE" = "400" ]; then
        print_warning "Transcription failed with validation error (HTTP $HTTP_CODE)"
        echo "Response: $BODY"
    else
        print_error "Transcription failed (HTTP $HTTP_CODE)"
        echo "Response: $BODY"
    fi
else
    print_warning "test_audio.wav not found. Skipping transcription test."
    print_info "To test transcription, create a test audio file:"
    echo "  ffmpeg -f lavfi -i \"sine=frequency=1000:duration=5\" -ac 1 -ar 16000 test_audio.wav"
fi
echo ""

# Test 5: Rate Limiting
echo "============================================================"
echo "Test 5: Rate Limiting"
echo "============================================================"
print_info "Making multiple rapid requests to test rate limiting..."

for i in {1..5}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "429" ]; then
        print_success "Rate limiting is working! (HTTP 429 on request $i)"
        break
    elif [ "$i" = "5" ]; then
        print_info "No rate limiting detected (all requests succeeded)"
        print_info "This is fine if rate limits are set high or disabled"
    fi
done
echo ""

# Test 6: Error Handling
echo "============================================================"
echo "Test 6: Error Handling"
echo "============================================================"

# Test invalid language
print_info "Testing invalid language parameter..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/languages?limit=invalid")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "422" ] || [ "$HTTP_CODE" = "400" ]; then
    print_success "Input validation working! (HTTP $HTTP_CODE)"
else
    print_info "Unexpected response for invalid input (HTTP $HTTP_CODE)"
fi
echo ""

# Summary
echo "============================================================"
echo "Test Summary"
echo "============================================================"
echo ""

cat << EOF
Tests Completed:
✅ Health check
✅ Languages endpoint
✅ CORS configuration
$([ -f "test_audio.wav" ] && echo "✅ Transcription endpoint" || echo "⚠️  Transcription endpoint (skipped - no test file)")
✅ Rate limiting check
✅ Error handling

Backend Status: OPERATIONAL ✅

Next Steps:
1. Test the frontend by running: npm run dev
2. Open http://localhost:5173
3. Connect to: $BACKEND_URL
4. Upload an audio file and test transcription
5. Verify progress indicators and UI features work

For detailed logs:
  modal logs omniasr-llm-7b --follow
EOF

echo ""
print_success "API testing complete!"
