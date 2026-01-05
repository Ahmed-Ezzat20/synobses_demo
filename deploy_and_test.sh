#!/bin/bash

# Deploy and Test Script for OmniASR
# This script deploys the backend and runs comprehensive tests

set -e  # Exit on error

echo "============================================================"
echo "OmniASR Deployment and Testing Script"
echo "============================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Modal CLI is installed
echo "Checking prerequisites..."
if ! command -v modal &> /dev/null; then
    print_error "Modal CLI not found. Please install it first:"
    echo "  pip install modal"
    exit 1
fi
print_success "Modal CLI found"

# Check if authenticated
if ! modal token list &> /dev/null; then
    print_error "Not authenticated with Modal. Please run:"
    echo "  modal token new"
    exit 1
fi
print_success "Modal authentication verified"

echo ""
echo "============================================================"
echo "Step 1: Deploy Backend to Modal"
echo "============================================================"
echo ""

cd backend

print_info "Deploying backend... (this may take 2-3 minutes)"
if modal deploy omni_modal.py; then
    print_success "Backend deployed successfully!"
else
    print_error "Backend deployment failed"
    exit 1
fi

echo ""
print_info "Getting deployment URL..."
BACKEND_URL=$(modal app list | grep "omniasr-llm-7b" | awk '{print $NF}')

if [ -z "$BACKEND_URL" ]; then
    print_warning "Could not automatically detect backend URL"
    print_info "Please check: modal app list"
    echo ""
    read -p "Enter your backend URL: " BACKEND_URL
fi

print_success "Backend URL: $BACKEND_URL"

echo ""
echo "============================================================"
echo "Step 2: Verify Backend Health"
echo "============================================================"
echo ""

print_info "Checking backend health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Backend is healthy!"
    echo "Response: $HEALTH_BODY"
else
    print_error "Backend health check failed (HTTP $HTTP_CODE)"
    echo "Response: $HEALTH_BODY"
    exit 1
fi

echo ""
echo "============================================================"
echo "Step 3: Test Backend Endpoints"
echo "============================================================"
echo ""

# Test /languages endpoint
print_info "Testing /languages endpoint..."
LANG_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/languages?limit=10")
HTTP_CODE=$(echo "$LANG_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Languages endpoint working!"
    LANG_COUNT=$(echo "$LANG_RESPONSE" | head -n-1 | grep -o '"languages"' | wc -l)
    echo "Languages available: Check response"
else
    print_error "Languages endpoint failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "============================================================"
echo "Step 4: Test CORS Configuration"
echo "============================================================"
echo ""

print_info "Testing CORS headers..."
CORS_RESPONSE=$(curl -s -I -H "Origin: http://localhost:5173" "$BACKEND_URL/health")

if echo "$CORS_RESPONSE" | grep -q "access-control-allow-origin"; then
    print_success "CORS headers present!"
    echo "$CORS_RESPONSE" | grep "access-control"
else
    print_warning "CORS headers not found in response"
    echo "This might cause issues with frontend"
fi

echo ""
echo "============================================================"
echo "Step 5: Check Model Caching"
echo "============================================================"
echo ""

print_info "Verifying model cache configuration..."
if modal run check_cache.py 2>/dev/null; then
    print_success "Cache configuration verified!"
else
    print_warning "Could not verify cache (check_cache.py may not exist)"
fi

echo ""
echo "============================================================"
echo "Step 6: Frontend Setup"
echo "============================================================"
echo ""

cd ..

print_info "Installing frontend dependencies..."
if npm install --silent; then
    print_success "Frontend dependencies installed!"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

echo ""
echo "============================================================"
echo "Step 7: Create Test Audio File"
echo "============================================================"
echo ""

# Create a simple test audio file using ffmpeg if available
if command -v ffmpeg &> /dev/null; then
    print_info "Generating test audio file..."
    ffmpeg -f lavfi -i "sine=frequency=1000:duration=5" -ac 1 -ar 16000 test_audio.wav -y &> /dev/null
    if [ -f "test_audio.wav" ]; then
        print_success "Test audio file created: test_audio.wav (5 seconds)"
    fi
else
    print_warning "ffmpeg not found. Skipping test audio generation."
    print_info "You can upload your own audio file for testing."
fi

echo ""
echo "============================================================"
echo "Deployment Summary"
echo "============================================================"
echo ""

print_success "Backend deployed and verified!"
print_success "Frontend dependencies installed!"
echo ""
echo "Backend URL: $BACKEND_URL"
echo ""

echo "============================================================"
echo "Next Steps"
echo "============================================================"
echo ""

echo "1. Start the frontend development server:"
echo "   ${BLUE}npm run dev${NC}"
echo ""

echo "2. Open your browser to:"
echo "   ${BLUE}http://localhost:5173${NC}"
echo ""

echo "3. Connect to backend:"
echo "   - Click 'Connect' in the sidebar"
echo "   - Enter backend URL: ${BLUE}$BACKEND_URL${NC}"
echo ""

echo "4. Test transcription:"
echo "   - Upload an audio file (or use test_audio.wav)"
echo "   - Select a language"
echo "   - Click 'Transcribe'"
echo "   - Watch the progress indicators!"
echo ""

echo "============================================================"
echo "Manual Testing Checklist"
echo "============================================================"
echo ""

cat << EOF
[ ] Backend health check passes
[ ] Languages load successfully
[ ] No CORS errors in browser console
[ ] Upload progress shows 0-100%
[ ] Processing stage shows with animated progress bar
[ ] Estimated time is displayed
[ ] Transcription completes successfully
[ ] Results display with segments
[ ] Export functionality works (TXT, JSON, SRT)
[ ] Large File Mode auto-switches for long audio
[ ] Error messages are clear and helpful
EOF

echo ""
echo "============================================================"
echo "Troubleshooting"
echo "============================================================"
echo ""

cat << EOF
If you encounter issues:

1. CORS errors:
   - Check browser console for exact error
   - Verify backend URL is correct
   - Try: modal logs omniasr-llm-7b --follow

2. Timeout errors:
   - First request may take 6-7 minutes (cold start)
   - Subsequent requests should be faster (~30 seconds)
   - Check progress indicators for status

3. Model not found:
   - Run: modal run backend/omni_modal.py::download_model
   - This pre-downloads models to cache

4. Other errors:
   - Check backend logs: modal logs omniasr-llm-7b --follow
   - Check browser console for frontend errors
   - Verify all files are up to date: git pull origin main
EOF

echo ""
print_success "Deployment and testing setup complete!"
echo ""
echo "Run ${BLUE}npm run dev${NC} to start the frontend and begin testing."
echo ""
