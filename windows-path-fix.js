// Windows Path Fix Script for CreatorCrafter
// This script patches the main.js file to use correct Windows paths
// Run with: node windows-path-fix.js

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('CreatorCrafter - Windows Path Fix');
console.log('========================================\n');

// Try to find the main.js file in common installation locations
const possiblePaths = [
  'C:\\Program Files\\CreatorCrafter\\resources\\app.asar.unpacked\\dist-electron\\main.js',
  'C:\\Program Files\\CreatorCrafter\\resources\\dist-electron\\main.js',
  'C:\\Program Files (x86)\\CreatorCrafter\\resources\\app.asar.unpacked\\dist-electron\\main.js',
  'C:\\Program Files (x86)\\CreatorCrafter\\resources\\dist-electron\\main.js',
  path.join(process.cwd(), 'resources', 'app.asar.unpacked', 'dist-electron', 'main.js'),
  path.join(process.cwd(), 'resources', 'dist-electron', 'main.js'),
];

let mainJsPath = null;

for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    mainJsPath = p;
    console.log('✓ Found main.js at:', p);
    break;
  }
}

if (!mainJsPath) {
  console.error('✗ Could not find main.js file!');
  console.error('\nPlease provide the path manually:');
  console.error('node windows-path-fix.js "C:\\Path\\To\\main.js"');
  console.error('\nOr run this script from the CreatorCrafter installation directory.');
  process.exit(1);
}

// Read the file
console.log('\nReading main.js...');
let content = fs.readFileSync(mainJsPath, 'utf8');

// Create backup
const backupPath = mainJsPath + '.backup';
if (!fs.existsSync(backupPath)) {
  console.log('Creating backup at:', backupPath);
  fs.writeFileSync(backupPath, content);
} else {
  console.log('Backup already exists at:', backupPath);
}

// Pattern to find and replace
const oldPattern1 = /const pythonPath = join\(appRoot, ['"]venv['"], ['"]bin['"], ['"]python['"]\)/g;
const oldPattern2 = /const pythonPath = join\(appRoot, ['"]venv['"], ['"]bin['"], ['"]python['"]\);/g;

const newCode = `const pythonPath = process.platform === 'win32'
        ? join(appRoot, 'venv', 'Scripts', 'python.exe')
        : join(appRoot, 'venv', 'bin', 'python')`;

// Check if already patched
if (content.includes("process.platform === 'win32'") && content.includes('Scripts')) {
  console.log('\n✓ File is already patched!');
  console.log('\nNothing to do. Your installation should work correctly.');
  process.exit(0);
}

// Apply the fix
let patchCount = 0;

// Try different pattern variations
const patterns = [
  /const pythonPath = join\(appRoot, ['"]venv['"], ['"]bin['"], ['"]python['"]\)/g,
  /const pythonPath=join\(appRoot,['"]venv['"],['"]bin['"],['"]python['"]\)/g,
  /const pythonPath = join\(appRoot,['"]venv['"],['"]bin['"],['"]python['"]\)/g,
];

for (const pattern of patterns) {
  const matches = content.match(pattern);
  if (matches) {
    patchCount += matches.length;
    content = content.replace(pattern, newCode);
  }
}

if (patchCount === 0) {
  console.error('\n✗ Could not find the code to patch!');
  console.error('\nThe file might be formatted differently than expected.');
  console.error('Please apply the manual fix described in WINDOWS_HOTFIX_INSTRUCTIONS.md');
  process.exit(1);
}

// Write the patched file
console.log(`\nApplying ${patchCount} fix(es)...`);
fs.writeFileSync(mainJsPath, content);

console.log('\n========================================');
console.log('✓ Patch applied successfully!');
console.log('========================================');
console.log('\nNext steps:');
console.log('1. Close CreatorCrafter if it\'s running');
console.log('2. Run windows-hotfix.bat to set up Python environment');
console.log('3. Restart CreatorCrafter');
console.log('\nIf something goes wrong, restore the backup:');
console.log('  copy "' + backupPath + '" "' + mainJsPath + '"');
console.log('');
