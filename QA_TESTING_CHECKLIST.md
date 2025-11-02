# CreatorCrafter - QA Testing Checklist

**Testing Date:** November 2, 2025
**Version:** MVP v1.0
**Tester:** QA Team
**Platform:** Linux (Development), Windows (Target)

---

## 🎯 Testing Objectives

1. Verify all MVP features work end-to-end
2. Identify critical bugs before release
3. Test error handling and edge cases
4. Validate user experience and workflows
5. Ensure Windows installation works correctly

---

## ✅ Test Results Legend

- ✅ PASS - Feature works as expected
- ⚠️ PARTIAL - Works but has minor issues
- ❌ FAIL - Critical bug, blocks release
- ⏭️ SKIP - Not applicable for this test run
- 🔄 RETEST - Needs retesting after fix

---

## 1. Installation & Setup Tests

### 1.1 Development Setup (Linux/Mac)
- [ ] Clone repository
- [ ] `npm install` completes successfully
- [ ] `npm run setup` creates Python venv
- [ ] Python dependencies install correctly
- [ ] AI models download successfully
- [ ] `npm run electron:dev` starts app
- [ ] No console errors on startup

**Platform Tested:** _____________
**Result:** _____________
**Notes:** _____________

---

### 1.2 Windows Installation
- [ ] Run `windows-hotfix-v3.bat`
- [ ] PyTorch installs correctly
- [ ] Other dependencies install
- [ ] AudioCraft installs (with or without xformers)
- [ ] Verification test passes: `python -c "from audiocraft.models import MusicGen; print('Works!')"`
- [ ] AI models download successfully
- [ ] App starts with `npm run electron:dev`

**Platform Tested:** _____________
**Result:** _____________
**xformers Status:** _____________
**Notes:** _____________

---

## 2. Core Functionality Tests

### 2.1 App Startup & Welcome Screen
- [ ] App window opens
- [ ] Welcome screen displays correctly
- [ ] "Create New Project" button works
- [ ] "Open Existing Project" button works
- [ ] No JavaScript errors in console
- [ ] Window is responsive and resizable

**Result:** _____________
**Notes:** _____________

---

### 2.2 Project Creation & Management
- [ ] Create new project dialog appears
- [ ] Can specify project name
- [ ] Can choose project location
- [ ] Project folder is created correctly
- [ ] `project.json` file is created
- [ ] Project loads in editor
- [ ] Can save project (Ctrl+S)
- [ ] Can close and reopen project
- [ ] Project data persists correctly

**Result:** _____________
**Notes:** _____________

---

### 2.3 Video Import & Playback
- [ ] "Import Video" button works
- [ ] File dialog opens
- [ ] Can select video file (MP4, MOV, AVI)
- [ ] Video loads and displays
- [ ] Play/pause button works
- [ ] Timeline scrubbing works
- [ ] Volume control works
- [ ] Mute button works
- [ ] Video time display is accurate
- [ ] Can handle different video formats
- [ ] Can handle different resolutions (720p, 1080p, 4K)
- [ ] Can handle different aspect ratios (16:9, 9:16, 4:3)

**Video Formats Tested:**
- [ ] MP4
- [ ] MOV
- [ ] AVI
- [ ] WebM

**Result:** _____________
**Notes:** _____________

---

## 3. AI Features Tests

### 3.1 Video Analysis (Whisper + BLIP)
- [ ] "Analyze Video" button appears
- [ ] Click starts analysis
- [ ] Loading toast appears
- [ ] Progress indication works
- [ ] Analysis completes (may take 2-5 minutes)
- [ ] Success toast appears
- [ ] Transcript generated correctly
- [ ] Scene descriptions appear
- [ ] Suggestions for SFX generated
- [ ] Can view analysis results
- [ ] Error handling if Python fails
- [ ] Error handling if models not downloaded

**Test Videos:**
- [ ] Short video (<1 minute)
- [ ] Medium video (1-5 minutes)
- [ ] Long video (>5 minutes)
- [ ] Video with speech
- [ ] Video without speech
- [ ] Video with multiple scenes

**Result:** _____________
**Whisper Model Used:** _____________
**Analysis Time:** _____________
**Notes:** _____________

---

### 3.2 Sound Effects Generation (AudioCraft)
- [ ] Can click "Generate SFX" for a suggestion
- [ ] SFX generation dialog appears
- [ ] Can edit prompt text
- [ ] Can adjust duration (3-10 seconds)
- [ ] "Generate" button starts generation
- [ ] Loading toast appears
- [ ] Generation completes (30-90 seconds)
- [ ] Audio file is created
- [ ] SFX appears on timeline
- [ ] Can play generated SFX
- [ ] Can adjust SFX volume
- [ ] Can move SFX on timeline
- [ ] Can delete SFX
- [ ] Error handling if AudioCraft fails

**Test Prompts:**
- [ ] Simple: "footsteps"
- [ ] Complex: "car engine starting, rumbling"
- [ ] Ambient: "busy coffee shop atmosphere"
- [ ] Action: "door slamming shut"

**Result:** _____________
**AudioCraft Model Used:** _____________
**Generation Time:** _____________
**Quality Assessment:** _____________
**Notes:** _____________

---

## 4. Editing Features Tests

### 4.1 Subtitle Creation & Editing
- [ ] Can add manual subtitle
- [ ] Subtitle appears on timeline
- [ ] Subtitle appears in video preview
- [ ] Can edit subtitle text
- [ ] Can adjust subtitle timing (start/end)
- [ ] Can adjust subtitle position
- [ ] Can change subtitle styling (font, size, color)
- [ ] Can delete subtitle
- [ ] Can import subtitles from analysis
- [ ] Multiple subtitles don't overlap incorrectly
- [ ] Subtitle export works (SRT format)

**Result:** _____________
**Notes:** _____________

---

### 4.2 Timeline Editing
- [ ] Can add clips to timeline
- [ ] Can drag clips to reposition
- [ ] Can trim clip start/end
- [ ] Can resize clip duration
- [ ] Magnetic snapping works
- [ ] Visual snap guides appear
- [ ] Can delete clips
- [ ] Can select multiple clips
- [ ] Can copy/paste clips
- [ ] Timeline zoom works (Ctrl +/-)
- [ ] Timeline scroll works

**Result:** _____________
**Notes:** _____________

---

### 4.3 Media Overlays
- [ ] Can add image overlay
- [ ] Can add video overlay
- [ ] Overlay appears on canvas
- [ ] Can resize overlay
- [ ] Can move overlay
- [ ] Can rotate overlay
- [ ] Can adjust overlay opacity
- [ ] Can set overlay duration
- [ ] Can set overlay start time
- [ ] Can delete overlay
- [ ] Z-index ordering works
- [ ] Multiple overlays render correctly

**Test Media:**
- [ ] PNG image with transparency
- [ ] JPG image
- [ ] GIF animation
- [ ] Video overlay

**Result:** _____________
**Notes:** _____________

---

### 4.4 Undo/Redo System
- [ ] Undo (Ctrl+Z) works
- [ ] Redo (Ctrl+Y) works
- [ ] Undo/redo for subtitle edits
- [ ] Undo/redo for clip moves
- [ ] Undo/redo for overlay changes
- [ ] Undo/redo for deletions
- [ ] History limit works (50 actions)
- [ ] No memory leaks with repeated undo/redo

**Result:** _____________
**Notes:** _____________

---

## 5. Video Export Tests

### 5.1 Basic Export
- [ ] "Export Video" button appears
- [ ] Export dialog opens
- [ ] Can choose output format (MP4, MOV, WebM)
- [ ] Can choose quality preset (720p, 1080p, 4K)
- [ ] Can choose output location
- [ ] Export starts successfully
- [ ] Progress bar appears
- [ ] Progress updates in real-time
- [ ] Can see estimated time remaining
- [ ] Export completes successfully
- [ ] Output file is created
- [ ] Output file is playable

**Result:** _____________
**Export Time:** _____________
**File Size:** _____________
**Notes:** _____________

---

### 5.2 Export with All Features
- [ ] Export with subtitles burned in
- [ ] Export with SFX mixed in
- [ ] Export with media overlays composited
- [ ] All features appear in final video
- [ ] Audio sync is correct
- [ ] Subtitle timing is correct
- [ ] Overlay positioning is correct
- [ ] Video quality is acceptable

**Result:** _____________
**Notes:** _____________

---

### 5.3 Export Edge Cases
- [ ] Export very short video (<10 seconds)
- [ ] Export long video (>10 minutes)
- [ ] Export with many overlays (>10)
- [ ] Export with many subtitles (>50)
- [ ] Export with multiple SFX tracks
- [ ] Cancel export mid-way
- [ ] Export with no subtitles/SFX/overlays
- [ ] Export different aspect ratios

**Result:** _____________
**Notes:** _____________

---

## 6. Error Handling Tests

### 6.1 Toast Notifications
- [ ] Success toasts appear (green)
- [ ] Error toasts appear (red)
- [ ] Loading toasts appear
- [ ] Toasts auto-dismiss
- [ ] Multiple toasts stack correctly
- [ ] Toasts are non-blocking
- [ ] Toast position is correct (top-right)

**Result:** _____________
**Notes:** _____________

---

### 6.2 Error Boundary
- [ ] Error boundary catches React errors
- [ ] Error screen displays
- [ ] "Reload" button works
- [ ] "Try Again" button works
- [ ] Error details are shown
- [ ] No white screen of death

**Test Method:** Trigger deliberate error
**Result:** _____________
**Notes:** _____________

---

### 6.3 Error Scenarios
- [ ] Import non-video file → Shows error toast
- [ ] Open corrupted project file → Shows error
- [ ] Video file missing → Shows helpful error
- [ ] Python not available → Shows installation help
- [ ] FFmpeg not found → Shows installation help
- [ ] Disk full during export → Shows error
- [ ] Network error (if applicable) → Shows error
- [ ] AI model not downloaded → Shows download prompt

**Result:** _____________
**Notes:** _____________

---

## 7. Auto-Save & Data Safety Tests

### 7.1 Auto-Save
- [ ] Auto-save triggers after 30 seconds of changes
- [ ] Auto-save toast appears
- [ ] Project file is updated
- [ ] Periodic backup works (every 2 minutes)
- [ ] No performance impact during auto-save

**Result:** _____________
**Notes:** _____________

---

### 7.2 Unsaved Changes Warning
- [ ] Warning appears when closing with unsaved changes
- [ ] "Save and Close" button works
- [ ] "Discard Changes" button works
- [ ] "Cancel" button works
- [ ] Ctrl+S manual save works
- [ ] Save state indicator updates

**Result:** _____________
**Notes:** _____________

---

## 8. Performance Tests

### 8.1 Timeline Performance
- [ ] Timeline responsive with 10 clips
- [ ] Timeline responsive with 50 clips
- [ ] Timeline responsive with 100+ clips
- [ ] No lag when scrubbing
- [ ] No lag when adding clips
- [ ] No lag when moving clips

**Result:** _____________
**Notes:** _____________

---

### 8.2 Canvas Performance
- [ ] Canvas renders smoothly (60fps)
- [ ] No lag with 5 overlays
- [ ] No lag with 10 overlays
- [ ] No lag with 20+ overlays
- [ ] requestAnimationFrame optimization works
- [ ] Memory usage is reasonable

**Result:** _____________
**Memory Usage:** _____________
**Notes:** _____________

---

### 8.3 Long Session Stability
- [ ] App stable after 30 minutes
- [ ] App stable after 1 hour
- [ ] No memory leaks detected
- [ ] No performance degradation
- [ ] Undo/redo history bounded correctly

**Result:** _____________
**Notes:** _____________

---

## 9. Cross-Platform Tests

### 9.1 Windows
- [ ] Installation works
- [ ] App starts
- [ ] All features work
- [ ] File paths work correctly
- [ ] Python integration works
- [ ] FFmpeg works
- [ ] Export works

**Windows Version:** _____________
**Result:** _____________
**Notes:** _____________

---

### 9.2 macOS
- [ ] Installation works
- [ ] App starts
- [ ] All features work
- [ ] File paths work correctly
- [ ] Python integration works
- [ ] FFmpeg works
- [ ] Export works

**macOS Version:** _____________
**Result:** _____________
**Notes:** _____________

---

### 9.3 Linux
- [ ] Installation works
- [ ] App starts
- [ ] All features work
- [ ] File paths work correctly
- [ ] Python integration works
- [ ] FFmpeg works
- [ ] Export works

**Linux Distro:** _____________
**Result:** _____________
**Notes:** _____________

---

## 10. User Experience Tests

### 10.1 First-Time User Flow
- [ ] Welcome screen is clear
- [ ] Project creation is intuitive
- [ ] Video import is obvious
- [ ] AI features are discoverable
- [ ] Timeline editing is intuitive
- [ ] Export process is clear

**Result:** _____________
**UX Issues:** _____________
**Notes:** _____________

---

### 10.2 Keyboard Shortcuts
- [ ] Ctrl+S saves project
- [ ] Ctrl+Z undoes action
- [ ] Ctrl+Y redoes action
- [ ] Ctrl+O opens project
- [ ] Space toggles play/pause
- [ ] Delete removes selected items
- [ ] Ctrl+C copies
- [ ] Ctrl+V pastes
- [ ] Ctrl +/- zooms timeline

**Result:** _____________
**Notes:** _____________

---

## 11. Build & Packaging Tests

### 11.1 Development Build
- [ ] `npm run electron:dev` works
- [ ] Hot reload works
- [ ] DevTools accessible
- [ ] Build time is acceptable (<5 seconds)

**Result:** _____________
**Build Time:** _____________
**Notes:** _____________

---

### 11.2 Production Build
- [ ] `npm run build` succeeds
- [ ] `npm run electron:build` creates installer
- [ ] Windows installer works (.exe)
- [ ] macOS installer works (.dmg)
- [ ] Linux installer works (.AppImage)
- [ ] Bundle size is reasonable (<500MB)
- [ ] No console errors in production

**Result:** _____________
**Bundle Size:** _____________
**Notes:** _____________

---

## 12. Critical Bugs Found

| Bug ID | Severity | Description | Steps to Reproduce | Status |
|--------|----------|-------------|-------------------|--------|
| BUG-001 | | | | |
| BUG-002 | | | | |
| BUG-003 | | | | |

**Severity Levels:**
- **CRITICAL** - Blocks release, must fix
- **HIGH** - Major issue, should fix before release
- **MEDIUM** - Minor issue, can fix post-release
- **LOW** - Cosmetic issue, nice to fix

---

## 13. Test Summary

### Overall Results

**Total Tests:** _____
**Passed:** _____
**Failed:** _____
**Skipped:** _____

**Pass Rate:** _____%

### Release Recommendation

- [ ] ✅ **APPROVED FOR RELEASE** - All critical tests passed
- [ ] ⚠️ **APPROVED WITH NOTES** - Minor issues, acceptable for v1.0
- [ ] ❌ **NOT APPROVED** - Critical bugs must be fixed first

### Critical Issues Blocking Release

1. _________________________________
2. _________________________________
3. _________________________________

### Known Issues (Non-Blocking)

1. _________________________________
2. _________________________________
3. _________________________________

### Next Steps

1. _________________________________
2. _________________________________
3. _________________________________

---

## 14. Tester Sign-Off

**Tester Name:** _____________
**Date:** _____________
**Signature:** _____________

**Additional Comments:**
_______________________________________________
_______________________________________________
_______________________________________________

---

**End of QA Testing Checklist**
