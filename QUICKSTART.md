# Quick Start Guide

Get up and running with AI Content Creator in 5 minutes!

## Prerequisites Checklist

Before you begin, make sure you have:
- [ ] Node.js 18+ installed
- [ ] Python 3.8+ installed
- [ ] FFmpeg installed and in PATH
- [ ] 8GB+ RAM available
- [ ] ~2GB free disk space for AI models

## Setup Steps

### 1. Install Node Dependencies (2 minutes)
```bash
cd AI-based-content-creation
npm install
```

### 2. Set Up Python Environment (3 minutes)
```bash
# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install Python packages
pip install -r python/requirements.txt
```

### 3. Verify Setup
```bash
# Run Python setup checker
python python/setup.py
```

All checks should pass with ✓

### 4. Launch the App
```bash
npm run electron:dev
```

## First Video

1. **Select a Video**: Click "Select Video to Get Started"
   - Choose a short video (1-2 minutes recommended for first try)

2. **Analyze**: Click "Analyze Video" button
   - First time will download AI models (~500MB)
   - Wait for analysis to complete

3. **Add Captions**:
   - Go to "Subtitles" tab
   - Click "Auto-Generate"
   - Edit as needed

4. **Try SFX**:
   - Go to "Sound FX" tab
   - Type: "door opening"
   - Click "Generate SFX"

5. **Export**: Click "Export Video"

## Common Issues

### "Python not found"
- Make sure virtual environment is activated
- Check: `python --version`

### "FFmpeg not found"
```bash
# Verify FFmpeg is installed
ffmpeg -version

# If not installed, download from: https://ffmpeg.org
```

### "Out of memory"
- Use smaller AI models (edit Python scripts)
- Process shorter videos
- Close other applications

### "AudioCraft generation slow"
- Normal on CPU (can take 1-2 minutes)
- GPU recommended for faster generation
- Try shorter durations (1-2 seconds)

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Experiment with different AI models
- Customize the UI and styles
- Build for production: `npm run electron:build`

## Support

Having issues? Check:
1. All prerequisites are installed
2. Virtual environment is activated
3. Console/terminal for error messages

For more help, see README.md or open an issue.

---

Happy creating! 🎬✨
