const fs = require('fs');
const path = require('path');

// remove private / protected index.d.ts
(() => {
    let content = fs.readFileSync(path.resolve(__dirname, '../dist/index.d.ts'), 'utf-8');
    content = content.replace(/\s+(private|protected).+;/g, '');
    content = require('./copyright') + '\n' + content;
    fs.writeFileSync(path.resolve(__dirname, '../dist/index.d.ts'), content, 'utf-8');
})();

// Fix workspace:* dependencies in dist/package.json
(() => {
    const distPkgPath = path.resolve(__dirname, '../dist/package.json');
    
    // Wait for copyfiles to finish
    if (!fs.existsSync(distPkgPath)) {
        console.log('⚠️  dist/package.json not found yet, skipping workspace fix');
        return;
    }
    
    const pkg = JSON.parse(fs.readFileSync(distPkgPath, 'utf8'));
    let changed = false;
    
    // Helper function to get version from monorepo package
    function getMonorepoVersion(packageName) {
        const possiblePaths = [
            path.resolve(__dirname, '../../', packageName, 'package.json'),
            path.resolve(__dirname, '../../', packageName.replace('koatty_', 'koatty-'), 'package.json'),
        ];
        
        for (const pkgPath of possiblePaths) {
            if (fs.existsSync(pkgPath)) {
                const depPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                return depPkg.version;
            }
        }
        return null;
    }
    
    // Fix dependencies
    ['dependencies', 'devDependencies', 'peerDependencies'].forEach(depType => {
        if (!pkg[depType]) return;
        
        Object.entries(pkg[depType]).forEach(([name, version]) => {
            if (version === 'workspace:*' || version.startsWith('workspace:')) {
                const actualVersion = getMonorepoVersion(name);
                if (actualVersion) {
                    // Use ^x.x.x for dependencies/devDependencies, ^x.x.x for peerDependencies
                    const newVersion = depType === 'peerDependencies' 
                        ? `^${actualVersion.split('.')[0]}.x.x`
                        : `^${actualVersion}`;
                    pkg[depType][name] = newVersion;
                    console.log(`✓ Fixed ${depType}.${name}: workspace:* → ${newVersion}`);
                    changed = true;
                }
            }
        });
    });
    
    if (changed) {
        fs.writeFileSync(distPkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
        console.log('✅ Fixed workspace:* dependencies in dist/package.json');
    }
})();
