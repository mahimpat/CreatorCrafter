import sys
import os
from unittest.mock import MagicMock

# Mock dependencies BEFORE importing unified_analyzer
sys.modules['cv2'] = MagicMock()
sys.modules['numpy'] = MagicMock()
sys.modules['torch'] = MagicMock()
sys.modules['transformers'] = MagicMock()
sys.modules['whisper'] = MagicMock()
sys.modules['librosa'] = MagicMock()
sys.modules['soundfile'] = MagicMock()
sys.modules['PIL'] = MagicMock()
sys.modules['scenedetect'] = MagicMock()
sys.modules['scipy'] = MagicMock()
sys.modules['scipy.signal'] = MagicMock()

# Add python dir to path
sys.path.append(os.path.abspath('python'))

# Import unified_analyzer
import unified_analyzer

# Mock the imported functions in unified_analyzer
unified_analyzer.video_analyzer_transcribe = MagicMock(return_value=[{'text': 'subscribe', 'start': 1.0, 'end': 2.0}])
unified_analyzer.analyze_scenes = MagicMock(return_value=[{'timestamp': 1.0, 'description': 'test scene', 'type': 'scene'}])
unified_analyzer.suggest_sfx = MagicMock(return_value=[{'prompt': 'test sfx', 'type': 'primary'}])
unified_analyzer.suggest_music = MagicMock(return_value=[{'prompt': 'test music'}])

# Mock EventDetector
mock_detector = MagicMock()
mock_detector.detect_motion_peaks.return_value = []
mock_detector.detect_scene_transitions.return_value = []
unified_analyzer.EventDetector = MagicMock(return_value=mock_detector)

# Mock AnimationSuggester
mock_suggester = MagicMock()
mock_suggester.suggest_animations.return_value = [{'type': 'lottie', 'asset_id': 'test', 'timestamp': 1.0}]
unified_analyzer.AnimationSuggester = MagicMock(return_value=mock_suggester)

print("Running unified_analyze with mocks...")
try:
    result = unified_analyzer.unified_analyze('dummy.mp4')
    
    print(f"Success: {result['success']}")
    print(f"Transcription segments: {len(result['transcription'])}")
    print(f"Scenes: {len(result['visual_scenes'])}")
    print(f"SFX: {len(result['sfx_suggestions'])}")
    print(f"Music: {len(result['music_suggestions'])}")
    print(f"Animations: {len(result['animation_suggestions'])}")
    
    if result['success'] and len(result['animation_suggestions']) > 0:
        print("VERIFICATION PASSED")
    else:
        print("VERIFICATION FAILED")

except Exception as e:
    print(f"VERIFICATION ERROR: {e}")
    import traceback
    traceback.print_exc()
