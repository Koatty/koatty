const path = require('path');
process.env.TS_NODE_TRANSPILE_ONLY = 'true';
require('ts-node/register');

console.log('Testing Logger.Fatal...\n');

const { Logger } = require('../../src/util/Logger');

console.log('Logger methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(Logger)).filter(m => m.includes('atal')));
console.log('');

console.log('Calling Logger.Fatal with test error...');
try {
  Logger.Fatal(new Error('Test fatal error'));
} catch (e) {
  console.error('Caught:', e);
}

console.log('This line should not execute if Fatal calls process.exit');
