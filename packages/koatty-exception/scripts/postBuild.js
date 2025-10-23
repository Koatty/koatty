const fs = require('fs');
const path = require('path');

// remove private  index.d.ts
(() => {
    let content = fs.readFileSync(path.resolve(__dirname, '../dist/index.d.ts'), 'utf-8');
    content = content.replace(/\s+(private).+;/g, '');
    content = require('./copyright') + '\n' + content;
    fs.writeFileSync(path.resolve(__dirname, '../dist/index.d.ts'), content, 'utf-8');
})();
