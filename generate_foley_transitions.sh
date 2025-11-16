#!/bin/bash
# Generate Foley and Transition SFX Library
# This script generates the most important sound effect categories for video editing

set -e  # Exit on error

# Activate virtual environment
source venv/bin/activate

OUTPUT_DIR="./sfx_library"
PYTHON_SCRIPT="python/audiocraft_generator.py"

echo "Starting Foley and Transition SFX generation..."
echo "Total: 27 sounds (13 transitions + 14 foley)"
echo "Estimated time: 54-108 minutes"
echo ""

# Create category directories
mkdir -p "$OUTPUT_DIR/transitions"
mkdir -p "$OUTPUT_DIR/foley"

# Generate TRANSITIONS (13 sounds)
echo "===== GENERATING TRANSITIONS (13 sounds) ====="

echo "[1/27] whoosh-fast"
python "$PYTHON_SCRIPT" --prompt "fast whoosh sound effect, swift air movement" --duration 3.0 --output "$OUTPUT_DIR/transitions/whoosh-fast.wav" --model audiogen || echo "Failed: whoosh-fast"

echo "[2/27] whoosh-slow"
python "$PYTHON_SCRIPT" --prompt "slow whoosh sound effect, gentle air sweep" --duration 3.0 --output "$OUTPUT_DIR/transitions/whoosh-slow.wav" --model audiogen || echo "Failed: whoosh-slow"

echo "[3/27] whoosh-deep"
python "$PYTHON_SCRIPT" --prompt "deep bass whoosh, low frequency air movement" --duration 3.0 --output "$OUTPUT_DIR/transitions/whoosh-deep.wav" --model audiogen || echo "Failed: whoosh-deep"

echo "[4/27] whoosh-rise"
python "$PYTHON_SCRIPT" --prompt "rising whoosh sound effect, ascending pitch" --duration 3.0 --output "$OUTPUT_DIR/transitions/whoosh-rise.wav" --model audiogen || echo "Failed: whoosh-rise"

echo "[5/27] whoosh-fall"
python "$PYTHON_SCRIPT" --prompt "falling whoosh sound effect, descending pitch" --duration 3.0 --output "$OUTPUT_DIR/transitions/whoosh-fall.wav" --model audiogen || echo "Failed: whoosh-fall"

echo "[6/27] swoosh-left"
python "$PYTHON_SCRIPT" --prompt "swoosh sound panning left to right" --duration 3.0 --output "$OUTPUT_DIR/transitions/swoosh-left.wav" --model audiogen || echo "Failed: swoosh-left"

echo "[7/27] swoosh-right"
python "$PYTHON_SCRIPT" --prompt "swoosh sound panning right to left" --duration 3.0 --output "$OUTPUT_DIR/transitions/swoosh-right.wav" --model audiogen || echo "Failed: swoosh-right"

echo "[8/27] swoosh-quick"
python "$PYTHON_SCRIPT" --prompt "quick swoosh sound effect, rapid movement" --duration 3.0 --output "$OUTPUT_DIR/transitions/swoosh-quick.wav" --model audiogen || echo "Failed: swoosh-quick"

echo "[9/27] riser-tension"
python "$PYTHON_SCRIPT" --prompt "tension building riser sound effect" --duration 3.0 --output "$OUTPUT_DIR/transitions/riser-tension.wav" --model audiogen || echo "Failed: riser-tension"

echo "[10/27] riser-dramatic"
python "$PYTHON_SCRIPT" --prompt "dramatic riser sound effect, epic buildup" --duration 3.0 --output "$OUTPUT_DIR/transitions/riser-dramatic.wav" --model audiogen || echo "Failed: riser-dramatic"

echo "[11/27] riser-subtle"
python "$PYTHON_SCRIPT" --prompt "subtle ambient riser, gentle buildup" --duration 3.0 --output "$OUTPUT_DIR/transitions/riser-subtle.wav" --model audiogen || echo "Failed: riser-subtle"

echo "[12/27] transition-hit"
python "$PYTHON_SCRIPT" --prompt "transition hit sound effect, punchy impact" --duration 3.0 --output "$OUTPUT_DIR/transitions/transition-hit.wav" --model audiogen || echo "Failed: transition-hit"

echo "[13/27] transition-boom"
python "$PYTHON_SCRIPT" --prompt "boom transition sound effect, deep impact" --duration 3.0 --output "$OUTPUT_DIR/transitions/transition-boom.wav" --model audiogen || echo "Failed: transition-boom"

echo ""
echo "===== GENERATING FOLEY (14 sounds) ====="

echo "[14/27] footstep-concrete"
python "$PYTHON_SCRIPT" --prompt "single footstep on concrete floor" --duration 3.0 --output "$OUTPUT_DIR/foley/footstep-concrete.wav" --model audiogen || echo "Failed: footstep-concrete"

echo "[15/27] footstep-wood"
python "$PYTHON_SCRIPT" --prompt "single footstep on wooden floor, creaky" --duration 3.0 --output "$OUTPUT_DIR/foley/footstep-wood.wav" --model audiogen || echo "Failed: footstep-wood"

echo "[16/27] footstep-gravel"
python "$PYTHON_SCRIPT" --prompt "footstep on gravel, crunchy texture" --duration 3.0 --output "$OUTPUT_DIR/foley/footstep-gravel.wav" --model audiogen || echo "Failed: footstep-gravel"

echo "[17/27] door-open"
python "$PYTHON_SCRIPT" --prompt "door opening sound effect, wooden door creaking" --duration 3.0 --output "$OUTPUT_DIR/foley/door-open.wav" --model audiogen || echo "Failed: door-open"

echo "[18/27] door-close"
python "$PYTHON_SCRIPT" --prompt "door closing sound effect, solid close" --duration 3.0 --output "$OUTPUT_DIR/foley/door-close.wav" --model audiogen || echo "Failed: door-close"

echo "[19/27] door-knock"
python "$PYTHON_SCRIPT" --prompt "knocking on wooden door, three knocks" --duration 3.0 --output "$OUTPUT_DIR/foley/door-knock.wav" --model audiogen || echo "Failed: door-knock"

echo "[20/27] paper-rustle"
python "$PYTHON_SCRIPT" --prompt "paper rustling sound effect, pages turning" --duration 3.0 --output "$OUTPUT_DIR/foley/paper-rustle.wav" --model audiogen || echo "Failed: paper-rustle"

echo "[21/27] cloth-movement"
python "$PYTHON_SCRIPT" --prompt "clothing fabric movement, cloth rustle" --duration 3.0 --output "$OUTPUT_DIR/foley/cloth-movement.wav" --model audiogen || echo "Failed: cloth-movement"

echo "[22/27] keyboard-typing"
python "$PYTHON_SCRIPT" --prompt "keyboard typing sound, mechanical keys" --duration 3.0 --output "$OUTPUT_DIR/foley/keyboard-typing.wav" --model audiogen || echo "Failed: keyboard-typing"

echo "[23/27] pen-writing"
python "$PYTHON_SCRIPT" --prompt "pen writing on paper sound" --duration 3.0 --output "$OUTPUT_DIR/foley/pen-writing.wav" --model audiogen || echo "Failed: pen-writing"

echo "[24/27] glass-clink"
python "$PYTHON_SCRIPT" --prompt "wine glasses clinking together" --duration 3.0 --output "$OUTPUT_DIR/foley/glass-clink.wav" --model audiogen || echo "Failed: glass-clink"

echo "[25/27] cup-place"
python "$PYTHON_SCRIPT" --prompt "coffee cup placed on table" --duration 3.0 --output "$OUTPUT_DIR/foley/cup-place.wav" --model audiogen || echo "Failed: cup-place"

echo "[26/27] keys-jingle"
python "$PYTHON_SCRIPT" --prompt "keys jingling sound effect, metal clanking" --duration 3.0 --output "$OUTPUT_DIR/foley/keys-jingle.wav" --model audiogen || echo "Failed: keys-jingle"

echo "[27/27] coins-drop"
python "$PYTHON_SCRIPT" --prompt "coins dropping on hard surface" --duration 3.0 --output "$OUTPUT_DIR/foley/coins-drop.wav" --model audiogen || echo "Failed: coins-drop"

echo ""
echo "===== GENERATION COMPLETE ====="
echo "Generated 27 sound effects (13 transitions + 14 foley)"
echo "Files saved to: $OUTPUT_DIR"
echo ""
echo "Next steps:"
echo "1. Review the generated sounds"
echo "2. Generate remaining categories (impacts, UI, ambient, movement)"
echo "3. Integrate library browser into UI"
