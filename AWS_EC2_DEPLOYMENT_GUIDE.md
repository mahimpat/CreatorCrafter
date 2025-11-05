# CreatorCrafter - AWS EC2 Deployment Guide

**Complete step-by-step guide to deploy CreatorCrafter on Amazon EC2**

---

## Overview

This guide will help you:
1. Set up an EC2 instance
2. Install all dependencies
3. Build the Windows installer
4. Set up a distribution server
5. Configure domain and SSL (optional)

---

## Prerequisites

- AWS account with EC2 access
- Domain name (optional, for custom URL)
- SSH client (PuTTY for Windows, built-in for Mac/Linux)

---

## Part 1: EC2 Instance Setup

### Step 1.1: Launch EC2 Instance

1. **Log into AWS Console**
   - Go to https://console.aws.amazon.com
   - Navigate to EC2 Dashboard

2. **Launch Instance**
   - Click "Launch Instance"
   - Choose these settings:

   **Name:** `CreatorCrafter-Build-Server`

   **Application and OS Images (Amazon Machine Image):**
   - Quick Start: Ubuntu
   - Amazon Machine Image (AMI): **Ubuntu Server 22.04 LTS**
   - Architecture: **64-bit (x86)**

   **Instance Type:**
   - For building only: **t3.medium** (2 vCPU, 4 GB RAM) - ~$0.04/hour
   - For building + hosting: **t3.large** (2 vCPU, 8 GB RAM) - ~$0.08/hour
   - Recommended: **t3.medium** (sufficient for building)

   **Key Pair:**
   - Click "Create new key pair"
   - Name: `creatorcrafter-key`
   - Type: RSA
   - Format:
     - `.pem` for Mac/Linux
     - `.ppk` for Windows (PuTTY)
   - **IMPORTANT:** Download and save this file securely!

   **Network Settings:**
   - Create security group: Yes
   - Security group name: `creatorcrafter-sg`
   - Allow SSH traffic from: **My IP** (more secure)
   - Allow HTTP traffic: **Yes** (if hosting installer)
   - Allow HTTPS traffic: **Yes** (if using SSL)

   **Configure Storage:**
   - Size: **30 GB** (minimum)
   - Recommended: **50 GB** (for builds + node_modules + models)
   - Type: **gp3** (better performance)

3. **Launch Instance**
   - Click "Launch Instance"
   - Wait 2-3 minutes for instance to start

4. **Get Instance Details**
   - Click on instance ID
   - Note down:
     - **Public IPv4 address** (e.g., 54.123.45.67)
     - **Public IPv4 DNS** (e.g., ec2-54-123-45-67.compute-1.amazonaws.com)

---

### Step 1.2: Configure Security Group

1. **Go to Security Groups**
   - EC2 Dashboard → Security Groups
   - Select `creatorcrafter-sg`

2. **Edit Inbound Rules**
   - Click "Edit inbound rules"
   - Add these rules:

   | Type | Port | Source | Description |
   |------|------|--------|-------------|
   | SSH | 22 | My IP | SSH access |
   | HTTP | 80 | 0.0.0.0/0 | Web access |
   | HTTPS | 443 | 0.0.0.0/0 | Secure web |
   | Custom TCP | 3000 | 0.0.0.0/0 | Node server (optional) |

3. **Save Rules**

---

### Step 1.3: Connect to EC2 Instance

**On Mac/Linux:**
```bash
# Set correct permissions for key file
chmod 400 ~/Downloads/creatorcrafter-key.pem

# Connect via SSH
ssh -i ~/Downloads/creatorcrafter-key.pem ubuntu@54.123.45.67
# Replace 54.123.45.67 with your instance's public IP
```

**On Windows (using PuTTY):**
1. Open PuTTY
2. Host Name: `ubuntu@54.123.45.67` (use your IP)
3. Port: 22
4. Connection → SSH → Auth → Credentials
5. Browse and select your `.ppk` key file
6. Click "Open"

**First Connection:**
- You'll see: "Are you sure you want to continue connecting?"
- Type: `yes`

---

## Part 2: Server Setup

### Step 2.1: Update System

```bash
# Update package lists
sudo apt update

# Upgrade installed packages
sudo apt upgrade -y

# Install essential build tools
sudo apt install -y build-essential git curl wget
```

---

### Step 2.2: Install Node.js

```bash
# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version    # Should show v20.x.x
npm --version     # Should show 10.x.x
```

---

### Step 2.3: Install Python and System Dependencies

```bash
# Install Python 3.11 and development headers
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Install pkg-config (required for PyAV)
sudo apt install -y pkg-config

# Install FFmpeg development libraries (required for PyAV/audiocraft)
sudo apt install -y \
    ffmpeg \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavutil-dev \
    libavfilter-dev \
    libswscale-dev \
    libswresample-dev

# Install audio processing libraries
sudo apt install -y \
    libsndfile1-dev \
    libsamplerate0-dev \
    libasound2-dev \
    portaudio19-dev

# Install additional build dependencies
sudo apt install -y \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libopenblas-dev \
    liblapack-dev \
    gfortran

# Verify installations
python3.11 --version    # Should show Python 3.11.x
pkg-config --version    # Should show pkg-config version
ffmpeg -version         # Should show FFmpeg version

# Set Python 3.11 as default (optional)
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
```

**Automated Installation:**

Alternatively, use the provided script:
```bash
# Make script executable
chmod +x setup-ec2-dependencies.sh

# Run installation script
./setup-ec2-dependencies.sh
```

---

### Step 2.4: Install Wine (for Windows builds on Linux)

```bash
# Enable 32-bit architecture
sudo dpkg --add-architecture i386

# Add Wine repository
sudo mkdir -pm755 /etc/apt/keyrings
sudo wget -O /etc/apt/keyrings/winehq-archive.key https://dl.winehq.org/wine-builds/winehq.key

# Add Wine source
sudo wget -NP /etc/apt/sources.list.d/ https://dl.winehq.org/wine-builds/ubuntu/dists/jammy/winehq-jammy.sources

# Update and install Wine
sudo apt update
sudo apt install -y --install-recommends winehq-stable

# Verify Wine installation
wine --version    # Should show wine-9.x
```

**Note:** Wine is needed to build Windows installers on Linux. Initial Wine setup may take 5-10 minutes.

---

### Step 2.5: Install Additional Dependencies

```bash
# Install FFmpeg (for video processing)
sudo apt install -y ffmpeg

# Install other utilities
sudo apt install -y zip unzip tree htop

# Verify FFmpeg
ffmpeg -version
```

---

## Part 3: Clone and Build CreatorCrafter

### Step 3.1: Clone Repository

```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone https://github.com/YOUR_USERNAME/CreatorCrafter.git
# Replace YOUR_USERNAME with your GitHub username

# If repository is private, you'll need to authenticate:
# Option 1: Use personal access token
# git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/CreatorCrafter.git

# Option 2: Use SSH (requires setting up SSH keys)
# git clone git@github.com:YOUR_USERNAME/CreatorCrafter.git

# Navigate to project directory
cd CreatorCrafter

# Checkout the branch with fixes
git checkout mvp-complete-typescript-fixes
```

---

### Step 3.2: Install Node Dependencies

```bash
# Install all npm packages
npm install

# This will take 5-10 minutes
# You'll see progress for ~1000+ packages
```

---

### Step 3.3: Set Up Python Virtual Environment

```bash
# Create virtual environment
python3.11 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install Python dependencies
pip install -r requirements.txt

# This will take 10-15 minutes
# PyTorch download is ~2GB

# Deactivate venv (we don't need it active for building)
deactivate
```

---

### Step 3.4: Build Windows Installer

```bash
# Build the Windows installer
npm run electron:build:win

# This process takes 10-20 minutes
# You'll see:
# - Vite building frontend assets
# - Electron-builder packaging app
# - NSIS creating installer

# Expected output:
# • electron-builder  version=24.13.3
# • packaging       platform=win32 arch=x64
# • building        target=nsis file=release/CreatorCrafter Setup 1.0.0.exe
# • building block map  blockMapFile=release/CreatorCrafter Setup 1.0.0.exe.blockmap
```

**Common Issues:**

**Issue: Wine initialization takes long**
```bash
# First-time Wine setup creates ~/.wine directory
# This is normal and may take 5-10 minutes
# You'll see: "wine: created the configuration directory..."
```

**Issue: Out of memory**
```bash
# If build fails with memory error:
# 1. Stop the build (Ctrl+C)
# 2. Increase swap space:
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
# 3. Try build again
```

---

### Step 3.5: Verify Build

```bash
# Check if installer was created
ls -lh release/

# You should see:
# CreatorCrafter Setup 1.0.0.exe  (~140MB)
# CreatorCrafter Setup 1.0.0.exe.blockmap
# latest.yml
# win-unpacked/ (directory)

# Check installer size
du -h release/CreatorCrafter\ Setup\ 1.0.0.exe
# Should be around 138-145 MB
```

---

## Part 4: Distribution Options

You have several options for distributing the installer:

### Option A: Direct Download from EC2 (Simple)

**Step A.1: Install Nginx Web Server**

```bash
# Install Nginx
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify it's running
sudo systemctl status nginx
```

**Step A.2: Set Up Download Directory**

```bash
# Create downloads directory
sudo mkdir -p /var/www/html/downloads

# Copy installer to web directory
sudo cp "release/CreatorCrafter Setup 1.0.0.exe" /var/www/html/downloads/

# Set permissions
sudo chmod 644 /var/www/html/downloads/*
sudo chown -R www-data:www-data /var/www/html/downloads
```

**Step A.3: Create Download Page**

```bash
# Create simple HTML page
sudo nano /var/www/html/index.html
```

Paste this content:
```html
<!DOCTYPE html>
<html>
<head>
    <title>CreatorCrafter - Download</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #1a1a1a;
            color: #fff;
        }
        .download-btn {
            display: inline-block;
            padding: 15px 30px;
            background: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-size: 18px;
            margin: 20px 0;
        }
        .download-btn:hover {
            background: #45a049;
        }
        .info {
            background: #333;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>CreatorCrafter - AI Video Content Creator</h1>

    <div class="info">
        <h2>System Requirements</h2>
        <ul>
            <li>Windows 10 or Windows 11</li>
            <li>Python 3.8 - 3.11 (must be installed separately)</li>
            <li>3GB free disk space</li>
            <li>Internet connection (for AI models download)</li>
        </ul>
    </div>

    <a href="/downloads/CreatorCrafter Setup 1.0.0.exe" class="download-btn">
        Download CreatorCrafter (138 MB)
    </a>

    <div class="info">
        <h2>Installation Instructions</h2>
        <ol>
            <li>Download and install Python from <a href="https://python.org">python.org</a></li>
            <li>Run the CreatorCrafter installer</li>
            <li>Wait 20-30 minutes for setup to complete</li>
            <li>Launch CreatorCrafter and start creating!</li>
        </ol>
    </div>
</body>
</html>
```

Save and exit: `Ctrl+X`, then `Y`, then `Enter`

**Step A.4: Test Download**

Open browser and go to:
```
http://YOUR_EC2_IP/
```

You should see the download page!

---

### Option B: Upload to S3 (Recommended for Production)

**Step B.1: Install AWS CLI**

```bash
# Install AWS CLI
sudo apt install -y awscli

# Configure AWS credentials
aws configure
# Enter your:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (e.g., us-east-1)
# - Default output format (json)
```

**Step B.2: Create S3 Bucket**

```bash
# Create bucket (bucket name must be globally unique)
aws s3 mb s3://creatorcrafter-downloads

# Enable public access for downloads
aws s3api put-public-access-block \
  --bucket creatorcrafter-downloads \
  --public-access-block-configuration \
  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

**Step B.3: Upload Installer**

```bash
# Upload installer to S3
aws s3 cp "release/CreatorCrafter Setup 1.0.0.exe" \
  s3://creatorcrafter-downloads/ \
  --acl public-read

# Get download URL
echo "https://creatorcrafter-downloads.s3.amazonaws.com/CreatorCrafter%20Setup%201.0.0.exe"
```

**Step B.4: Set Up CloudFront (Optional - for faster downloads)**

1. Go to CloudFront in AWS Console
2. Create Distribution
3. Origin Domain: Select your S3 bucket
4. Default Cache Behavior: Allow GET, HEAD
5. Create Distribution
6. Use CloudFront URL for downloads

---

### Option C: GitHub Releases (Recommended for Open Source)

**Step C.1: Create GitHub Release**

```bash
# From your local machine with git push access:

# Tag the release
git tag -a v1.0.0 -m "CreatorCrafter v1.0.0 - Production Release"

# Push tag to GitHub
git push origin v1.0.0
```

**Step C.2: Upload Installer to Release**

1. Go to your GitHub repository
2. Click "Releases" → "Draft a new release"
3. Choose tag: `v1.0.0`
4. Release title: `CreatorCrafter v1.0.0`
5. Description: Add changelog and features
6. Attach files: Upload `CreatorCrafter Setup 1.0.0.exe`
7. Click "Publish release"

**Step C.3: Download from EC2**

Users can download directly from:
```
https://github.com/YOUR_USERNAME/CreatorCrafter/releases/download/v1.0.0/CreatorCrafter%20Setup%201.0.0.exe
```

---

## Part 5: Custom Domain Setup (Optional)

### Step 5.1: Point Domain to EC2

**In your domain registrar (GoDaddy, Namecheap, etc.):**

1. Go to DNS Management
2. Add an **A Record**:
   - Name: `download` (or `@` for root domain)
   - Type: `A`
   - Value: `YOUR_EC2_IP` (e.g., 54.123.45.67)
   - TTL: 300

Wait 5-15 minutes for DNS propagation.

---

### Step 5.2: Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d download.yourdomain.com
# Replace download.yourdomain.com with your domain

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose: Redirect HTTP to HTTPS (option 2)

# Certbot will auto-configure Nginx for SSL
```

**Test SSL:**
Visit: `https://download.yourdomain.com`

**Auto-renewal:**
```bash
# Certbot automatically sets up renewal
# Test renewal:
sudo certbot renew --dry-run
```

---

## Part 6: Automated Build Pipeline (Optional)

### Step 6.1: Create Build Script

```bash
# Create build script
nano ~/build-installer.sh
```

Paste this content:
```bash
#!/bin/bash
set -e

echo "========================================="
echo "CreatorCrafter Build Pipeline"
echo "========================================="
echo ""

cd ~/CreatorCrafter

echo "[1/6] Pulling latest code..."
git pull origin mvp-complete-typescript-fixes

echo "[2/6] Installing npm dependencies..."
npm install

echo "[3/6] Building Windows installer..."
npm run electron:build:win

echo "[4/6] Checking build..."
if [ ! -f "release/CreatorCrafter Setup 1.0.0.exe" ]; then
    echo "ERROR: Build failed - installer not found"
    exit 1
fi

echo "[5/6] Copying to web directory..."
sudo cp "release/CreatorCrafter Setup 1.0.0.exe" /var/www/html/downloads/
sudo chmod 644 /var/www/html/downloads/*
sudo chown www-data:www-data /var/www/html/downloads/*

echo "[6/6] Build complete!"
echo ""
echo "Installer available at:"
echo "http://YOUR_EC2_IP/downloads/CreatorCrafter%20Setup%201.0.0.exe"
echo ""
echo "File size:"
du -h "release/CreatorCrafter Setup 1.0.0.exe"
```

Save and exit: `Ctrl+X`, `Y`, `Enter`

```bash
# Make script executable
chmod +x ~/build-installer.sh

# Run build
~/build-installer.sh
```

---

### Step 6.2: Set Up Cron Job (Auto-build on schedule)

```bash
# Edit crontab
crontab -e

# Add this line to build daily at 2 AM:
0 2 * * * /home/ubuntu/build-installer.sh >> /home/ubuntu/build.log 2>&1

# Or build on git push (requires webhook setup)
```

---

## Part 7: Monitoring and Maintenance

### Step 7.1: Monitor Disk Space

```bash
# Check disk usage
df -h

# Check specific directories
du -h --max-depth=1 ~/CreatorCrafter

# Clean up old builds if needed
rm -rf ~/CreatorCrafter/release/win-unpacked
rm -rf ~/CreatorCrafter/node_modules/.cache
```

---

### Step 7.2: Monitor Server Resources

```bash
# Check CPU and memory
htop

# Check network usage
sudo apt install -y nethogs
sudo nethogs

# Check active connections
sudo netstat -tupln
```

---

### Step 7.3: Set Up Backups

```bash
# Backup installer to S3 (if using S3)
aws s3 sync ~/CreatorCrafter/release s3://creatorcrafter-backups/releases/

# Or create local backup
tar -czf ~/backup-$(date +%Y%m%d).tar.gz ~/CreatorCrafter/release/
```

---

## Part 8: Troubleshooting

### Issue: Build fails with "ENOSPC: System limit for number of file watchers"

```bash
# Increase file watcher limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

### Issue: Wine errors during build

```bash
# Reinitialize Wine
rm -rf ~/.wine
winecfg  # This will recreate Wine config

# Try build again
npm run electron:build:win
```

---

### Issue: Out of disk space

```bash
# Clean npm cache
npm cache clean --force

# Clean old builds
rm -rf ~/CreatorCrafter/release

# Remove old Docker images/containers if any
docker system prune -a
```

---

### Issue: Nginx not serving files

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx

# Test Nginx configuration
sudo nginx -t
```

---

## Part 9: Security Best Practices

### Step 9.1: Secure SSH

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Change these settings:
# PermitRootLogin no
# PasswordAuthentication no
# Port 2222  # Change default port (optional)

# Restart SSH
sudo systemctl restart sshd
```

---

### Step 9.2: Set Up Firewall

```bash
# Install UFW (Uncomplicated Firewall)
sudo apt install -y ufw

# Allow SSH (use custom port if you changed it)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

### Step 9.3: Keep System Updated

```bash
# Create update script
sudo nano /usr/local/bin/update-system.sh
```

Paste:
```bash
#!/bin/bash
apt update
apt upgrade -y
apt autoremove -y
apt autoclean
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/update-system.sh

# Run weekly
sudo crontab -e
# Add: 0 3 * * 0 /usr/local/bin/update-system.sh
```

---

## Part 10: Cost Optimization

### Option 1: Stop Instance When Not Building

```bash
# From local machine:
# Stop instance (doesn't delete, just stops billing for compute)
aws ec2 stop-instances --instance-ids i-1234567890abcdef0

# Start when needed
aws ec2 start-instances --instance-ids i-1234567890abcdef0
```

**Savings:** ~90% (only pay for storage, not compute)

---

### Option 2: Use Spot Instances

- Launch EC2 as Spot Instance instead of On-Demand
- Savings: Up to 90%
- Downside: Instance may be terminated if AWS needs capacity

---

### Option 3: Use GitHub Actions (Free for Public Repos)

Instead of EC2, use GitHub Actions for building:

```yaml
# .github/workflows/build.yml
name: Build Windows Installer

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '20'

    - name: Install dependencies
      run: npm install

    - name: Build installer
      run: npm run electron:build:win

    - name: Upload artifact
      uses: actions/upload-artifact@v3
      with:
        name: windows-installer
        path: release/*.exe
```

**Cost:** FREE for public repos!

---

## Summary Checklist

### Initial Setup
- [ ] Launch EC2 instance (t3.medium, Ubuntu 22.04)
- [ ] Configure security group (SSH, HTTP, HTTPS)
- [ ] Connect via SSH
- [ ] Update system packages

### Install Dependencies
- [ ] Install Node.js 20.x
- [ ] Install Python 3.11
- [ ] Install Wine (for Windows builds)
- [ ] Install FFmpeg

### Build Project
- [ ] Clone Git repository
- [ ] Install npm dependencies
- [ ] Set up Python venv
- [ ] Build Windows installer
- [ ] Verify installer created

### Distribution
- [ ] Choose distribution method (EC2/S3/GitHub)
- [ ] Set up web server (if using EC2)
- [ ] Upload installer
- [ ] Test download

### Optional
- [ ] Configure custom domain
- [ ] Set up SSL certificate
- [ ] Create build automation script
- [ ] Set up monitoring
- [ ] Configure backups

---

## Quick Reference Commands

```bash
# Connect to EC2
ssh -i ~/path/to/key.pem ubuntu@YOUR_EC2_IP

# Navigate to project
cd ~/CreatorCrafter

# Pull latest code
git pull origin mvp-complete-typescript-fixes

# Build installer
npm run electron:build:win

# Copy to web directory
sudo cp "release/CreatorCrafter Setup 1.0.0.exe" /var/www/html/downloads/

# Check disk space
df -h

# Monitor resources
htop

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
```

---

## Support Resources

- **AWS Documentation:** https://docs.aws.amazon.com/ec2/
- **Nginx Documentation:** https://nginx.org/en/docs/
- **Let's Encrypt:** https://letsencrypt.org/getting-started/
- **Electron Builder:** https://www.electron.build/

---

**You now have a complete EC2 deployment setup for CreatorCrafter!** 🎉

Choose your distribution method and follow the relevant sections above.
