#!/bin/bash
# Build script for Render deployment
# Runs migrations first, then db push

echo "🔧 Running Prisma migrations..."
npx prisma migrate deploy

echo "🔧 Generating Prisma Client..."
npx prisma generate

echo "✅ Build complete!"

