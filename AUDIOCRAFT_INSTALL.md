# AudioCraft Installation Guide

AudioCraft is used for AI-powered sound effect generation. Due to complex dependencies, it requires special installation steps.

## What Works Without AudioCraft

The application will work perfectly fine without AudioCraft installed. You can:
- ✅ Upload and edit videos
- ✅ Auto-generate subtitles/captions (using Whisper)
- ✅ Analyze videos with AI
- ✅ Add text overlays
- ✅ Import existing audio files for SFX
- ❌ Generate AI sound effects (requires AudioCraft)

## Installing AudioCraft

### Option 1: Install from Git (Recommended)

```bash
# Activate your virtual environment first
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install directly from GitHub
pip install 'audiocraft @ git+https://github.com/facebookresearch/audiocraft.git'
```

### Option 2: Install from Source

```bash
# Clone the repository
git clone https://github.com/facebookresearch/audiocraft.git
cd audiocraft

# Activate your virtual environment
source ../venv/bin/activate  # Windows: ..\venv\Scripts\activate

# Install in development mode
pip install -e .
```

### Option 3: Use Conda (Alternative)

If pip installation continues to fail, try using conda:

```bash
# Create conda environment
conda create -n audiocraft python=3.10
conda activate audiocraft

# Install AudioCraft
conda install -c conda-forge audiocraft

# Install other dependencies
pip install -r python/requirements.txt
```

## Troubleshooting AudioCraft Installation

### Error: "spacy build failed"

**Solution:**
```bash
# Install build tools
sudo apt-get install build-essential python3-dev  # Ubuntu/Debian
# or
brew install gcc  # macOS

# Then retry AudioCraft installation
```

### Error: "torch version conflict"

**Solution:**
AudioCraft may require specific PyTorch versions. Check their GitHub for compatibility:
```bash
# Uninstall current torch
pip uninstall torch torchaudio

# Install AudioCraft (it will install compatible torch)
pip install 'audiocraft @ git+https://github.com/facebookresearch/audiocraft.git'
```

### Out of Memory During Installation

**Solution:**
```bash
# Increase swap space (Linux)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Or install with no cache
pip install --no-cache-dir 'audiocraft @ git+https://github.com/facebookresearch/audiocraft.git'
```

## Verifying Installation

Test if AudioCraft is working:

```python
python3 -c "from audiocraft.models import MusicGen; print('AudioCraft installed successfully!')"
```

If successful, you should see: `AudioCraft installed successfully!`

## Using AudioCraft in the App

Once installed:
1. Launch the app: `npm run electron:dev`
2. Load a video
3. Go to "Sound FX" tab
4. Enter a description (e.g., "door creaking open")
5. Click "Generate SFX"

First-time use will download the AI model (~300MB).

## Alternative: Use Without AudioCraft

If you can't get AudioCraft installed:

1. **Use pre-made sound effects:**
   - Download SFX from free libraries (freesound.org, zapsplat.com)
   - Import them using "Import Audio" button in SFX tab

2. **Use online SFX generators:**
   - Generate SFX elsewhere (ElevenLabs, Soundraw, etc.)
   - Import the generated files

## System Requirements for AudioCraft

- **RAM**: 16GB recommended (8GB minimum)
- **GPU**: CUDA-capable GPU recommended for faster generation
- **Disk**: ~2GB for models and cache
- **Python**: 3.8-3.11 (3.12 may have compatibility issues)

## Performance Notes

**First Generation:**
- Downloads model (~300MB)
- Takes 1-3 minutes

**Subsequent Generations:**
- CPU: 30-60 seconds per 5-second audio
- GPU: 5-10 seconds per 5-second audio

## Getting Help

If you continue to have issues:
1. Check AudioCraft GitHub issues: https://github.com/facebookresearch/audiocraft/issues
2. Ensure all system dependencies are installed
3. Try using Python 3.10 instead of 3.12
4. Consider using the app without AudioCraft

---

**Note:** AudioCraft is optional. The core functionality of the app (video editing, captioning, overlays) works without it.
