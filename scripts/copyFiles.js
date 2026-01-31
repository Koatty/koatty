const fs = require('fs');
const path = require('path');

const filesToCopy = ['package.json', 'LICENSE', 'README.md'];
const distDir = path.resolve(__dirname, '../dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy files
filesToCopy.forEach(file => {
  const srcPath = path.resolve(__dirname, `../${file}`);
  const destPath = path.join(distDir, file);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file} to dist/`);
  } else {
    console.warn(`Warning: ${file} not found`);
  }
});

console.log('File copy completed');
