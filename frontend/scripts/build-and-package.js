const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting build process...\n');

function getDirectorySize(dirPath) {
  let totalSize = 0;
  if (!fs.existsSync(dirPath)) return 0;

  for (const file of fs.readdirSync(dirPath)) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.isDirectory() ? getDirectorySize(filePath) : stats.size;
  }
  return totalSize;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function rmIfExists(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

console.log('🧹 Cleaning previous builds...');
rmIfExists('.next');
rmIfExists('deploy');

console.log('📦 Building Next.js application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch {
  console.error('❌ Build failed!');
  process.exit(1);
}

/**
 * Validate standalone build output
 */
const standaloneDir = path.join('.next', 'standalone');
const staticDir = path.join('.next', 'static');

if (!fs.existsSync(standaloneDir)) {
  console.error('❌ Missing .next/standalone');
  console.error('➡️  Ensure next.config.js has:  output: "standalone"');
  process.exit(1);
}
if (!fs.existsSync(staticDir)) {
  console.error('❌ Missing .next/static');
  console.error('➡️  Your build is incomplete; Next must generate static assets.');
  process.exit(1);
}

console.log('\n📁 Creating deployment structure...');
ensureDir('deploy');

console.log('📋 Copying standalone server + minimal node_modules...');
/**
 * IMPORTANT:
 * Copy CONTENTS of .next/standalone into deploy root so deploy/server.js exists.
 */
execSync(`cp -a ${standaloneDir}/. deploy/`, { stdio: 'inherit' });

console.log('📋 Copying Next static assets to deploy/.next/static...');
ensureDir('deploy/.next');
execSync(`cp -a ${staticDir} deploy/.next/static`, { stdio: 'inherit' });

if (fs.existsSync('public')) {
  console.log('📋 Copying public folder...');
  execSync('cp -a public deploy/public', { stdio: 'inherit' });
}

console.log('📋 Copying server deployment scripts...');
const serverScriptsPath = 'scripts/server';
if (fs.existsSync(serverScriptsPath)) {
  execSync(`cp -a ${serverScriptsPath} deploy/scripts`, { stdio: 'inherit' });
  execSync('chmod +x deploy/scripts/*.sh 2>/dev/null || true', { stdio: 'inherit' });
  console.log('✅ Server scripts copied and made executable');
} else {
  console.warn('⚠️  Warning: ./scripts/server directory not found, skipping...');
}

/**
 * Optional: keep package.json for metadata / env
 * (standalone can run without installing deps)
 */
if (fs.existsSync('package.json')) {
  execSync('cp -a package.json deploy/package.json', { stdio: 'inherit' });
}

console.log('\n🔎 Verifying expected deploy layout...');
if (!fs.existsSync('deploy/server.js')) {
  console.error('❌ deploy/server.js not found (entrypoint missing).');
  console.error('➡️  Something is wrong with the standalone output copy step.');
  process.exit(1);
}
if (!fs.existsSync('deploy/.next/static')) {
  console.error('❌ deploy/.next/static not found (static assets missing).');
  process.exit(1);
}

const deploySize = getDirectorySize('deploy');
const deploySizeMB = (deploySize / (1024 * 1024)).toFixed(2);
console.log(`\n📊 Deployment size: ${deploySizeMB} MB`);

console.log('\n🗜️  Creating compressed archive...');
const timestamp = new Date().toISOString().split('T')[0];
const archiveName = `casetools-front-${timestamp}.tar.gz`;

try {
  execSync(`tar -czf ${archiveName} -C deploy .`, { stdio: 'inherit' });

  const archiveStats = fs.statSync(archiveName);
  const archiveSizeMB = (archiveStats.size / (1024 * 1024)).toFixed(2);
  const compressionRatio = ((1 - archiveStats.size / deploySize) * 100).toFixed(1);

  console.log(`\n✅ Build complete!`);
  console.log(`📦 Archive: ${archiveName}`);
  console.log(`📊 Archive size: ${archiveSizeMB} MB`);
  console.log(`🗜️  Compression ratio: ${compressionRatio}%`);
  console.log(`\n📝 Package contents:`);
  console.log(`   - server.js (entry point)`);
  console.log(`   - .next/static/ (static assets)`);
  console.log(`   - public/ (public files)`);
  console.log(`   - scripts/ (server deployment scripts)`);
  console.log('\n🎉 Ready for deployment!\n');
} catch (error) {
  console.error('❌ Error creating archive:', error.message);
  process.exit(1);
}

console.log('🧹 Cleaning up temporary files...');
rmIfExists('deploy');
console.log('✨ Done!\n');
