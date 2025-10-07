# BLOOMBLY DEPLOYMENT GUIDE 🌸

## Quick Deploy Options

### Option 1: Cloud Platforms (Recommended)

#### Frontend (Vercel)
```bash
# 1. Connect GitHub repo to Vercel
# 2. Set build command: npm run build (if you add it)
# 3. Set framework preset: Other
# 4. Deploy!
```

#### Backend (Google Cloud Run)
```bash
# 1. Setup Google Cloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Enable APIs
gcloud services enable run.googleapis.com
gcloud services enable earthengine.googleapis.com

# 3. Deploy
cd api && chmod +x deploy-cloudrun.sh && ./deploy-cloudrun.sh
```

#### Backend Alternative (Railway)
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and deploy
railway login
railway link
railway up
```

### Option 2: Docker Deployment

#### Local Development
```bash
# Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

#### Production with Nginx
```bash
# Start with production profile
docker-compose --profile production up -d

# Monitor logs
docker-compose logs -f
```

### Option 3: VPS Deployment (DigitalOcean, Linode, AWS EC2)

#### Requirements
- Ubuntu 20.04+ or similar
- 2GB+ RAM (for ML models)
- 10GB+ storage
- Docker + Docker Compose

#### Setup Script
```bash
# 1. Install dependencies
sudo apt update && sudo apt install -y docker.io docker-compose git

# 2. Clone and deploy
git clone https://github.com/LeonardoCerv/bloombly.git
cd bloombly
cp .env.example .env
# Edit .env file

# 3. Start services
docker-compose up -d

# 4. Setup reverse proxy (Nginx/Caddy)
# Point domain to your server IP
```

## Environment Setup

### Required Environment Variables
```bash
# Google Earth Engine (Critical for full functionality)
EE_PROJECT="your-google-cloud-project-id"
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'

# Optional: External APIs
WEATHER_API_KEY="for-enhanced-predictions"
MAPBOX_ACCESS_TOKEN="for-improved-maps"
```

### Google Earth Engine Setup
1. Create Google Cloud Project
2. Enable Earth Engine API
3. Create Service Account
4. Download JSON key
5. Set environment variables

## Performance Optimization

### API Optimizations
- Enable model caching
- Use Redis for session storage
- Implement request rate limiting
- Add response compression

### Frontend Optimizations
- Enable Vercel edge caching
- Optimize GeoJSON file sizes
- Implement lazy loading for large datasets
- Use WebGL optimizations for globe rendering

## Monitoring & Scaling

### Recommended Tools
- **Uptime**: UptimeRobot (free)
- **Errors**: Sentry (free tier)
- **Analytics**: Google Analytics
- **Performance**: New Relic (free tier)

### Auto-scaling Setup
- Cloud Run: Automatic based on traffic
- Railway: Plan-based scaling
- VPS: Manual scaling with load balancers

## Cost Estimates

### Small Scale (1000 users/month)
- **Vercel Frontend**: Free
- **Railway Backend**: $5/month
- **Total**: ~$5/month

### Medium Scale (10k users/month)
- **Vercel Frontend**: Free-$20
- **Google Cloud Run**: $10-30
- **Google Earth Engine**: $20-50
- **Total**: ~$30-100/month

### Large Scale (100k+ users/month)
- **Vercel Pro**: $20/month
- **Google Cloud Run**: $50-200
- **Google Earth Engine**: $100-500
- **CDN**: $20-100
- **Total**: ~$200-800/month

## Security Checklist

### Production Security
- [ ] HTTPS enabled (Vercel/CloudRun auto)
- [ ] Environment variables secured
- [ ] API rate limiting enabled
- [ ] CORS properly configured
- [ ] Earth Engine credentials secured
- [ ] Database access restricted (if using)
- [ ] Error messages sanitized

## Backup Strategy

### Critical Components
- **Models**: Backup trained model files
- **Data**: Backup processed GeoJSON/CSV files
- **Config**: Backup environment variables
- **Code**: GitHub repository (already done)

## Next Steps

1. **Choose deployment option** based on your needs
2. **Set up Google Earth Engine** for full functionality
3. **Configure monitoring** for production readiness
4. **Optimize performance** based on usage patterns
5. **Scale infrastructure** as user base grows

## Support

For deployment issues:
1. Check logs: `docker-compose logs`
2. Verify environment variables
3. Test API endpoints: `curl http://localhost:5001/api/health`
4. Monitor Earth Engine quota usage

Your app is **production-ready** with these configurations! 🚀