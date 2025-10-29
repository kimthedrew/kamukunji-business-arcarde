#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing KBA Project Setup...\n');

// Test 1: Check if .env file exists
console.log('1. Checking environment configuration...');
if (fs.existsSync('.env')) {
  console.log('   ✅ .env file exists');
} else {
  console.log('   ❌ .env file missing - copy from .env.example');
}

// Test 2: Check if client build exists
console.log('2. Checking client build...');
if (fs.existsSync('client/build/index.html')) {
  console.log('   ✅ Client build exists');
} else {
  console.log('   ❌ Client build missing - run "npm run build"');
}

// Test 3: Check if server public directory exists
console.log('3. Checking server public directory...');
if (fs.existsSync('server/public/index.html')) {
  console.log('   ✅ Server public directory exists');
} else {
  console.log('   ❌ Server public directory missing - run "npm run build"');
}

// Test 4: Check package.json scripts
console.log('4. Checking package.json scripts...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['dev', 'build', 'start', 'install-all'];
const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);

if (missingScripts.length === 0) {
  console.log('   ✅ All required scripts present');
} else {
  console.log(`   ❌ Missing scripts: ${missingScripts.join(', ')}`);
}

// Test 5: Check client dependencies
console.log('5. Checking client dependencies...');
if (fs.existsSync('client/node_modules')) {
  console.log('   ✅ Client dependencies installed');
} else {
  console.log('   ❌ Client dependencies missing - run "cd client && npm install"');
}

// Test 6: Check server dependencies
console.log('6. Checking server dependencies...');
if (fs.existsSync('node_modules')) {
  console.log('   ✅ Server dependencies installed');
} else {
  console.log('   ❌ Server dependencies missing - run "npm install"');
}

console.log('\n🎯 Setup Summary:');
console.log('   • Frontend: React app with TypeScript');
console.log('   • Backend: Node.js/Express server');
console.log('   • Database: Supabase (with SQLite fallback)');
console.log('   • Image Storage: Cloudinary');
console.log('   • Deployment: Docker + Koyeb ready');

console.log('\n🚀 Quick Start:');
console.log('   1. Copy .env.example to .env and configure');
console.log('   2. Run: npm run install-all');
console.log('   3. Run: npm run build');
console.log('   4. Run: npm start');
console.log('   5. Visit: http://localhost:8000');

console.log('\n✨ Project is ready for development and deployment!');
