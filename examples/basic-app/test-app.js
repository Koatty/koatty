const path = require('path');
process.env.UV_THREADPOOL_SIZE = '128';
process.env.TS_NODE_TRANSPILE_ONLY = 'true';
process.env.TS_NODE_PROJECT = './tsconfig.json';

console.log('🔍 Starting application test...');
console.log('Node version:', process.version);
console.log('');

require('ts-node/register');

try {
  console.log('📦 Loading App module...');
  const appModule = require('./src/App.ts');
  console.log('✅ App module loaded:', Object.keys(appModule));
  console.log('');
  console.log('🎯 Bootstrap decorator should have executed');
  console.log('');
  
  // Keep process alive
  setTimeout(() => {
    console.log('⏱️  5 seconds passed, exiting');
    process.exit(0);
  }, 5000);
} catch (err) {
  console.error('❌ Error:', err);
  process.exit(1);
}
