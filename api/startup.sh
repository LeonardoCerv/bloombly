#!/bin/bash
set -e  # Exit on any error

echo "🚀 Starting Bloombly API deployment..."
echo "================================================"

# Set working directory
cd /app

# Check if training data exists
DATA_FILE="data/raw/data.csv"
if [ ! -f "$DATA_FILE" ]; then
    echo "⚠️  Warning: Training data not found at $DATA_FILE"
    echo "Will attempt to start API without training..."
else
    echo "✅ Training data found: $DATA_FILE"
fi

# Check if model already exists
MODEL_FILE="app/bloom_model_v2.pkl"

if [ ! -f "$MODEL_FILE" ] && [ -f "$DATA_FILE" ]; then
    echo "📚 Model not found. Training new model..."
    echo "================================================"
    
    # Train the model first
    echo "Running: python train_model.py --data $DATA_FILE --output $MODEL_FILE"
    python train_model.py --data "$DATA_FILE" --output "$MODEL_FILE"
    
    # Check if training was successful
    if [ $? -eq 0 ] && [ -f "$MODEL_FILE" ]; then
        echo "✅ Model training completed successfully!"
        echo "Model saved to: $MODEL_FILE"
        echo "Model size: $(du -h $MODEL_FILE | cut -f1)"
    else
        echo "❌ Model training failed!"
        echo "Will continue with fallback behavior..."
    fi
elif [ -f "$MODEL_FILE" ]; then
    echo "✅ Model already exists: $MODEL_FILE"
    echo "Model size: $(du -h $MODEL_FILE | cut -f1)"
    echo "Skipping training..."
else
    echo "⚠️  No model and no training data - API will use fallback behavior"
fi

echo "================================================"
echo "🌟 Starting API server..."
echo "================================================"

# Start the Flask application
exec python app/main.py