# OmniASR Testing Checklist

## 🚀 Quick Start

Run the automated deployment and testing script:

```bash
./deploy_and_test.sh
```

This will:
- ✅ Deploy backend to Modal
- ✅ Verify backend health
- ✅ Test all endpoints
- ✅ Check CORS configuration
- ✅ Verify model caching
- ✅ Install frontend dependencies
- ✅ Generate test audio file

## 📋 Manual Testing Checklist

### Pre-Deployment

- [ ] All changes committed to Git
- [ ] All changes pushed to GitHub
- [ ] Modal CLI installed (`pip install modal`)
- [ ] Modal authenticated (`modal token new`)

### Backend Deployment

- [ ] Navigate to backend directory: `cd backend`
- [ ] Deploy: `modal deploy omni_modal.py`
- [ ] Deployment succeeds (no errors)
- [ ] Note the deployment URL

### Backend Verification

- [ ] Health check passes: `curl <BACKEND_URL>/health`
- [ ] Languages endpoint works: `curl <BACKEND_URL>/languages?limit=10`
- [ ] CORS headers present in response
- [ ] No errors in Modal logs: `modal logs omniasr-llm-7b --follow`

### Frontend Setup

- [ ] Install dependencies: `npm install`
- [ ] Start dev server: `npm run dev`
- [ ] Frontend loads at http://localhost:5173
- [ ] No console errors on page load

### Connection Test

- [ ] Click "Connect" in sidebar
- [ ] Enter backend URL
- [ ] Connection succeeds (green "Connected" indicator)
- [ ] Languages load in dropdown
- [ ] No CORS errors in browser console

### Short Audio Test (Standard Mode)

- [ ] Upload audio file <40 seconds
- [ ] Select language from dropdown
- [ ] Standard Mode is selected
- [ ] Click "Transcribe"
- [ ] Upload progress shows 0-100%
- [ ] Processing stage appears with animated progress bar
- [ ] Transcription completes in <15 seconds
- [ ] Results display with transcription text
- [ ] Segments show with timestamps
- [ ] Processing metrics displayed (duration, time, etc.)

### Long Audio Test (Large File Mode)

- [ ] Upload audio file >40 seconds
- [ ] App auto-switches to Large File Mode
- [ ] Warning message appears (yellow)
- [ ] Select language
- [ ] Click "Transcribe"
- [ ] Upload progress shows 0-100%
- [ ] Estimated time is displayed
- [ ] Processing stage shows helpful tips
- [ ] Large File Mode warning displayed
- [ ] Transcription completes successfully
- [ ] Results show multiple segments
- [ ] All segments have correct timestamps

### Progress Indicators

- [ ] Upload stage: Shows percentage (0-100%)
- [ ] Processing stage: Shows animated pulse
- [ ] Processing stage: Shows estimated time
- [ ] Processing stage: Shows helpful tips
- [ ] Receiving stage: Shows completion message
- [ ] Progress bar animates smoothly
- [ ] No UI freezing or hanging

### Error Handling

- [ ] Try uploading invalid file type → Clear error message
- [ ] Try uploading file >100MB → Size limit error
- [ ] Try transcribing without selecting language → Validation error
- [ ] Try using Standard Mode with >40s audio → Auto-switch or warning
- [ ] Disconnect and try to transcribe → "Not connected" error
- [ ] All errors are user-friendly and actionable

### Export Functionality

- [ ] Transcription completes successfully
- [ ] "Export" button visible in results
- [ ] Export as TXT works
- [ ] Export as JSON works
- [ ] Export as SRT works (with timestamps)
- [ ] Downloaded files contain correct data

### UI/UX

- [ ] All buttons are clickable and responsive
- [ ] Loading states show correctly
- [ ] Colors and styling look professional
- [ ] Responsive design works on different screen sizes
- [ ] No layout issues or overlapping elements
- [ ] Animations are smooth
- [ ] Text is readable

### Performance

- [ ] First request (cold start): Completes in 6-8 minutes
- [ ] Second request: Completes in <1 minute
- [ ] Model is not re-downloaded (check logs)
- [ ] Upload is reasonably fast
- [ ] UI remains responsive during processing
- [ ] No memory leaks (check browser task manager)

### Browser Compatibility

- [ ] Works in Chrome/Chromium
- [ ] Works in Firefox
- [ ] Works in Safari (if available)
- [ ] Works in Edge

### Edge Cases

- [ ] Very short audio (<5 seconds)
- [ ] Very long audio (>20 minutes)
- [ ] Multiple consecutive transcriptions
- [ ] Switching between Standard and Large File Mode
- [ ] Changing language mid-session
- [ ] Disconnecting and reconnecting
- [ ] Refreshing page during transcription

## 🧪 Automated Testing

### Run API Tests

```bash
./test_api.sh <BACKEND_URL>
```

This tests:
- Health endpoint
- Languages endpoint
- CORS configuration
- Transcription endpoint (if test audio exists)
- Rate limiting
- Error handling

### Run Frontend Tests (if available)

```bash
npm test
```

### Check Backend Logs

```bash
modal logs omniasr-llm-7b --follow
```

Look for:
- ✅ "FAIRSEQ2_CACHE_DIR=/model/fairseq2_cache"
- ✅ "Loading omniASR_LLM_7B_v2..."
- ✅ "Silero VAD loaded successfully"
- ✅ Request IDs in logs
- ✅ Processing times
- ❌ No error stack traces
- ❌ No CORS errors

### Verify Cache

```bash
cd backend
modal run check_cache.py
```

Expected:
- Cache directory: `/model/fairseq2_cache`
- Directory exists
- Model files present (~27-29 GB)

## 📊 Performance Benchmarks

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Cold start (first request) | 6-8 min | _____ | ☐ |
| Warm start (subsequent) | <1 min | _____ | ☐ |
| Standard mode (<40s audio) | <15 sec | _____ | ☐ |
| Large mode (5 min audio) | 10-20 min | _____ | ☐ |
| Upload speed (10MB file) | <10 sec | _____ | ☐ |
| Model download (first time) | 6-7 min | _____ | ☐ |
| Model load (from cache) | ~30 sec | _____ | ☐ |

## 🐛 Common Issues and Solutions

### Issue: CORS Error

**Symptoms**: "No response from server" or CORS error in console

**Solution**:
1. Verify backend is deployed: `modal app list`
2. Check backend logs: `modal logs omniasr-llm-7b --follow`
3. Redeploy backend: `modal deploy backend/omni_modal.py`

### Issue: Timeout Error

**Symptoms**: Request times out after 10-30 minutes

**Solution**:
1. Check if it's a cold start (first request takes longer)
2. Verify timeout settings in code
3. Check backend logs for errors
4. Try pre-downloading models: `modal run backend/omni_modal.py::download_model`

### Issue: Model Re-downloading Every Time

**Symptoms**: Every request takes 6-7 minutes

**Solution**:
1. Verify cache configuration: `modal run backend/check_cache.py`
2. Check logs for "FAIRSEQ2_CACHE_DIR=/model/fairseq2_cache"
3. Redeploy if needed

### Issue: Progress Indicator Not Showing

**Symptoms**: No progress bar or status messages

**Solution**:
1. Check browser console for JavaScript errors
2. Verify frontend code is up to date: `git pull origin main`
3. Reinstall dependencies: `npm install`
4. Clear browser cache and reload

### Issue: Languages Not Loading

**Symptoms**: Language dropdown is empty

**Solution**:
1. Check backend URL is correct
2. Test languages endpoint: `curl <BACKEND_URL>/languages?limit=10`
3. Check browser console for errors
4. Verify connection succeeded

## ✅ Success Criteria

Your deployment is successful if:

- ✅ Backend deploys without errors
- ✅ Health check returns 200 OK
- ✅ Languages load in frontend
- ✅ No CORS errors in browser console
- ✅ Short audio transcribes in <15 seconds
- ✅ Long audio transcribes successfully (may take minutes)
- ✅ Progress indicators show at each stage
- ✅ Results display with segments and timestamps
- ✅ Export functionality works
- ✅ Second request is faster than first (caching works)
- ✅ No errors in backend logs
- ✅ UI is responsive and professional

## 📝 Test Results

Date: _______________

Tester: _______________

### Summary

- Total tests: _____
- Passed: _____
- Failed: _____
- Skipped: _____

### Critical Issues

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Notes

_______________________________________________
_______________________________________________
_______________________________________________

## 🎉 Deployment Complete!

Once all tests pass, your OmniASR application is production-ready!

**Next steps**:
1. Deploy frontend to production (Vercel, Netlify, etc.)
2. Set up monitoring and alerts
3. Configure API keys for production
4. Set up backup and disaster recovery
5. Document any custom configurations

**Congratulations!** 🚀
