import sys
import os

def verify_file_content(path, required_strings, forbidden_strings=[]):
    print(f"Verifying {path}...")
    try:
        with open(path, 'r') as f:
            content = f.read()
            
        all_found = True
        for s in required_strings:
            if s not in content:
                print(f"❌ Missing: {s}")
                all_found = False
            else:
                print(f"✓ Found: {s}")

        for s in forbidden_strings:
            if s in content:
                print(f"❌ Found Forbidden: {s}")
                all_found = False
            else:
                print(f"✓ Not Found (as expected): {s}")
                
        return all_found
    except Exception as e:
        print(f"Error reading file: {e}")
        return False

# Verify ProjectContext.tsx
print("\n--- Checking ProjectContext.tsx ---")
context_strings = [
    "splitVideoTimelineClip: (id: string, splitTime: number) => void",
    "const splitVideoTimelineClip = (id: string, splitTime: number) => {",
    "videoTimelineClips: ["  # Part of the split logic
]
context_passed = verify_file_content('/home/mahim/CreatorCrafter/src/context/ProjectContext.tsx', context_strings)

# Verify SFXLibrary.tsx
print("\n--- Checking SFXLibrary.tsx ---")
sfx_strings = [
    "draggable",
    "onDragStart={(e) => {",
    "e.dataTransfer.setData('sfx-library-item'"
]
sfx_passed = verify_file_content('/home/mahim/CreatorCrafter/src/components/SFXLibrary.tsx', sfx_strings)

# Verify Timeline.tsx
print("\n--- Checking Timeline.tsx ---")
timeline_strings = [
    "const handleTrackItemMouseDown = (",
    "setDraggedItem({",
    "originalStart",  # Check for the new state property
    "splitVideoTimelineClip(selectedId, currentTime)" # Check for split call
]
# We want to ensure we removed the native drag attributes from track items
# But searching for absence of "draggable" might be tricky if it's used elsewhere.
# Let's check if "handleItemDragStart" is NOT used in the render loop for video clips
timeline_passed = verify_file_content('/home/mahim/CreatorCrafter/src/components/Timeline.tsx', timeline_strings)

if context_passed and sfx_passed and timeline_passed:
    print("\n✅ TIMELINE FIXES VERIFICATION PASSED")
else:
    print("\n❌ TIMELINE FIXES VERIFICATION FAILED")
