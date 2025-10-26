# FreeSound API Setup Guide

## Step 1: Get Your FreeSound API Credentials

1. **Go to FreeSound API Application page:**
   https://freesound.org/apiv2/apply

2. **Create an account or login** if you don't have one

3. **Fill out the application form:**
   - **Name**: CreatorCrafter (or your app name)
   - **Description**: AI-powered video editing tool with sound effects integration
   - **URL**: http://localhost:3000 (or your domain if you have one)
   - **Redirect URI**: http://localhost:3000/freesound/callback
   - **Allow read**: ✓ Yes
   - **Allow write**: ✓ Yes (if you want users to upload sounds)

4. **Submit the application**
   - You'll receive your credentials immediately or after approval
   - You'll get:
     - **Client ID** - A long string of letters and numbers
     - **Client Secret** - Another long string (keep this secret!)

## Step 2: Add Credentials to Your Project

### Option A: Interactive Setup (Recommended)

Run this command in your project directory:

```bash
echo "FREESOUND_CLIENT_ID=your_client_id_here
FREESOUND_CLIENT_SECRET=your_client_secret_here
FREESOUND_REDIRECT_URI=http://localhost:3000/freesound/callback" > .env
```

Then edit the `.env` file and replace `your_client_id_here` and `your_client_secret_here` with your actual credentials.

### Option B: Manual Setup

1. Create a file named `.env` in your project root (same folder as package.json)

2. Add the following content:

```env
# FreeSound API Configuration
FREESOUND_CLIENT_ID=paste_your_client_id_here
FREESOUND_CLIENT_SECRET=paste_your_client_secret_here
FREESOUND_REDIRECT_URI=http://localhost:3000/freesound/callback
```

3. Replace the placeholder values:
   - Replace `paste_your_client_id_here` with your actual Client ID
   - Replace `paste_your_client_secret_here` with your actual Client Secret

### Example .env file:

```env
FREESOUND_CLIENT_ID=kJ8mN2pQ5rT9wX3yZ6aB4cD7eF1gH0i
FREESOUND_CLIENT_SECRET=xY9wV8uT7sR6qP5oN4mL3kJ2iH1gF0eD9cB8aZ7yX6wV5uT4sR3qP2oN1m
FREESOUND_REDIRECT_URI=http://localhost:3000/freesound/callback
```

## Step 3: Verify Setup

1. **Make sure .env is in .gitignore** (it already should be)
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Restart your application:**
   ```bash
   npm run electron:dev
   ```

3. **Check the console** - You should see:
   ```
   FreeSound service initialized
   ```

   If you see:
   ```
   FreeSound API credentials not found in environment variables
   ```
   Then your `.env` file is not being loaded properly.

## Step 4: Test the Integration

1. **Open the app** and create/open a project

2. **Go to Sound FX tab** in the right sidebar

3. **Click "FreeSound Library" tab**

4. **Click "Connect to FreeSound"**
   - A browser window will open
   - Login to FreeSound if needed
   - Authorize the application
   - Browser will show "Authorization Successful!"
   - Return to the app - you should now be connected

5. **Try searching:**
   - Type "footsteps" in the search box
   - Click "Search"
   - You should see sound results

6. **Try previewing:**
   - Click "Preview" on any sound card
   - Audio should play

7. **Try adding to timeline:**
   - Click "Add to Timeline" on any sound
   - Sound should be downloaded and added to your project

## Troubleshooting

### "FreeSound service not initialized"
- Check that `.env` file exists in project root
- Check that credentials are correctly formatted (no quotes, no spaces around =)
- Restart the application

### "Authorization timeout"
- Make sure no other app is using port 3000
- Check firewall isn't blocking localhost:3000
- Try again - authorization window has 5 minutes timeout

### "Failed to download sound"
- Make sure you're authenticated (connected to FreeSound)
- Check internet connection
- Some sounds might be removed by uploaders

### "Preview failed to play"
- Check internet connection
- Preview URLs might expire - try refreshing search results

### Port 3000 already in use
If port 3000 is being used by another app:

1. Close the other app using port 3000, OR
2. Change the redirect URI in your .env:
   ```env
   FREESOUND_REDIRECT_URI=http://localhost:3001/freesound/callback
   ```
3. Update your FreeSound application settings to match
4. Restart the app

## Security Notes

⚠️ **IMPORTANT:**
- **NEVER commit your `.env` file to git**
- **NEVER share your Client Secret publicly**
- The `.env` file is already in `.gitignore`
- If you accidentally expose your credentials, regenerate them at https://freesound.org/home/app_permissions/

## Features Once Connected

### Search & Browse
- Search 600,000+ Creative Commons sounds
- Filter by duration, license, popularity
- Sort by relevance, rating, downloads
- View waveforms and spectrograms

### Preview
- Play sound previews directly in app
- High-quality MP3 previews
- No authentication needed for previews

### Download & Add
- Download full quality original files
- Automatically added to project SFX folder
- Added to timeline at current playhead position
- Requires authentication (OAuth2)

### Sound Information
- View tags, description, license
- See file format, size, duration
- Check ratings and download counts
- View uploader profile

## Rate Limits

FreeSound API has rate limits:
- **Without authentication**: 2000 requests per day
- **With authentication**: 60 requests per minute

These limits are very generous for normal use.

## Need Help?

- FreeSound API Docs: https://freesound.org/docs/api/
- FreeSound Forum: https://freesound.org/forum/
- Report bugs in this app: (your github issues URL)

## What's Next?

After setup, you can:
1. ✅ Search for sounds
2. ✅ Preview sounds
3. ✅ Download and add to timeline
4. ✅ Auto-save to project
5. ✅ Mix with AI-generated sounds
6. ✅ Use on timeline like any other SFX

Enjoy your massive sound library! 🎵
