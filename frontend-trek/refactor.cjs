const fs = require('fs');
const path = require('path');

// 1. Refactor all JSX files in pages directory
const pagesDir = 'src/pages';

function findJsxFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(findJsxFiles(fullPath));
        } else if (file.endsWith('.jsx')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = findJsxFiles(pagesDir);
let changedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Check if useState is imported
    if (!content.includes('useState')) {
        content = content.replace(/import React(?:,\s*\{[^}]*\})?\s*from\s*['"]react['"];/, (match) => {
            if (match.includes('{')) {
                return match.replace('{', '{ useState, ');
            }
            return `import React, { useState } from 'react';`;
        });
    }

    if (!content.includes('isSidebarOpen') && content.includes('<aside className="sidebar">')) {
        
        const stateStr = `\n  const [isSidebarOpen, setIsSidebarOpen] = useState(false);\n`;
        
        // Use a precise regex to match the start of the layout
        const layoutRegex = /return\s*\(\s*<div className="layout">/;
        if (layoutRegex.test(content)) {
            content = content.replace(layoutRegex, stateStr + `\n  return (\n    <div className="layout">`);
            
            // Replace aside
            content = content.replace(
                /<aside className="sidebar">/g,
                `{isSidebarOpen && (\n        <div \n          className="sidebar-overlay open" \n          onClick={() => setIsSidebarOpen(false)} \n        />\n      )}\n      <aside className={\`sidebar \${isSidebarOpen ? "open" : ""}\`}>`
            );
            
            // Replace topbar
            const topbarRegex = /<header className="topbar">\s*<div>/g;
            content = content.replace(topbarRegex, `<header className="topbar">\n          <div className="topbar-left-wrapper">\n            <button \n              className="hamburger-btn" \n              onClick={() => setIsSidebarOpen(true)}\n              aria-label="Buka Sidebar"\n            >\n              ☰\n            </button>\n            <div>`);
            
            // Close the topbar-left-wrapper div
            const topbarRightRegex = /<\/div>\s*<div className="topbar-right">/g;
            content = content.replace(topbarRightRegex, `</div>\n          </div>\n          <div className="topbar-right">`);
            
            changed = true;
        } else {
            console.log(`Failed to find layout return in ${file}`);
        }
    }
    
    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated: ${file}`);
        changedCount++;
    }
});

console.log(`Refactoring complete. Updated ${changedCount} files.`);
