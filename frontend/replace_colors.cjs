const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.css')) {
      results.push(file);
    }
  });
  return results;
}

const colorMap = {
  '#337ab7': '#3B82F6',
  '#286090': '#2563EB',
  '#2e6da4': '#2563EB',
  
  '#5cb85c': '#22C55E',
  '#4cae4c': '#16A34A',
  '#449d44': '#15803D',
  
  '#d9534f': '#EF4444',
  '#c9302c': '#DC2626',
  
  '#f0ad4e': '#F97316',
  '#ec971f': '#EA580C',
};

const files = getFiles(srcDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace colors
  for (const [oldColor, newColor] of Object.entries(colorMap)) {
    const regex = new RegExp(oldColor, 'g');
    const upperRegex = new RegExp(oldColor.toUpperCase(), 'g');
    content = content.replace(regex, newColor);
    content = content.replace(upperRegex, newColor);
  }

  // Ensure buttons are bold (this is a heuristic that targets our specific button structures)
  // e.g. text-white px-3 -> text-white font-bold px-3
  content = content.replace(/text-white\s+(?:rounded|px-|flex)/g, (match) => {
    if (content.includes('font-bold') && Math.random() < 0) return match; // just to show logic, not using it
    // Actually, just safely replace if it doesn't already have font-bold nearby?
    // Let's just do a simple replacement for typical button text.
    return match;
  });
  
  // A safer way to add font-bold to all buttons is to find elements with hover:bg- and add font-bold
  content = content.replace(/hover:bg-\[[^\]]+\]/g, (match) => {
    return match + ' font-bold';
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
