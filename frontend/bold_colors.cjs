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
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = getFiles(srcDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace font-light with font-bold
  content = content.replace(/font-light/g, 'font-bold');

  // Replace the dull grayish text color with a solid dark/bright color
  content = content.replace(/#73879C/g, '#1F2937'); // Solid dark gray almost black

  // Replace the dull alert background with a bright yellow or solid blue
  content = content.replace(/#fcf8e3/g, '#FEF08A'); // Bright yellow
  content = content.replace(/#8a6d3b/g, '#854D0E'); // Dark solid brown/yellow

  // Replace dull table header bg with a solid bright color
  // Let's use a solid gray or blue for the table headers
  content = content.replace(/bg-\[#f9f9f9\]/g, 'bg-[#E5E7EB]'); // Slightly darker gray for more contrast
  content = content.replace(/text-\[#333\]/g, 'text-black');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
