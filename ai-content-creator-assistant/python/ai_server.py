#!/usr/bin/env python3
"""
AI Server for Content Creator Assistant

This Python server handles AI/ML operations:
- AudioCraft for sound effect generation
- Whisper for speech-to-text transcription
- Video analysis for scene detection and key moments

Communication Protocol:
- Input: JSON lines via stdin
- Output: JSON lines via stdout
- Format: {"id": "request-id", "service": "service-name", "method": "method-name", "params": {...}}
"""

import sys
import json
import logging
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler('ai_server.log'), logging.StreamHandler(sys.stderr)]
)

logger = logging.getLogger(__name__)


class AIServer:
    def __init__(self):
        self.running = True
        logger.info("AI Server starting...")

    def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming request and route to appropriate service"""
        request_id = request.get('id')
        service = request.get('service')
        method = request.get('method')
        params = request.get('params', {})

        try:
            if service == 'system':
                result = self.handle_system(method, params)
            elif service == 'audiocraft':
                result = self.handle_audiocraft(method, params)
            elif service == 'whisper':
                result = self.handle_whisper(method, params)
            elif service == 'video_analysis':
                result = self.handle_video_analysis(method, params)
            else:
                raise ValueError(f"Unknown service: {service}")

            return {
                'id': request_id,
                'success': True,
                'data': result
            }

        except Exception as e:
            logger.error(f"Error handling request: {e}", exc_info=True)
            return {
                'id': request_id,
                'success': False,
                'error': str(e)
            }

    def handle_system(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle system commands"""
        if method == 'ping':
            return {'status': 'ok'}
        elif method == 'shutdown':
            logger.info("Shutdown requested")
            self.running = False
            return {'status': 'shutting down'}
        else:
            raise ValueError(f"Unknown system method: {method}")

    def handle_audiocraft(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle AudioCraft sound generation"""
        if method == 'generate':
            prompt = params.get('prompt')
            duration = params.get('duration', 5)

            logger.info(f"Generating audio: {prompt} ({duration}s)")

            # Stub: In production, use AudioCraft model
            # from audiocraft.models import MusicGen
            # model = MusicGen.get_pretrained('musicgen-small')
            # wav = model.generate([prompt], duration=duration)
            # Save wav to file

            audio_path = f"/tmp/generated_sfx_{prompt[:20]}.wav"
            return {'audioPath': audio_path}
        else:
            raise ValueError(f"Unknown audiocraft method: {method}")

    def handle_whisper(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Whisper speech-to-text"""
        if method == 'transcribe':
            audio_path = params.get('audioPath')
            language = params.get('language', 'en')

            logger.info(f"Transcribing audio: {audio_path}")

            # Stub: In production, use Whisper model
            # import whisper
            # model = whisper.load_model("base")
            # result = model.transcribe(audio_path, language=language)

            # Return mock transcription
            return {
                'segments': [
                    {
                        'id': '1',
                        'startTime': 0.0,
                        'endTime': 2.5,
                        'text': 'Sample transcription segment',
                        'confidence': 0.95
                    }
                ],
                'language': language,
                'confidence': 0.95
            }
        else:
            raise ValueError(f"Unknown whisper method: {method}")

    def handle_video_analysis(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle video analysis tasks"""
        video_path = params.get('videoPath')

        if method == 'analyze':
            logger.info(f"Analyzing video: {video_path}")

            # Stub: In production, use CV models for scene detection
            return {
                'sceneChanges': [
                    {'timestamp': 5.0, 'confidence': 0.9},
                    {'timestamp': 15.2, 'confidence': 0.85}
                ],
                'keyMoments': [
                    {'timestamp': 3.0, 'type': 'action', 'description': 'Fast movement', 'confidence': 0.8}
                ],
                'suggestedSFX': [
                    {'timestamp': 5.0, 'prompt': 'transition whoosh', 'category': 'transition', 'confidence': 0.7}
                ],
                'emotionalBeats': []
            }

        elif method == 'detect_scenes':
            logger.info(f"Detecting scenes: {video_path}")
            return {
                'scenes': [
                    {'timestamp': 0.0, 'confidence': 1.0},
                    {'timestamp': 10.5, 'confidence': 0.92}
                ]
            }

        elif method == 'suggest_sfx':
            logger.info(f"Suggesting SFX: {video_path}")
            return {
                'suggestions': [
                    {'timestamp': 2.0, 'prompt': 'door slam', 'category': 'foley'}
                ]
            }
        else:
            raise ValueError(f"Unknown video_analysis method: {method}")

    def run(self):
        """Main server loop - read from stdin, write to stdout"""
        logger.info("AI Server ready. Waiting for requests...")

        # Send ready signal
        sys.stdout.write(json.dumps({'status': 'ready'}) + '\n')
        sys.stdout.flush()

        while self.running:
            try:
                line = sys.stdin.readline()
                if not line:
                    break

                line = line.strip()
                if not line:
                    continue

                request = json.loads(line)
                response = self.handle_request(request)

                # Send response
                sys.stdout.write(json.dumps(response) + '\n')
                sys.stdout.flush()

            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON: {e}")
            except Exception as e:
                logger.error(f"Error in main loop: {e}", exc_info=True)

        logger.info("AI Server shutdown complete")


if __name__ == '__main__':
    server = AIServer()
    server.run()
