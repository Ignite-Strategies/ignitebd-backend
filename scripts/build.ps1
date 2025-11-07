# Build script for Render deployment (PowerShell version)
# Runs migrations first, then generates Prisma Client

Write-Host "🔧 Running Prisma migrations..."
npx prisma migrate deploy

Write-Host "🔧 Generating Prisma Client..."
npx prisma generate

Write-Host "✅ Build complete!"

