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
    
    // Fix paths for dist/package.json (relative to dist/)
    if (pkg.main && pkg.main.startsWith('./dist/')) {
        pkg.main = pkg.main.replace('./dist/', './');
        changed = true;
        console.log(`✓ Fixed main: ./dist/... → ${pkg.main}`);
    }
    
    if (pkg.types && pkg.types.startsWith('./dist/')) {
        pkg.types = pkg.types.replace('./dist/', './');
        changed = true;
        console.log(`✓ Fixed types: ./dist/... → ${pkg.types}`);
    }
    
    if (!pkg.types && pkg.main) {
        pkg.types = pkg.main.replace(/\.js$/, '.d.ts');
        changed = true;
        console.log(`✓ Added types field: ${pkg.types}`);
    }
    
    if (pkg.exports) {
        Object.keys(pkg.exports).forEach(key => {
            if (typeof pkg.exports[key] === 'string' && pkg.exports[key].startsWith('./dist/')) {
                const oldPath = pkg.exports[key];
                pkg.exports[key] = pkg.exports[key].replace('./dist/', './');
                changed = true;
                console.log(`✓ Fixed exports.${key}: ${oldPath} → ${pkg.exports[key]}`);
            }
        });
    }
    
    if (changed) {
        fs.writeFileSync(distPkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
        console.log('✅ Fixed workspace:* dependencies and paths in dist/package.json');
    }
})();
