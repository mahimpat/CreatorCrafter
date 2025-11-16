/**
 * ElevenLabs Sound Effects API Service
 * Commercial-license alternative to AudioCraft
 *
 * Pricing: $5/mo Starter plan includes commercial license
 * Cost: 200 credits per generation (AI-decided duration)
 *       40 credits per second (user-defined duration, max 30s)
 */

import { spawn } from 'child_process'
import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'

export interface ElevenLabsConfig {
  apiKey: string
  defaultDuration?: number // seconds, max 30
}

export interface GenerationOptions {
  prompt: string
  duration?: number // If not specified, AI decides (costs more credits)
  outputPath: string
}

export interface GenerationResult {
  success: boolean
  filePath?: string
  duration?: number
  creditsUsed?: number
  error?: string
}

/**
 * Generate sound effect using ElevenLabs API
 * Requires Python with requests library
 */
export async function generateSoundEffect(
  config: ElevenLabsConfig,
  options: GenerationOptions
): Promise<GenerationResult> {
  return new Promise((resolve, reject) => {
    // Create Python script for API call
    const pythonScript = `
import sys
import json
import requests
import time

def generate_sound_effect(api_key, prompt, duration, output_path):
    """Generate sound effect using ElevenLabs API"""

    url = "https://api.elevenlabs.io/v1/sound-generation"

    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }

    data = {
        "text": prompt,
        "model_id": "eleven_text_to_sound_v2"  # Sound effects model (free tier compatible)
    }

    # Add duration if specified (saves credits)
    if duration is not None:
        data["duration_seconds"] = min(duration, 30)  # Max 30 seconds

    print(f"Generating sound effect: {prompt}", file=sys.stderr)
    if duration:
        print(f"Duration: {duration}s (costs {duration * 40} credits)", file=sys.stderr)
    else:
        print(f"AI-decided duration (costs 200 credits)", file=sys.stderr)

    try:
        response = requests.post(url, headers=headers, json=data, timeout=120)

        if response.status_code == 200:
            # Save audio file
            with open(output_path, 'wb') as f:
                f.write(response.content)

            # Get actual duration from file (would need audio library)
            # For now, return requested or estimate
            actual_duration = duration if duration else 5.0

            # Calculate credits used
            credits_used = duration * 40 if duration else 200

            result = {
                "success": True,
                "file_path": output_path,
                "duration": actual_duration,
                "credits_used": credits_used
            }

            print(json.dumps(result))
            return 0

        elif response.status_code == 401:
            error = {
                "success": False,
                "error": "Invalid API key. Please check your ElevenLabs API key in Settings."
            }
            print(json.dumps(error))
            return 1

        elif response.status_code == 429:
            error = {
                "success": False,
                "error": "Rate limit exceeded. Please wait a moment and try again."
            }
            print(json.dumps(error))
            return 1

        elif response.status_code == 400:
            error_data = response.json()
            error = {
                "success": False,
                "error": f"Invalid request: {error_data.get('detail', 'Unknown error')}"
            }
            print(json.dumps(error))
            return 1

        else:
            error = {
                "success": False,
                "error": f"API error: {response.status_code} - {response.text}"
            }
            print(json.dumps(error))
            return 1

    except requests.exceptions.Timeout:
        error = {
            "success": False,
            "error": "Request timed out. The sound generation took too long."
        }
        print(json.dumps(error))
        return 1

    except requests.exceptions.ConnectionError:
        error = {
            "success": False,
            "error": "Connection error. Please check your internet connection."
        }
        print(json.dumps(error))
        return 1

    except Exception as e:
        error = {
            "success": False,
            "error": f"Unexpected error: {str(e)}"
        }
        print(json.dumps(error))
        return 1

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({
            "success": False,
            "error": "Usage: script.py <api_key> <prompt> <output_path> [duration]"
        }))
        sys.exit(1)

    api_key = sys.argv[1]
    prompt = sys.argv[2]
    output_path = sys.argv[3]
    duration = float(sys.argv[4]) if len(sys.argv) > 4 else None

    sys.exit(generate_sound_effect(api_key, prompt, duration, output_path))
`

    // Write Python script to temp file
    const tempScriptPath = join(app.getPath('temp'), `elevenlabs_gen_${Date.now()}.py`)

    writeFile(tempScriptPath, pythonScript)
      .then(() => {
        // Get Python path from venv
        const appRoot = app.isPackaged
          ? process.resourcesPath
          : join(__dirname, '..')

        const installDir = app.isPackaged
          ? join(process.resourcesPath, '..')
          : join(__dirname, '..')

        const pythonPath = process.platform === 'win32'
          ? join(installDir, 'venv', 'python.exe')
          : join(installDir, 'venv', 'bin', 'python')

        // Build arguments
        const args = [
          tempScriptPath,
          config.apiKey,
          options.prompt,
          options.outputPath
        ]

        if (options.duration) {
          args.push(options.duration.toString())
        }

        console.log('Starting ElevenLabs generation:', { prompt: options.prompt, duration: options.duration })

        const python = spawn(pythonPath, args)

        let outputData = ''
        let errorOutput = ''
        let isResolved = false

        // Set timeout (2 minutes should be enough)
        const timeout = setTimeout(() => {
          if (!isResolved) {
            isResolved = true
            python.kill('SIGTERM')
            reject(new Error('Sound generation timed out after 2 minutes'))
          }
        }, 120000)

        python.stdout.on('data', (data) => {
          const output = data.toString()
          outputData += output
        })

        python.stderr.on('data', (data) => {
          const output = data.toString()
          errorOutput += output
          // Only log actual progress/warnings, not debug output
          if (output.includes('Generating sound effect') || output.includes('Duration') || output.includes('⚠️')) {
            console.log(output.trim())
          }
        })

        python.on('close', (code) => {
          clearTimeout(timeout)

          if (isResolved) return // Already handled by timeout

          isResolved = true

          if (code === 0) {
            try {
              // Parse JSON result from Python
              const result = JSON.parse(outputData.trim()) as GenerationResult
              console.log('ElevenLabs generation successful:', result)
              resolve(result)
            } catch (parseError) {
              console.error('Failed to parse Python output:', outputData)
              reject(new Error('Failed to parse generation result'))
            }
          } else {
            // Try to parse error from Python output
            try {
              const errorResult = JSON.parse(outputData.trim()) as GenerationResult
              resolve(errorResult)
            } catch {
              reject(new Error(`Sound generation failed: ${errorOutput || 'Unknown error'}`))
            }
          }
        })

        python.on('error', (err) => {
          clearTimeout(timeout)
          if (!isResolved) {
            isResolved = true
            reject(new Error(`Failed to start Python process: ${err.message}`))
          }
        })
      })
      .catch((err) => {
        reject(new Error(`Failed to write Python script: ${err.message}`))
      })
  })
}

/**
 * Check if ElevenLabs API key is valid
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  return new Promise((resolve) => {
    const pythonScript = `
import sys
import requests

def validate_key(api_key):
    url = "https://api.elevenlabs.io/v1/user"
    headers = {"xi-api-key": api_key}

    try:
        response = requests.get(url, headers=headers, timeout=10)

        # Check if it's a free tier key (missing_permissions error)
        if response.status_code == 401:
            try:
                error_data = response.json()
                if error_data.get("detail", {}).get("status") == "missing_permissions":
                    print("⚠️  You are using a free tier API key.", file=sys.stderr)
                    print("⚠️  Free tier is suitable for testing only.", file=sys.stderr)
                    print("⚠️  For commercial use or video distribution, please upgrade to a paid plan.", file=sys.stderr)
                    # Free tier can still generate sounds, so consider it valid
                    return True
            except:
                pass

        return response.status_code == 200
    except Exception as e:
        print(f"⚠️  Validation error: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    api_key = sys.argv[1] if len(sys.argv) > 1 else ""
    is_valid = validate_key(api_key)
    print("valid" if is_valid else "invalid")
    sys.exit(0 if is_valid else 1)
`

    const tempScriptPath = join(app.getPath('temp'), `elevenlabs_validate_${Date.now()}.py`)

    writeFile(tempScriptPath, pythonScript)
      .then(() => {
        const installDir = app.isPackaged
          ? join(process.resourcesPath, '..')
          : join(__dirname, '..')

        const pythonPath = process.platform === 'win32'
          ? join(installDir, 'venv', 'python.exe')
          : join(installDir, 'venv', 'bin', 'python')

        const python = spawn(pythonPath, [tempScriptPath, apiKey])

        let output = ''

        let stderrOutput = ''

        python.stdout.on('data', (data) => {
          output += data.toString()
        })

        python.stderr.on('data', (data) => {
          const message = data.toString()
          stderrOutput += message
          // Only log warnings, not raw API errors
          if (message.includes('⚠️')) {
            console.warn(message.trim())
          }
        })

        python.on('close', (code) => {
          const isValid = output.trim() === 'valid'
          if (isValid) {
            console.log('✓ ElevenLabs API key validated successfully')
          } else {
            console.warn('✗ ElevenLabs API key validation failed')
          }
          resolve(isValid)
        })

        python.on('error', (err) => {
          console.error('Python spawn error:', err)
          resolve(false)
        })
      })
      .catch(() => {
        resolve(false)
      })
  })
}

/**
 * Get user's remaining credits (requires API call)
 */
export async function getRemainingCredits(apiKey: string): Promise<number | null> {
  return new Promise((resolve) => {
    const pythonScript = `
import sys
import requests
import json

def get_credits(api_key):
    url = "https://api.elevenlabs.io/v1/user/subscription"
    headers = {"xi-api-key": api_key}

    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            # ElevenLabs returns character quota, we need credits
            # For sound effects, this might be in a different field
            print(json.dumps(data))
            return 0
        else:
            return 1
    except:
        return 1

if __name__ == "__main__":
    api_key = sys.argv[1] if len(sys.argv) > 1 else ""
    sys.exit(get_credits(api_key))
`

    const tempScriptPath = join(app.getPath('temp'), `elevenlabs_credits_${Date.now()}.py`)

    writeFile(tempScriptPath, pythonScript)
      .then(() => {
        const installDir = app.isPackaged
          ? join(process.resourcesPath, '..')
          : join(__dirname, '..')

        const pythonPath = process.platform === 'win32'
          ? join(installDir, 'venv', 'python.exe')
          : join(installDir, 'venv', 'bin', 'python')

        const python = spawn(pythonPath, [tempScriptPath, apiKey])

        let output = ''

        python.stdout.on('data', (data) => {
          output += data.toString()
        })

        python.on('close', (code) => {
          if (code === 0) {
            try {
              const data = JSON.parse(output)
              // Parse credits from response
              // This will need adjustment based on actual API response
              resolve(null) // Placeholder
            } catch {
              resolve(null)
            }
          } else {
            resolve(null)
          }
        })

        python.on('error', () => {
          resolve(null)
        })
      })
      .catch(() => {
        resolve(null)
      })
  })
}
