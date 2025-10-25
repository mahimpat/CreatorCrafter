# File Management System - Test Plan

## Pre-Test Setup

1. Make sure you have a test video file ready (MP4, MOV, AVI, MKV, or WebM)
2. Create a test directory where you'll save projects (e.g., `~/TestProjects`)

## Test Scenarios

### ✅ Test 1: Create New Project

**Steps:**
1. Run `npm run electron:dev`
2. You should see the WelcomeScreen with three action cards
3. Click "New Project"
4. Enter project name: "Test Project 1"
5. Click "Continue"
6. Select a test video file when prompted
7. Select a location to save the project

**Expected Results:**
- ✅ Project folder created at `[location]/Test Project 1/`
- ✅ Video copied to `[location]/Test Project 1/assets/source/[video-name]`
- ✅ `project.json` file created
- ✅ App transitions to video editor view
- ✅ TopBar shows "Test Project 1" as project name
- ✅ Save status shows "Saved just now"

**Verify Folder Structure:**
```
Test Project 1/
├── project.json
└── assets/
    ├── source/
    │   └── [your-video].mp4
    ├── sfx/
    └── exports/
```

---

### ✅ Test 2: Save Project (Ctrl+S)

**Steps:**
1. With "Test Project 1" open, make some changes:
   - Click "🔍 Analyze Video" (wait for analysis)
   - Add a subtitle or SFX effect
2. Notice "Unsaved changes" appears in TopBar
3. Press `Ctrl+S` (or Cmd+S on Mac)

**Expected Results:**
- ✅ Save status changes to "Saving..."
- ✅ Then changes to "Saved just now"
- ✅ "Unsaved changes" disappears
- ✅ `project.json` updated with timestamp

---

### ✅ Test 3: Close and Reopen Project

**Steps:**
1. Click "File" menu in TopBar
2. Click "Close Project"
3. Confirm if prompted about unsaved changes
4. You should return to WelcomeScreen
5. Check "Recent Projects" section
6. Click on "Test Project 1" in recent projects

**Expected Results:**
- ✅ "Test Project 1" appears in recent projects list
- ✅ Shows "Just now" or recent timestamp
- ✅ Clicking it reopens the project
- ✅ All subtitles, SFX, and overlays restored
- ✅ Video plays correctly

---

### ✅ Test 4: Open Project via File Menu

**Steps:**
1. From WelcomeScreen, click "Open Project"
2. Navigate to `[location]/Test Project 1/`
3. Select `project.json` file
4. Click "Open"

**Expected Results:**
- ✅ Project loads successfully
- ✅ All data restored (video, subtitles, SFX, analysis)
- ✅ TopBar shows project name
- ✅ Save status shows last saved time

---

### ✅ Test 5: Save As (Create Copy)

**Steps:**
1. With project open, click "File" → "Save As..."
2. Enter new name: "Test Project 2"
3. Select a location
4. Click "Continue"

**Expected Results:**
- ✅ New project folder created
- ✅ Video copied to new location
- ✅ All SFX files copied
- ✅ TopBar now shows "Test Project 2"
- ✅ Original "Test Project 1" unchanged

---

### ✅ Test 6: Recent Projects Management

**Steps:**
1. Create multiple projects (3-4 different ones)
2. Return to WelcomeScreen
3. Check "Recent Projects" section
4. Hover over a recent project
5. Click the "×" button on one

**Expected Results:**
- ✅ All projects appear in recent list
- ✅ Sorted by "last opened" date
- ✅ Clicking "×" removes from recent
- ✅ Removed project can still be opened via "Open Project"

---

### ✅ Test 7: Import Video (Quick Start)

**Steps:**
1. From WelcomeScreen, click "Import Video"
2. Select a video file
3. Choose save location

**Expected Results:**
- ✅ Project created with video filename as name
- ✅ Opens immediately to editor
- ✅ Same folder structure created

---

### ✅ Test 8: Keyboard Shortcuts

**Steps:**
1. Open a project
2. Make a change (add subtitle)
3. Test `Ctrl+S` - Should save
4. Test `Ctrl+Shift+S` - Should open Save As dialog

**Expected Results:**
- ✅ Ctrl+S saves immediately
- ✅ Ctrl+Shift+S prompts for new location
- ✅ No page refresh or navigation

---

### ✅ Test 9: Unsaved Changes Warning

**Steps:**
1. Open a project
2. Add a subtitle or make changes
3. Notice "Unsaved changes" indicator
4. Click "File" → "Close Project" WITHOUT saving

**Expected Results:**
- ✅ Warning dialog appears
- ✅ "You have unsaved changes. Are you sure?"
- ✅ Cancel keeps project open
- ✅ OK closes and loses changes

---

### ✅ Test 10: Export Video Integration

**Steps:**
1. Open project with some SFX and subtitles
2. Click "📤 Export Video"
3. Choose output location
4. Wait for export to complete

**Expected Results:**
- ✅ Video exports successfully
- ✅ Exported video copied to `[project]/assets/exports/`
- ✅ Can find exported file in both locations

---

### ✅ Test 11: Project Validation

**Steps:**
1. Create a project
2. Close app
3. Manually delete or move the project folder
4. Reopen app
5. Try to open from recent projects

**Expected Results:**
- ✅ Error message: "Project not found. It may have been moved or deleted."
- ✅ Project removed from recent list automatically
- ✅ No crash or freeze

---

### ✅ Test 12: Project Portability

**Steps:**
1. Create a project with video and SFX
2. Save and close
3. Copy entire project folder to different location
4. Open the copied `project.json`

**Expected Results:**
- ✅ Project loads successfully from new location
- ✅ Video plays (loaded from relative path)
- ✅ SFX files work
- ✅ All features functional

---

## Edge Cases to Test

### Missing Video File
1. Create project
2. Manually delete video from `assets/source/`
3. Try to reopen project
- Should show error or handle gracefully

### Corrupted project.json
1. Create project
2. Manually edit `project.json` with invalid JSON
3. Try to open
- Should show error message

### Large Project
1. Create project with many SFX tracks (10+)
2. Add many subtitles (50+)
3. Save and reload
- Should handle large files without issues

### Disk Space
1. Try creating project on full/read-only drive
- Should show appropriate error

---

## Performance Checks

- ✅ Project saves in < 1 second
- ✅ Project loads in < 2 seconds
- ✅ Recent projects list loads instantly
- ✅ No UI freezing during save operations
- ✅ File menu responsive

---

## Known Limitations

1. **No auto-save yet** - Must manually save with Ctrl+S
2. **No project thumbnails** - Recent projects show name only
3. **Max 10 recent projects** - Older ones automatically removed
4. **No undo/redo** - Be careful with File → Close without saving

---

## Troubleshooting

### "Failed to create project"
- Check folder permissions
- Ensure enough disk space
- Try different save location

### "Failed to load project"
- Verify `project.json` exists
- Check JSON is valid
- Ensure video file in `assets/source/`

### Recent projects not appearing
- Check `~/.config/ai-content-creator/recent-projects.json`
- File may be corrupted - delete to reset

### Save not working
- Check project path is valid
- Ensure write permissions
- Try "Save As" to new location

---

## Post-Test Verification

After completing all tests:

1. **Check project folder:**
   ```bash
   ls -la "Test Project 1/"
   cat "Test Project 1/project.json" | jq
   ```

2. **Check recent projects:**
   ```bash
   cat ~/.config/ai-content-creator/recent-projects.json | jq
   ```

3. **Verify file sizes:**
   - project.json should be < 100KB (unless huge analysis data)
   - Folder structure should match plan

4. **Memory check:**
   - No memory leaks after multiple save/load cycles
   - App should remain responsive

---

## Success Criteria

✅ All 12 test scenarios pass
✅ No console errors related to file management
✅ Projects can be created, saved, loaded, and closed
✅ Recent projects work correctly
✅ Keyboard shortcuts functional
✅ Data persists across app restarts
✅ Project folders portable to different locations

---

## Reporting Issues

If you find bugs, note:
1. Exact steps to reproduce
2. Expected vs actual behavior
3. Console errors (F12 Developer Tools)
4. Contents of project.json if relevant
5. Operating system

Run tests and let me know results!
