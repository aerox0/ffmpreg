#!/bin/bash
set -e

cd /home/zero/dev/ffmpreg

# Install dependencies if node_modules doesn't exist or is outdated
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    npm install
fi

# Verify ffmpeg-static and ffprobe-static are available
node -e "require('ffmpeg-static')" || echo "WARNING: ffmpeg-static not found"
node -e "require('ffprobe-static')" || echo "WARNING: ffprobe-static not found"

echo "Environment ready"
