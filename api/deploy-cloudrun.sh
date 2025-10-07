# Cloud Run Deployment Script
#!/bin/bash

# Set your project details
PROJECT_ID="your-google-cloud-project"
SERVICE_NAME="bloombly-api"
REGION="us-central1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Build and push the container
echo "Building container image..."
docker build -t $IMAGE_NAME .
docker push $IMAGE_NAME

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars "PORT=8080,DEBUG=false" \
  --set-env-vars "EE_PROJECT=$EE_PROJECT" \
  --set-env-vars "GOOGLE_APPLICATION_CREDENTIALS_JSON=$GOOGLE_APPLICATION_CREDENTIALS_JSON" \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10 \
  --timeout 300

echo "Deployment complete!"
echo "Service URL: $(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')"