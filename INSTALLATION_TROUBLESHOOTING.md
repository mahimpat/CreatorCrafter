# Installation Troubleshooting Guide

This guide helps you resolve common installation issues for the AI Content Creator application.

## Common Issues and Solutions

### 1. PyAV (av) Installation Fails

**Error:**
```
Package 'libavformat', required by 'virtual:world', not found
```

**Solution:**
Install FFmpeg development libraries:

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y ffmpeg libavcodec-dev libavformat-dev libavutil-dev \
    libavdevice-dev libavfilter-dev libswscale-dev libswresample-dev pkg-config
```

**macOS:**
```bash
brew install ffmpeg pkg-config
```

**Windows:**
1. Install FFmpeg from https://ffmpeg.org/download.html
2. Add FFmpeg to your PATH
3. Install Visual Studio Build Tools for Python packages

### 2. Torch Version Conflicts

**Error:**
```
ERROR: ResolutionImpossible: for help visit https://pip.pypa.io/en/latest/topics/dependency-resolution
```

**Solution:**
The requirements.txt has been updated to use compatible versions. Make sure you're using the latest version of the requirements file.

If you still have issues, install packages in this order:
```bash
pip install torch>=2.2.0 torchaudio>=2.2.0
pip install audiocraft
pip install openai-whisper
pip install -r python/requirements.txt
```

### 3. CUDA/GPU Issues

**Error:**
```
CUDA not available
```

**Solution:**
- This is normal if you don't have an NVIDIA GPU
- The application will work on CPU, but AI operations will be slower
- To use GPU acceleration, ensure:
  1. You have an NVIDIA GPU with CUDA support
  2. Install appropriate NVIDIA drivers
  3. PyTorch will automatically detect and use CUDA if available

### 4. Whisper Model Download Issues

**Error:**
```
Failed to download Whisper model
```

**Solution:**
- Whisper models download automatically on first use (~140MB for base model)
- Ensure you have internet connection
- Models are cached in `~/.cache/whisper/`
- If download fails, try again or manually download from:
  https://github.com/openai/whisper/blob/main/whisper/__init__.py

### 5. AudioCraft Model Download Issues

**Error:**
```
Failed to load AudioCraft model
```

**Solution:**
- AudioCraft models download automatically (~300MB for small model)
- Ensure you have internet connection
- Models are cached in `~/.cache/torch/hub/`
- First-time generation will take longer due to model download

### 6. Memory Issues

**Error:**
```
Out of memory / Killed
```

**Solution:**
- Ensure you have at least 8GB RAM (16GB recommended)
- Close other applications
- Use smaller AI models:
  - In `video_analyzer.py`: Change `whisper.load_model("base")` to `"tiny"`
  - In `audiocraft_generator.py`: Change `MusicGen.get_pretrained('small')` to use CPU

### 7. Python Version Issues

**Error:**
```
Python 3.8+ required
```

**Solution:**
```bash
# Check Python version
python --version

# If too old, install Python 3.8 or higher
# Ubuntu
sudo apt-get install python3.10

# macOS
brew install python@3.10
```

### 8. FFmpeg Not Found at Runtime

**Error:**
```
ffmpeg: command not found
```

**Solution:**
**Ubuntu/Debian:**
```bash
sudo apt-get install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
1. Download from https://ffmpeg.org/download.html
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add to PATH:
   - Open System Properties → Environment Variables
   - Edit PATH
   - Add `C:\ffmpeg\bin`
4. Restart terminal/command prompt

Verify installation:
```bash
ffmpeg -version
```

### 9. Node.js Issues

**Error:**
```
npm: command not found
```

**Solution:**
Install Node.js 18 or higher from https://nodejs.org/

Verify:
```bash
node --version
npm --version
```

### 10. Electron Build Issues

**Error:**
```
Electron failed to install correctly
```

**Solution:**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# If still fails, try with legacy peer deps
npm install --legacy-peer-deps
```

## System Requirements Checklist

Before installation, ensure you have:

- [ ] Operating System: Windows 10+, macOS 10.14+, or Linux
- [ ] Node.js: v18 or higher
- [ ] Python: 3.8 or higher
- [ ] FFmpeg: Installed and in PATH
- [ ] RAM: 8GB minimum (16GB recommended)
- [ ] Disk Space: ~5GB free (for dependencies and AI models)
- [ ] Internet: Required for initial setup and model downloads

## Installation Steps (Clean Install)

If you're having persistent issues, try a clean installation:

```bash
# 1. Remove existing installations
rm -rf venv node_modules

# 2. Install system dependencies (Ubuntu)
sudo apt-get update
sudo apt-get install -y ffmpeg libavcodec-dev libavformat-dev libavutil-dev \
    libavdevice-dev libavfilter-dev libswscale-dev libswresample-dev pkg-config

# 3. Create new Python virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 4. Upgrade pip
pip install --upgrade pip setuptools wheel

# 5. Install Python dependencies
pip install -r python/requirements.txt

# 6. Install Node.js dependencies
npm install

# 7. Verify setup
python python/setup.py

# 8. Run development server
npm run electron:dev
```

## Performance Optimization

### For Slower Machines

1. **Use smaller AI models:**
   - Edit `python/video_analyzer.py`: Change to `whisper.load_model("tiny")`
   - Edit `python/audiocraft_generator.py`: Change to `MusicGen.get_pretrained('small')`

2. **Reduce video quality for testing:**
   - Test with shorter videos (1-2 minutes)
   - Use lower resolution videos initially

3. **Disable GPU if causing issues:**
   - Set environment variable: `export CUDA_VISIBLE_DEVICES=-1` (forces CPU)

### For Faster Performance (with GPU)

1. **Install CUDA-enabled PyTorch:**
   ```bash
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
   ```

2. **Verify CUDA is working:**
   ```python
   import torch
   print(torch.cuda.is_available())  # Should print True
   print(torch.cuda.get_device_name(0))  # Should print your GPU name
   ```

## Getting Help

If you continue to have issues:

1. Check the error message carefully
2. Search for similar issues on GitHub
3. Check console/terminal output for detailed errors
4. Ensure all prerequisites are installed
5. Try the clean installation steps above

For specific error messages not covered here, please open an issue on GitHub with:
- Full error message
- Your operating system and version
- Python version (`python --version`)
- Node.js version (`node --version`)
- FFmpeg version (`ffmpeg -version`)
