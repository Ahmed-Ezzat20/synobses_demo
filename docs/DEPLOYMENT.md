# Deployment Guide

This guide covers deploying the OmniASR application to production.

---

## Table of Contents

1. [Backend Deployment (Modal.com)](#backend-deployment)
2. [Frontend Deployment](#frontend-deployment)
3. [Environment Configuration](#environment-configuration)
4. [Security Best Practices](#security-best-practices)
5. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Backend Deployment

### Prerequisites

- Modal.com account ([sign up](https://modal.com))
- Python 3.11+
- Modal CLI installed

### Step 1: Install Modal CLI

```bash
pip install modal
```

### Step 2: Authenticate

```bash
modal token new
```

This will open a browser window for authentication.

### Step 3: Configure Environment

Create `backend/.env`:

```env
API_KEYS=your-production-api-key-1,your-production-api-key-2
ALLOWED_ORIGINS=https://yourdomain.com
MAX_FILE_SIZE_MB=100
RATE_LIMIT_TRANSCRIBE=20
RATE_LIMIT_TRANSCRIBE_LARGE=10
LOG_LEVEL=INFO
```

### Step 4: Deploy

```bash
cd backend
modal deploy omni_modal.py
```

The deployment will:
1. Build the container image
2. Download and cache models
3. Deploy the FastAPI application
4. Return a public URL (e.g., `https://your-app.modal.run`)

### Step 5: Verify Deployment

```bash
# Check health
curl https://your-app.modal.run/health

# View logs
modal app logs omniasr-llm-7b

# Check status
modal app list
```

### Cost Optimization

**Reduce Costs**:
- Set `min_containers=0` to scale to zero when idle
- Use spot instances (if available)
- Monitor GPU utilization

**Increase Performance**:
- Set `min_containers=1` for zero cold starts
- Increase `max_inputs` for higher concurrency
- Use larger GPU (A10G, A100) for better throughput

---

## Frontend Deployment

### Option 1: Netlify

#### Via CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

#### Via Git Integration

1. Push code to GitHub
2. Connect repository in Netlify dashboard
3. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Deploy

#### Environment Variables

In Netlify dashboard, add:
- `VITE_API_URL`: Your backend URL (optional)

### Option 2: Vercel

#### Via CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Build and deploy
vercel --prod
```

#### Via Git Integration

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Deploy automatically on push

### Option 3: AWS S3 + CloudFront

```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### Option 4: Docker + Any Host

```bash
# Build Docker image
docker build -f Dockerfile.frontend -t omniasr-frontend .

# Run
docker run -p 80:5173 omniasr-frontend
```

---

## Environment Configuration

### Backend Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `API_KEYS` | Comma-separated API keys | (empty) | No |
| `ALLOWED_ORIGINS` | CORS origins | `*` | Yes |
| `MAX_FILE_SIZE_MB` | Max upload size | `100` | No |
| `RATE_LIMIT_HEALTH` | Health endpoint limit | `30/minute` | No |
| `RATE_LIMIT_LANGUAGES` | Languages endpoint limit | `10/minute` | No |
| `RATE_LIMIT_TRANSCRIBE` | Transcribe endpoint limit | `20/minute` | No |
| `RATE_LIMIT_TRANSCRIBE_LARGE` | Large transcribe limit | `10/minute` | No |
| `LOG_LEVEL` | Logging level | `INFO` | No |
| `BATCH_SIZE` | Transcription batch size | `4` | No |
| `GPU_TYPE` | GPU type for Modal | `L4` | No |
| `MIN_CONTAINERS` | Minimum active containers | `0` | No |

### Frontend Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Default backend URL | (none) | No |

---

## Security Best Practices

### 1. Enable API Key Authentication

```env
# Generate strong API keys
API_KEYS=$(openssl rand -hex 32),$(openssl rand -hex 32)
```

### 2. Configure CORS Properly

```env
# Production only
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Development
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:5173
```

### 3. Use HTTPS

- **Frontend**: Netlify/Vercel provide HTTPS automatically
- **Backend**: Modal.com provides HTTPS by default
- **Custom Domain**: Configure SSL certificate

### 4. Rate Limiting

Adjust rate limits based on your needs:

```env
# Stricter limits for production
RATE_LIMIT_TRANSCRIBE=10
RATE_LIMIT_TRANSCRIBE_LARGE=5
```

### 5. Monitor Access

- Review Modal logs regularly
- Set up alerts for unusual activity
- Track API key usage

### 6. Secrets Management

**Never commit secrets to Git!**

Use:
- Modal secrets for backend
- Netlify/Vercel environment variables for frontend
- GitHub Secrets for CI/CD

---

## Monitoring & Maintenance

### Health Checks

Set up monitoring for:
- `/health` endpoint (should return 200)
- Response time (<2s for health check)
- Error rates

Tools:
- UptimeRobot
- Pingdom
- DataDog

### Log Monitoring

```bash
# View recent logs
modal app logs omniasr-llm-7b --lines 100

# Follow logs
modal app logs omniasr-llm-7b --follow

# Filter by level
modal app logs omniasr-llm-7b | grep ERROR
```

### Performance Monitoring

Track:
- **Processing Time**: Average time per transcription
- **RTF (Real-Time Factor)**: Should be <0.2 for good performance
- **GPU Utilization**: Should be >70% when processing
- **Error Rate**: Should be <1%

### Scaling

**Horizontal Scaling**:
```python
# In omni_modal.py
@app.cls(
    gpu="L4",
    max_inputs=20,  # Increase concurrency
    target_inputs=15,
)
```

**Vertical Scaling**:
```python
# Use larger GPU
@app.cls(
    gpu="A10G",  # or "A100"
)
```

### Backup & Recovery

**Model Cache**:
- Models are cached in Modal volume
- Automatically persists across deployments
- No manual backup needed

**User Data**:
- Currently stateless (no user data stored)
- If adding database, set up regular backups

### Updates & Rollbacks

**Deploy New Version**:
```bash
modal deploy omni_modal.py
```

**Rollback**:
```bash
# List deployments
modal app list

# Deploy specific version
modal deploy omni_modal.py --version v1.2.3
```

### Cost Monitoring

**Track Costs**:
- Monitor Modal dashboard for GPU usage
- Set up billing alerts
- Review usage patterns monthly

**Optimize Costs**:
- Scale to zero when idle (`min_containers=0`)
- Use smaller GPU for low traffic
- Cache frequently requested transcriptions

---

## CI/CD Integration

### GitHub Actions

The repository includes a CI/CD workflow (`.github/workflows/ci-cd.yml`) that:

1. Runs tests on every push
2. Builds frontend
3. Deploys to production on merge to `main`

**Required Secrets**:

Add these in GitHub repository settings → Secrets:

- `MODAL_TOKEN_ID`: Modal token ID
- `MODAL_TOKEN_SECRET`: Modal token secret
- `NETLIFY_AUTH_TOKEN`: Netlify auth token (if using Netlify)
- `NETLIFY_SITE_ID`: Netlify site ID

### Manual Deployment

If not using CI/CD:

```bash
# Backend
cd backend
modal deploy omni_modal.py

# Frontend
npm run build
netlify deploy --prod --dir=dist
```

---

## Troubleshooting

### Deployment Fails

**Error: "Modal authentication failed"**
- Run `modal token new` to re-authenticate
- Check token is valid in Modal dashboard

**Error: "Container build failed"**
- Check `requirements.txt` for invalid packages
- Verify Python version compatibility
- Review build logs for specific errors

### Performance Issues

**Slow Transcription**
- Check GPU utilization in Modal dashboard
- Increase batch size
- Use larger GPU type

**High Latency**
- Set `min_containers=1` to avoid cold starts
- Deploy to region closer to users
- Enable caching

### Cost Issues

**Unexpectedly High Costs**
- Check for stuck containers
- Review `scaledown_window` setting
- Monitor for abuse (rate limiting)

---

## Production Checklist

Before going live:

- [ ] API keys configured and secure
- [ ] CORS properly configured (not `*`)
- [ ] Rate limiting enabled
- [ ] HTTPS enabled
- [ ] Health monitoring set up
- [ ] Logging configured
- [ ] Error tracking enabled
- [ ] Backup strategy in place
- [ ] Documentation updated
- [ ] Team trained on monitoring/maintenance

---

## Support

For deployment issues:
- Check Modal documentation: https://modal.com/docs
- Review GitHub issues
- Contact Modal support for infrastructure issues

---

**Last Updated**: January 2026
