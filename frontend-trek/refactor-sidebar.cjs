const fs = require('fs');
const path = require('path');

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

    // 1. Change useState(false) for isSidebarOpen to useState(window.innerWidth > 768)
    const stateRegex1 = /const\s+\[isSidebarOpen,\s*setIsSidebarOpen\]\s*=\s*useState\(false\);/g;
    if (stateRegex1.test(content)) {
        content = content.replace(stateRegex1, 'const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);');
        changed = true;
    }
    
    // Also cover if it's already true or something else? Just false for now as that's the default.

    // 2. Inject import for DesktopSidebarToggle
    if (!content.includes('DesktopSidebarToggle')) {
        // Calculate relative path to components
        const relativePath = path.relative(path.dirname(file), 'src/components/DesktopSidebarToggle').replace(/\\/g, '/');
        
        // Find the last import statement
        const lastImportRegex = /import\s+.*?;?\n/g;
        let match;
        let lastMatch;
        while ((match = lastImportRegex.exec(content)) !== null) {
            lastMatch = match;
        }

        if (lastMatch) {
            const insertPos = lastMatch.index + lastMatch[0].length;
            content = content.slice(0, insertPos) + `import DesktopSidebarToggle from '${relativePath}';\n` + content.slice(insertPos);
            changed = true;
        }
    }

    // 3. Inject DesktopSidebarToggle component right inside <div className="layout">
    const layoutRegex = /<div\s+className="layout">/g;
    if (layoutRegex.test(content) && !content.includes('<DesktopSidebarToggle')) {
        content = content.replace(layoutRegex, `<div className="layout">\n      <DesktopSidebarToggle isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />`);
        changed = true;
    }
    
    // 4. Modify className="main" to className={`main ${!isSidebarOpen ? 'expanded' : ''}`}
    // We need to be careful with regex here.
    const mainRegex = /<main\s+className="main">/g;
    if (mainRegex.test(content)) {
        content = content.replace(mainRegex, `<main className={\`main \${!isSidebarOpen ? 'expanded' : ''}\`}>`);
        changed = true;
    }
    
    // 5. Modify className="topbar" to className={`topbar ${!isSidebarOpen ? 'expanded' : ''}`}
    const topbarRegex = /<header\s+className="topbar">/g;
    if (topbarRegex.test(content)) {
        content = content.replace(topbarRegex, `<header className={\`topbar \${!isSidebarOpen ? 'expanded' : ''}\`}>`);
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated sidebar logic in: ${file}`);
        changedCount++;
    }
});

console.log(`Refactoring complete. Updated ${changedCount} files.`);
