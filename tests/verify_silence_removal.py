import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def check_file_content(path, search_strings):
    try:
        with open(path, 'r') as f:
            content = f.read()
            
        missing = []
        for s in search_strings:
            if s not in content:
                missing.append(s)
                
        if missing:
            print(f"❌ {path} missing: {missing}")
            return False
        print(f"✓ {path} passed checks")
        return True
    except Exception as e:
        print(f"❌ Error reading {path}: {e}")
        return False

def main():
    print("🔍 Verifying Silence Removal Implementation...")
    
    # 1. Check unified_analyzer.py
    if not check_file_content('python/unified_analyzer.py', [
        'def detect_silence_gaps',
        "result['cut_suggestions'] =",
        "print_log(\"✂️  Detecting silence gaps for jump cuts...\")"
    ]):
        sys.exit(1)
        
    # 2. Check ProjectContext.tsx
    if not check_file_content('src/context/ProjectContext.tsx', [
        'export interface CutSuggestion',
        'cut_suggestions?: CutSuggestion[]',
        'applySilenceRemoval: () => void',
        'const applySilenceRemoval = () => {'
    ]):
        sys.exit(1)
        
    # 3. Check Timeline.tsx
    if not check_file_content('src/components/Timeline.tsx', [
        'applySilenceRemoval,',
        'unifiedAnalysis?.cut_suggestions',
        'Remove Silence',
        '<Scissors size={16} />'
    ]):
        sys.exit(1)
        
    print("\n✅ Silence Removal Feature Verified!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
