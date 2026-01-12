const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

console.log('🚀 Starting build process for Windows...\n');

// Helper function to copy directory recursively
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Helper function to get directory size
function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  if (!fs.existsSync(dirPath)) return 0;
  
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      totalSize += getDirectorySize(filePath);
    } else {
      totalSize += stats.size;
    }
  });
  
  return totalSize;
}

// Step 1: Clean previous builds
console.log('🧹 Cleaning previous builds...');
if (fs.existsSync('.next')) {
  fs.rmSync('.next', { recursive: true, force: true });
}
if (fs.existsSync('deploy')) {
  fs.rmSync('deploy', { recursive: true, force: true });
}

// Step 2: Build the application
console.log('📦 Building Next.js application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Build failed!');
  process.exit(1);
}

// Step 3: Create deployment directory
console.log('\n📁 Creating deployment structure...');
fs.mkdirSync('deploy', { recursive: true });

// Step 4: Copy standalone build
console.log('📋 Copying standalone build...');
const standalonePath = path.join('.next', 'standalone');
if (!fs.existsSync(standalonePath)) {
  console.error('❌ Error: Standalone build not found!');
  console.error('Make sure output: "standalone" is set in next.config.js');
  process.exit(1);
}

// Copy all files from standalone
copyRecursiveSync(standalonePath, 'deploy');

// Step 5: Copy static files
console.log('📋 Copying static assets...');
const staticPath = path.join('.next', 'static');
const deployStaticPath = path.join('deploy', '.next', 'static');
fs.mkdirSync(path.join('deploy', '.next'), { recursive: true });
copyRecursiveSync(staticPath, deployStaticPath);

// Step 6: Copy public folder (if exists)
if (fs.existsSync('public')) {
  console.log('📋 Copying public folder...');
  copyRecursiveSync('public', path.join('deploy', 'public'));
}

// Step 7: Copy server scripts from ./scripts/server
console.log('📋 Copying server deployment scripts...');
const serverScriptsPath = path.join('scripts', 'server');
if (fs.existsSync(serverScriptsPath)) {
  const deployScriptsPath = path.join('deploy', 'scripts');
  copyRecursiveSync(serverScriptsPath, deployScriptsPath);
  console.log('✅ Server scripts copied to deployment package');
} else {
  console.warn('⚠️  Warning: ./scripts/server directory not found, skipping...');
}

// Step 8: Create startup scripts for Windows
console.log('📝 Creating startup scripts...');

// Windows batch script
const startupScriptBat = `@echo off
REM Next.js Standalone Startup Script for Windows

REM Set production environment
set NODE_ENV=production

REM Optional: Load environment variables from .env.production
if exist .env.production (
    echo Loading environment variables from .env.production...
    for /f "usebackq tokens=*" %%a in (".env.production") do (
        set %%a
    )
)

REM Start the application
echo Starting Next.js application...
node server.js
`;

fs.writeFileSync(path.join('deploy', 'start.bat'), startupScriptBat);

// PowerShell script
const startupScriptPs1 = `# Next.js Standalone Startup Script for PowerShell

# Set production environment
$env:NODE_ENV = "production"

# Optional: Load environment variables from .env.production
if (Test-Path .env.production) {
    Write-Host "Loading environment variables from .env.production..."
    Get-Content .env.production | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
}

# Start the application
Write-Host "Starting Next.js application..."
node server.js
`;

fs.writeFileSync(path.join('deploy', 'start.ps1'), startupScriptPs1);

// Step 9: Create Linux startup script (for cross-platform)
const startupScriptSh = `#!/bin/bash
# Next.js Standalone Startup Script for Linux

# Set production environment
export NODE_ENV=production

# Optional: Load environment variables from .env.production
if [ -f .env.production ]; then
    echo "Loading environment variables from .env.production..."
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Start the application
echo "Starting Next.js application..."
node server.js
`;

fs.writeFileSync(path.join('deploy', 'start.sh'), startupScriptSh);

// Step 10: Create README for deployment
console.log('📝 Creating deployment README...');
const readme = `# Deployment Instructions

## For Windows

### Quick Start (Batch Script)
1. Extract this archive
2. (Optional) Create .env.production file with your environment variables
3. Double-click start.bat or run in CMD:
   \`\`\`
   start.bat
   \`\`\`

### Quick Start (PowerShell)
1. Extract this archive
2. (Optional) Create .env.production file with your environment variables
3. Run in PowerShell:
   \`\`\`
   .\\start.ps1
   \`\`\`

### Manual Start
\`\`\`
node server.js
\`\`\`

### With Environment Variables (CMD)
\`\`\`
set NODE_ENV=production
set PORT=3000
node server.js
\`\`\`

### With Environment Variables (PowerShell)
\`\`\`
$env:NODE_ENV="production"
$env:PORT="3000"
node server.js
\`\`\`

## For Linux

### Quick Start
1. Extract this archive
2. (Optional) Create .env.production file
3. Make script executable and run:
   \`\`\`
   chmod +x start.sh
   ./start.sh
   \`\`\`

### Using Deployment Scripts
Server deployment scripts are included in the ./scripts directory:
- \`deploy.sh\` - Automated deployment script
- \`rollback.sh\` - Rollback to previous version
- \`monitor.sh\` - Monitor application status

Make them executable:
\`\`\`bash
chmod +x scripts/*.sh
\`\`\`

### Manual Start
\`\`\`
NODE_ENV=production node server.js
\`\`\`

## Default Configuration
- Port: 3000 (override with PORT environment variable)
- Environment: production

## Environment Variables
Create a .env.production file in the same directory with:
\`\`\`
PORT=3000
DATABASE_URL=your_database_url
API_KEY=your_api_key
\`\`\`

## Server Scripts
The \`./scripts\` directory contains helpful deployment and management scripts for Linux servers.

## Built on: ${new Date().toISOString()}
## Node.js version required: ${process.version}
`;

fs.writeFileSync(path.join('deploy', 'README.md'), readme);

// Step 11: Create .env.production.example
const envExample = `# Environment Variables Example
# Copy this file to .env.production and fill in your values

NODE_ENV=production
PORT=3000

# Add your environment variables below
# DATABASE_URL=
# API_KEY=
# NEXT_PUBLIC_API_URL=
`;

fs.writeFileSync(path.join('deploy', '.env.production.example'), envExample);

// Step 12: Get deployment size
const deploySize = getDirectorySize('deploy');
const deploySizeMB = (deploySize / (1024 * 1024)).toFixed(2);

console.log(`\n📊 Deployment size: ${deploySizeMB} MB`);

// Step 13: Create tar.gz archive
console.log('\n🗜️  Creating compressed archive...');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const archiveName = `deployment-${timestamp}.tar.gz`;

const output = fs.createWriteStream(archiveName);
const archive = archiver('tar', {
  gzip: true,
  gzipOptions: {
    level: 9 // Maximum compression
  }
});

output.on('close', () => {
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
  console.log(`   - start.bat (Windows CMD)`);
  console.log(`   - start.ps1 (PowerShell)`);
  console.log(`   - start.sh (Linux/Mac)`);
  console.log(`   - README.md (instructions)`);
  console.log(`   - .env.production.example (environment template)`);
  
  console.log('\n🎉 Ready for deployment!\n');

  // Clean up deploy directory
  console.log('🧹 Cleaning up temporary files...');
  fs.rmSync('deploy', { recursive: true, force: true });
  
  console.log('✨ Done!\n');
});

output.on('error', (err) => {
  console.error('❌ Error creating archive:', err);
  process.exit(1);
});

archive.on('error', (err) => {
  console.error('❌ Archive error:', err);
  process.exit(1);
});

archive.pipe(output);
archive.directory('deploy', false);
archive.finalize();