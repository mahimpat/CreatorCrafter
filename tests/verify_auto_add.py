import sys

# Mock verification for ProjectContext auto-add logic
# We can't run the React context directly, but we can verify the code structure

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
                print(f"❌ Found forbidden: {s}")
                all_found = False
            else:
                print(f"✓ Not found (good): {s}")
                
        return all_found
    except Exception as e:
        print(f"Error reading file: {e}")
        return False

# Verify ProjectContext.tsx
context_strings = [
    "// Auto-add animation suggestions to the timeline",
    "if (analysis && analysis.animation_suggestions && analysis.animation_suggestions.length > 0)",
    "const newTracks: AnimationTrack[] =",
    "newState.animationTracks = [...prev.animationTracks, ...newTracks]"
]
context_passed = verify_file_content('/home/mahim/CreatorCrafter/src/context/ProjectContext.tsx', context_strings)

# Verify Timeline.tsx
# Should NOT have the manual suggestion rendering anymore
timeline_forbidden = [
    "{/* AI Animation Suggestions */}",
    "className=\"animation-suggestion\""
]
timeline_passed = verify_file_content('/home/mahim/CreatorCrafter/src/components/Timeline.tsx', [], timeline_forbidden)

if context_passed and timeline_passed:
    print("\n✅ AUTO-ADD VERIFICATION PASSED")
else:
    print("\n❌ AUTO-ADD VERIFICATION FAILED")
