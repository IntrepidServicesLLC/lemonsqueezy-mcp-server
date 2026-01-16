#!/bin/bash
# Generic test script - works with any CI/CD platform

set -e

echo "Running tests..."

# Install dependencies
npm ci

# Run tests
npm test

echo "Tests completed"
