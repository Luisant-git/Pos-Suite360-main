const fs = require('fs');
const path = require('path');

const layoutPath = path.join(__dirname, 'src', 'layouts', 'MainLayout.tsx');
let content = fs.readFileSync(layoutPath, 'utf8');

// Change sidebar background from #2A3F54 to very dark #111827 (gray-900)
content = content.replace(/#2A3F54/g, '#111827');

// Change hover/active background from #172D44 to #1F2937 (gray-800)
content = content.replace(/#172D44/g, '#1F2937');

// Make NavLink text font-bold instead of font-medium
content = content.replace(/<span className="font-medium">/g, '<span className="font-bold">');

fs.writeFileSync(layoutPath, content, 'utf8');
console.log('Sidebar updated');
