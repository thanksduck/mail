import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('.');
const distDir = path.resolve('dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// Copy directories
const dirsToCopy = ['Controller', 'Models', 'routes', 'utils'];

dirsToCopy.forEach(dir => {
  if (fs.existsSync(path.join(srcDir, dir))) {
    fs.cpSync(path.join(srcDir, dir), path.join(distDir, dir), { recursive: true });
    console.log(`Copied ${dir} directory to dist`);
  }
});

// Generate selectZone.js from template
const templatePath = path.join(srcDir, 'Premium', 'selectZone.template.js');
const outputPath = path.join(distDir, 'Premium', 'selectZone.js');

if (fs.existsSync(templatePath)) {
  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  }
  fs.copyFileSync(templatePath, outputPath);
  console.log('Generated selectZone.js from template');
} else {
  console.warn('selectZone.template.js not found. Skipping generation of selectZone.js');
}

console.log('Production files prepared successfully');