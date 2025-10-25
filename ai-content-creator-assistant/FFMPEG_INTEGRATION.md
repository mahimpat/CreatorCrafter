# FFmpeg Integration Guide

## Overview

This document details how to integrate FFmpeg for video processing in the AI Content Creator Assistant application.

## FFmpeg Installation

### Verification

```bash
ffmpeg -version
ffprobe -version
```

### Installation Paths

- **macOS**: `/usr/local/bin/ffmpeg` (Homebrew)
- **Windows**: `C:\ffmpeg\bin\ffmpeg.exe`
- **Linux**: `/usr/bin/ffmpeg`

## Integration Approach

### Option 1: System FFmpeg (Recommended for Development)

Use system-installed FFmpeg via child_process:

```typescript
import { spawn } from 'child_process';
import path from 'path';

async function extractMetadata(videoPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_format',
      '-show_streams',
      '-of', 'json',
      videoPath
    ]);

    let output = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('FFprobe failed'));
        return;
      }

      const metadata = JSON.parse(output);
      resolve(parseMetadata(metadata));
    });
  });
}
```

### Option 2: Bundled FFmpeg (Production)

Include FFmpeg binaries in the application:

**Directory Structure:**
```
resources/
  bin/
    darwin/
      ffmpeg
      ffprobe
    win32/
      ffmpeg.exe
      ffprobe.exe
    linux/
      ffmpeg
      ffprobe
```

**Dynamic Path Resolution:**

```typescript
import { app } from 'electron';
import path from 'path';

function getFFmpegPath(): string {
  const platform = process.platform;
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    return 'ffmpeg'; // Use system FFmpeg
  }

  const resourcesPath = process.resourcesPath;
  const extension = platform === 'win32' ? '.exe' : '';

  return path.join(
    resourcesPath,
    'bin',
    platform,
    `ffmpeg${extension}`
  );
}
```

## Common Operations

### 1. Extract Video Metadata

```typescript
async function getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  const ffprobe = spawn(getFFprobePath(), [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate,codec_name,bit_rate',
    '-show_entries', 'format=duration,size,format_name',
    '-of', 'json',
    videoPath
  ]);

  // Parse output...

  return {
    width: stream.width,
    height: stream.height,
    fps: parseFPS(stream.r_frame_rate),
    codec: stream.codec_name,
    bitrate: parseInt(stream.bit_rate),
    duration: parseFloat(format.duration),
    size: parseInt(format.size),
    format: format.format_name,
    hasAudio: hasAudioStream(data),
  };
}
```

### 2. Extract Audio from Video

```typescript
async function extractAudio(
  videoPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(getFFmpegPath(), [
      '-i', videoPath,
      '-vn', // No video
      '-acodec', 'pcm_s16le', // PCM 16-bit for Whisper
      '-ar', '16000', // 16kHz sample rate
      '-ac', '1', // Mono
      outputPath
    ]);

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    // Progress reporting
    ffmpeg.stderr.on('data', (data) => {
      const progress = parseProgress(data.toString());
      sendProgressUpdate(progress);
    });
  });
}
```

### 3. Extract Frame/Thumbnail

```typescript
async function extractFrame(
  videoPath: string,
  timestamp: number,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(getFFmpegPath(), [
      '-ss', timestamp.toString(),
      '-i', videoPath,
      '-vframes', '1',
      '-q:v', '2', // Quality
      outputPath
    ]);

    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg failed: ${code}`));
    });
  });
}
```

### 4. Generate Thumbnail Strip

```typescript
async function generateThumbnails(
  videoPath: string,
  count: number,
  outputDir: string
): Promise<string[]> {
  const metadata = await getVideoMetadata(videoPath);
  const interval = metadata.duration / count;
  const thumbnails: string[] = [];

  for (let i = 0; i < count; i++) {
    const timestamp = i * interval;
    const outputPath = path.join(outputDir, `thumb_${i}.jpg`);
    await extractFrame(videoPath, timestamp, outputPath);
    thumbnails.push(outputPath);
  }

  return thumbnails;
}
```

### 5. Burn Captions into Video

```typescript
async function burnCaptions(
  videoPath: string,
  captionsPath: string, // SRT or ASS file
  outputPath: string
): Promise<void> {
  // Escape path for FFmpeg
  const escapedCaptionsPath = captionsPath.replace(/\\/g, '/').replace(/:/g, '\\:');

  const ffmpeg = spawn(getFFmpegPath(), [
    '-i', videoPath,
    '-vf', `subtitles=${escapedCaptionsPath}:force_style='FontName=Arial,FontSize=24,PrimaryColour=&HFFFFFF&'`,
    '-c:a', 'copy',
    outputPath
  ]);

  return promisifyFFmpeg(ffmpeg);
}
```

### 6. Add Audio Overlay (SFX)

```typescript
async function addAudioOverlay(
  videoPath: string,
  audioPath: string,
  startTime: number,
  volume: number,
  outputPath: string
): Promise<void> {
  const ffmpeg = spawn(getFFmpegPath(), [
    '-i', videoPath,
    '-i', audioPath,
    '-filter_complex',
    `[1:a]adelay=${startTime * 1000}|${startTime * 1000},volume=${volume}[a1];[0:a][a1]amix=inputs=2[aout]`,
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy',
    outputPath
  ]);

  return promisifyFFmpeg(ffmpeg);
}
```

### 7. Export Final Video

```typescript
async function exportVideo(
  project: Project,
  config: ExportConfig
): Promise<void> {
  const filterComplex = buildFilterComplex(project);

  const ffmpeg = spawn(getFFmpegPath(), [
    '-i', project.videoPath,
    ...getAudioInputs(project.soundEffects),
    '-filter_complex', filterComplex,
    '-map', '[vout]',
    '-map', '[aout]',
    '-c:v', getVideoCodec(config.format),
    '-b:v', getVideoBitrate(config.quality),
    '-c:a', 'aac',
    '-b:a', '192k',
    config.outputPath
  ]);

  // Progress tracking
  let duration = project.videoMetadata.duration;
  ffmpeg.stderr.on('data', (data) => {
    const timeMatch = /time=(\d+):(\d+):(\d+\.\d+)/.exec(data.toString());
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = parseFloat(timeMatch[3]);
      const currentTime = hours * 3600 + minutes * 60 + seconds;
      const progress = (currentTime / duration) * 100;

      sendProgressUpdate({
        operationId: 'export',
        progress: Math.min(progress, 100),
        message: `Exporting video: ${Math.round(progress)}%`
      });
    }
  });

  return promisifyFFmpeg(ffmpeg);
}
```

## Filter Complex Examples

### Text Overlays

```typescript
function buildTextOverlayFilter(overlay: TextOverlay): string {
  return `drawtext=text='${escapeText(overlay.text)}':` +
         `fontfile=${getFontPath(overlay.style.fontFamily)}:` +
         `fontsize=${overlay.style.fontSize}:` +
         `fontcolor=${overlay.style.color}:` +
         `x=(w-text_w)*${overlay.position.x / 100}:` +
         `y=(h-text_h)*${overlay.position.y / 100}:` +
         `enable='between(t,${overlay.startTime},${overlay.endTime})'`;
}
```

### Multiple Audio Tracks

```typescript
function buildAudioMixFilter(soundEffects: SoundEffect[]): string {
  const inputs = soundEffects.map((sfx, i) =>
    `[${i + 1}:a]adelay=${sfx.startTime * 1000}|${sfx.startTime * 1000},volume=${sfx.volume}[a${i + 1}]`
  ).join(';');

  const mix = `[0:a]${soundEffects.map((_, i) => `[a${i + 1}]`).join('')}amix=inputs=${soundEffects.length + 1}[aout]`;

  return `${inputs};${mix}`;
}
```

## Error Handling

```typescript
function handleFFmpegError(stderr: string): AppError {
  if (stderr.includes('No such file')) {
    return {
      code: ErrorCode.FILE_NOT_FOUND,
      message: 'Input file not found',
      details: stderr
    };
  }

  if (stderr.includes('Invalid data')) {
    return {
      code: ErrorCode.INVALID_FILE_FORMAT,
      message: 'Invalid or corrupted video file',
      details: stderr
    };
  }

  if (stderr.includes('codec not currently supported')) {
    return {
      code: ErrorCode.PROCESSING_ERROR,
      message: 'Video codec not supported',
      details: stderr
    };
  }

  return {
    code: ErrorCode.PROCESSING_ERROR,
    message: 'Video processing failed',
    details: stderr
  };
}
```

## Performance Optimization

### 1. Hardware Acceleration

```typescript
function getHardwareAccelArgs(platform: string): string[] {
  if (platform === 'darwin') {
    // VideoToolbox on macOS
    return ['-hwaccel', 'videotoolbox'];
  } else if (platform === 'win32') {
    // DXVA2 on Windows
    return ['-hwaccel', 'dxva2'];
  } else {
    // VAAPI on Linux
    return ['-hwaccel', 'vaapi'];
  }
}
```

### 2. Multi-threading

```typescript
const ffmpegArgs = [
  '-threads', Math.min(os.cpus().length, 8).toString(),
  '-i', inputPath,
  // ... other args
];
```

### 3. Fast Seek

```typescript
// Seek before input (faster)
const ffmpegArgs = [
  '-ss', timestamp.toString(), // Fast seek
  '-i', videoPath,
  // ... other args
];
```

## Testing FFmpeg Integration

```typescript
describe('FFmpeg Integration', () => {
  it('should extract video metadata', async () => {
    const metadata = await getVideoMetadata('test-video.mp4');
    expect(metadata.width).toBe(1920);
    expect(metadata.height).toBe(1080);
  });

  it('should extract audio', async () => {
    await extractAudio('test-video.mp4', 'output.wav');
    expect(fs.existsSync('output.wav')).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    await expect(
      getVideoMetadata('nonexistent.mp4')
    ).rejects.toThrow('File not found');
  });
});
```

## Deployment Considerations

### Packaging FFmpeg

**electron-builder configuration:**

```json
{
  "build": {
    "extraResources": [
      {
        "from": "resources/bin",
        "to": "bin",
        "filter": ["**/*"]
      }
    ],
    "asarUnpack": [
      "resources/bin/**/*"
    ]
  }
}
```

### License Compliance

FFmpeg is LGPL/GPL licensed. Ensure compliance by:

1. Dynamically linking FFmpeg (not statically)
2. Providing source code or written offer
3. Including FFmpeg license in application
4. Not removing FFmpeg copyright notices

## Alternatives to FFmpeg

### fluent-ffmpeg

```typescript
import ffmpeg from 'fluent-ffmpeg';

ffmpeg(videoPath)
  .output(outputPath)
  .videoCodec('libx264')
  .audioCodec('aac')
  .on('progress', (progress) => {
    console.log(`Processing: ${progress.percent}% done`);
  })
  .on('end', () => {
    console.log('Processing finished');
  })
  .run();
```

### @ffmpeg/ffmpeg (WebAssembly)

For browser-based processing:

```typescript
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({ log: true });
await ffmpeg.load();

ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoPath));
await ffmpeg.run('-i', 'input.mp4', '-ss', '00:00:01', 'frame.jpg');
const data = ffmpeg.FS('readFile', 'frame.jpg');
```

## Resources

- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [FFmpeg Filters](https://ffmpeg.org/ffmpeg-filters.html)
- [FFmpeg Wiki](https://trac.ffmpeg.org/wiki)
