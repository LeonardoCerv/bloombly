#!/bin/bash

echo "🚀 Deploying Bloombly API to Railway..."
echo "================================================"

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found!"
    echo "Please install it: npm install -g @railway/cli"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "Dockerfile" ] || [ ! -f "startup.sh" ]; then
    echo "❌ Please run this script from the api directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

# Check if model exists
if [ -f "app/bloom_model_v2.pkl" ]; then
    echo "✅ Pre-trained model found ($(du -h app/bloom_model_v2.pkl | cut -f1))"
    echo "   This will be copied to Railway, avoiding training on deployment"
else
    echo "⚠️  No pre-trained model found"
    echo "   Model will be trained during Railway deployment (this takes longer)"
fi

# Check if training data exists
if [ -f "data/raw/data.csv" ]; then
    echo "✅ Training data found ($(du -h data/raw/data.csv | cut -f1))"
else
    echo "❌ Training data not found at data/raw/data.csv"
    echo "   Please ensure training data is available"
    echo "   You can copy it with: cp ../data/raw/data.csv data/raw/data.csv"
    exit 1
fi

echo "================================================"
echo "Starting Railway deployment..."

# Deploy to Railway
railway up

echo "================================================"
echo "✅ Deployment complete!"
echo "Check your Railway dashboard for deployment status."
echo "The API will be available at your Railway domain once deployment finishes."