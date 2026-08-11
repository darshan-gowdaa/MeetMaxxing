const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(srcDir);
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // 1. Remove glassmorphism
  content = content.replace(/backdrop-blur(?:-(?:sm|md|lg|xl|2xl|3xl|none))?/g, '');
  content = content.replace(/bg-opacity-\d+/g, '');
  content = content.replace(/bg-white\/\d+/g, 'bg-surface-container-highest');
  content = content.replace(/bg-black\/\d+/g, 'bg-surface-container-high');
  content = content.replace(/bg-zinc-\d+\/\d+/g, 'bg-surface-container');

  // 2. Remove scale animations
  content = content.replace(/(?:hover:|focus:|active:|group-hover:)?scale-\[?[\d.]+\]?/g, '');
  
  // 3. Remove translate-y hover effects (often used with scale)
  content = content.replace(/(?:hover:|focus:|active:|group-hover:)?-?translate-y-\[?[\d.]+\]?(?:px|rem)?/g, '');

  // 4. Remove gradients
  content = content.replace(/bg-gradient-to-[a-z]+/g, 'bg-primary');
  content = content.replace(/from-[a-z]+-\d+(?:\/\d+)?/g, '');
  content = content.replace(/via-[a-z]+-\d+(?:\/\d+)?/g, '');
  content = content.replace(/to-[a-z]+-\d+(?:\/\d+)?/g, '');
  content = content.replace(/bg-clip-text/g, '');
  content = content.replace(/text-transparent/g, 'text-primary');

  // 5. Remove large drop shadows
  content = content.replace(/shadow-(?:xl|2xl|lg|md)/g, 'shadow-sm border border-border');
  
  // 6. Clean up multiple spaces
  content = content.replace(/ +/g, ' ');
  content = content.replace(/ "/g, '"');
  content = content.replace(/" /g, '"');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log('Fixed:', file);
  }
});

console.log(`Fixed ${changedFiles} files.`);
