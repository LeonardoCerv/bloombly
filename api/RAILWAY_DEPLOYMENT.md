# Railway Deployment Setup for Bloombly API

## Overview
The Railway deployment has been configured to automatically:
1. **Train the model first** (if not already trained)
2. **Start the API server** once training is complete

## Files Modified/Created

### 1. `startup.sh` (NEW)
- Main startup script that handles the training → server workflow
- Checks if model exists, trains if needed, then starts the server
- Provides detailed logging throughout the process

### 2. `Dockerfile` (MODIFIED)
- Updated to use the startup script instead of directly starting the server
- Copies training data (`../data/raw/data.csv`) for model training
- Includes existing pre-trained model if available (avoids retraining)
- Extended health check timeout to account for training time

### 3. `railway.toml` (MODIFIED)
- Increased health check timeout from 300s to 600s (10 minutes)
- Allows enough time for model training on first deployment

### 4. `deploy.sh` (NEW)
- Convenience script to deploy to Railway
- Checks prerequisites and provides deployment status

## Deployment Process

### Option 1: Using the deploy script (Recommended)
```bash
cd api/
./deploy.sh
```

### Option 2: Manual deployment
```bash
cd api/
railway up
```

## What Happens During Deployment

1. **Build Phase**:
   - Docker builds the container
   - Copies training data and any existing model
   - Sets up the startup script

2. **Runtime Phase**:
   - `startup.sh` executes
   - Checks if `app/bloom_model_v2.pkl` exists
   - If NO model found: runs `train_model.py` (can take 5-10 minutes)
   - If model exists: skips training
   - Starts the Flask API server

3. **Health Check**:
   - Railway waits up to 10 minutes for `/api/health` to respond
   - Once healthy, the API is live

## Environment Variables in Railway
Make sure these are set in your Railway project:
- `EE_PROJECT`: Your Google Earth Engine project ID
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`: Your service account JSON credentials
- `PORT`: 5001 (should be set automatically)

## Expected Deployment Timeline

### First Deployment (no pre-trained model)
- Build: ~3-5 minutes
- Model Training: ~5-10 minutes  
- Server Start: ~30 seconds
- **Total: ~10-15 minutes**

### Subsequent Deployments (with pre-trained model)
- Build: ~3-5 minutes
- Server Start: ~30 seconds
- **Total: ~3-5 minutes**

## Monitoring Deployment

1. Watch Railway logs during deployment
2. Look for these key messages:
   ```
   🚀 Starting Bloombly API deployment...
   ✅ Model already exists: app/bloom_model_v2.pkl
   🌟 Starting API server...
   ```

3. Test the health endpoint:
   ```
   curl https://your-railway-domain.up.railway.app/api/health
   ```

## Troubleshooting

### If training fails:
- Check Railway logs for error details
- Verify training data is present
- API will continue with fallback behavior

### If health check times out:
- Check if training is taking longer than expected
- Increase `healthcheckTimeout` in `railway.toml` if needed

### If deployment fails:
- Ensure Railway CLI is installed and authenticated
- Check that all required files are present
- Verify environment variables are set

## Local Testing

Test the deployment workflow locally:
```bash
cd api/
docker build -t bloombly-api .
docker run -p 5001:5001 bloombly-api
```

This will simulate the exact Railway deployment process locally.