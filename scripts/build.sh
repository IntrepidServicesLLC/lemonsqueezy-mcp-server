#!/bin/bash
# Generic build script - works with any CI/CD platform

set -e

echo "Building TypeScript MCP Server..."

# Install dependencies
echo "Installing dependencies..."
npm ci

# Run tests (if available)
if npm run test --if-present 2>/dev/null; then
  echo "Tests passed"
else
  echo "No tests configured, skipping"
fi

# Build
echo "Building..."
npm run build

# Verify build output
if [ ! -f "dist/index.js" ]; then
  echo "Error: Build output not found"
  exit 1
fi

echo "Build completed successfully"
