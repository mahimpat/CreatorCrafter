#!/bin/bash
# Download all AI models for offline packaging

set -e

echo "=========================================="
echo "AI Models Download Script"
echo "=========================================="
echo ""

# Activate virtual environment if it exists
if [ -d "../venv" ]; then
    echo "Activating virtual environment..."
    source ../venv/bin/activate
else
    echo "ERROR: Virtual environment not found at ../venv"
    echo "Please run 'npm run setup:python' first"
    exit 1
fi

# Set cache directory
export HF_HOME="$(pwd)/ai_models_cache"
export TRANSFORMERS_CACHE="$HF_HOME/transformers"
export TORCH_HOME="$HF_HOME/torch"
mkdir -p "$HF_HOME"

echo "Cache directory: $HF_HOME"
echo ""

# Download models using Python script
echo "Downloading AI models (this may take 15-30 minutes)..."
echo "Estimated total size: ~2.5 GB"
echo ""

python3 ../python/download_models.py

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ All models downloaded successfully!"
    echo "=========================================="
    echo ""
    echo "Models cache location: $HF_HOME"
    echo "Total size:"
    du -sh "$HF_HOME"
    echo ""
    echo "Models will be packaged with the installer."
else
    echo ""
    echo "❌ Model download failed!"
    echo "Please check your internet connection and try again."
    exit 1
fi
