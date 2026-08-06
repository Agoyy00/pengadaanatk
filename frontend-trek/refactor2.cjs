const fs = require('fs');
const path = require('path');

// 1. Update layout.css
const cssPath = 'src/css/layout.css';
let css = fs.readFileSync(cssPath, 'utf8');

const newCSS = `
/* ===== ANIMATED HAMBURGER MENU ===== */
.hamburger-menu {
    display: none;
    flex-direction: column;
    justify-content: space-around;
    width: 24px;
    height: 20px;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    margin-right: 16px;
    z-index: 110;
}
.hamburger-line {
    width: 24px;
    height: 2.5px;
    background: #0f172a;
    border-radius: 10px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    transform-origin: left center;
}
.hamburger-menu.open .hamburger-line:nth-child(1) {
    transform: rotate(45deg);
    width: 26px;
}
.hamburger-menu.open .hamburger-line:nth-child(2) {
    opacity: 0;
    transform: translateX(20px);
}
.hamburger-menu.open .hamburger-line:nth-child(3) {
    transform: rotate(-45deg);
    width: 26px;
}

@media (max-width: 768px) {
    .hamburger-menu {
        display: flex;
    }
}
`;

if (!css.includes('hamburger-menu')) {
    fs.appendFileSync(cssPath, '\n' + newCSS);
    console.log('CSS updated with animated hamburger.');
}

// 2. Refactor all JSX files in pages directory
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

    // Find the old hamburger button and replace it with the new animated one
    const oldButtonRegex = /<button\s+className="hamburger-btn"[\s\S]*?<\/button>/;
    
    if (oldButtonRegex.test(content)) {
        const newButton = `<button 
              className={\`hamburger-menu \${isSidebarOpen ? 'open' : ''}\`} 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle Sidebar"
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>`;
        content = content.replace(oldButtonRegex, newButton);
        changed = true;
    }
    
    // Check for the topbar z-index issue. If topbar is z-index 90, we need it to be 110 so the button is clickable when sidebar is open!
    // But modifying CSS is better. Let's do it in the CSS instead.

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated button in: ${file}`);
        changedCount++;
    }
});

console.log(`Refactoring complete. Updated ${changedCount} files.`);
