#!/usr/bin/env python3
"""
ElevenLabs SFX Generator
Generate sound effects using ElevenLabs Sound Effects API
"""

import sys
import json
import argparse
import requests


def generate_sound_effect(api_key: str, prompt: str, duration: float, output_path: str) -> dict:
    """Generate sound effect using ElevenLabs API"""

    url = "https://api.elevenlabs.io/v1/sound-generation"

    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json"
    }

    data = {
        "text": prompt,
        "model_id": "eleven_text_to_sound_v2"  # Sound effects model
    }

    # Add duration if specified (saves credits)
    if duration is not None:
        data["duration_seconds"] = min(duration, 30)  # Max 30 seconds

    print(f"Generating: {prompt} ({duration}s)", file=sys.stderr)

    try:
        response = requests.post(url, headers=headers, json=data, timeout=120)

        if response.status_code == 200:
            # Save audio file
            with open(output_path, 'wb') as f:
                f.write(response.content)

            # Calculate credits used
            credits_used = int(duration * 40) if duration else 200

            result = {
                "success": True,
                "file_path": output_path,
                "duration": duration,
                "credits_used": credits_used
            }

            print(f"✓ Success: {output_path} ({credits_used} credits)", file=sys.stderr)
            print(json.dumps(result))
            return 0

        elif response.status_code == 401:
            print("Error: Invalid API key", file=sys.stderr)
            print(json.dumps({"success": False, "error": "Invalid API key"}))
            return 1

        elif response.status_code == 402:
            print("Error: Insufficient credits", file=sys.stderr)
            print(json.dumps({"success": False, "error": "Insufficient credits. Please add credits to your ElevenLabs account."}))
            return 1

        elif response.status_code == 429:
            print("Error: Rate limit exceeded", file=sys.stderr)
            print(json.dumps({"success": False, "error": "Rate limit exceeded. Please try again later."}))
            return 1

        else:
            error_msg = f"API request failed with status {response.status_code}"
            try:
                error_data = response.json()
                if 'detail' in error_data:
                    error_msg = f"{error_msg}: {error_data['detail']}"
            except:
                pass

            print(f"Error: {error_msg}", file=sys.stderr)
            print(json.dumps({"success": False, "error": error_msg}))
            return 1

    except requests.exceptions.Timeout:
        print("Error: Request timed out", file=sys.stderr)
        print(json.dumps({"success": False, "error": "Request timed out after 120 seconds"}))
        return 1

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        print(json.dumps({"success": False, "error": str(e)}))
        return 1


def main():
    parser = argparse.ArgumentParser(description='Generate sound effects using ElevenLabs API')
    parser.add_argument('--api-key', required=True, help='ElevenLabs API key')
    parser.add_argument('--prompt', required=True, help='Text description of the sound effect')
    parser.add_argument('--duration', type=float, required=True, help='Duration in seconds (max 30)')
    parser.add_argument('--output', required=True, help='Output file path')

    args = parser.parse_args()

    # Validate duration
    if args.duration <= 0 or args.duration > 30:
        print("Error: Duration must be between 0 and 30 seconds", file=sys.stderr)
        sys.exit(1)

    exit_code = generate_sound_effect(args.api_key, args.prompt, args.duration, args.output)
    sys.exit(exit_code)


if __name__ == '__main__':
    main()
