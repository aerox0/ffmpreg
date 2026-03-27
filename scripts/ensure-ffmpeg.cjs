#!/usr/bin/env node

/**
 * Download the platform-appropriate ffmpeg binary for cross-platform builds.
 *
 * Usage:
 *   node scripts/ensure-ffmpeg.js                     # current platform
 *   node scripts/ensure-ffmpeg.js --platform=win32    # Windows from Linux/WSL2
 *   node scripts/ensure-ffmpeg.js --platform=darwin --arch=arm64
 */

'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const https = require('https')
const zlib = require('zlib')
const { pipeline } = require('stream')

// Parse CLI args
const args = process.argv.slice(2)
function getArg(name) {
  const match = args.find(a => a.startsWith(`--${name}=`))
  return match ? match.split('=')[1] : null
}

const platform = getArg('platform') || os.platform()
const arch = getArg('arch') || os.arch()

// Read release tag from ffmpeg-static package.json
const ffmpegStaticDir = path.join(__dirname, '..', 'node_modules', 'ffmpeg-static')
const pkg = require(path.join(ffmpegStaticDir, 'package.json'))
const config = pkg[pkg.name]

const release = config['binary-release-tag']
const baseUrl = `https://github.com/eugeneware/ffmpeg-static/releases/download/${release}`
const downloadUrl = `${baseUrl}/ffmpeg-${platform}-${arch}.gz`
const destName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
const destPath = path.join(ffmpegStaticDir, destName)

// Skip if already present
if (fs.existsSync(destPath)) {
  try {
    const stat = fs.statSync(destPath)
    if (stat.size > 1000000) {
      console.log(`ffmpeg binary already exists: ${destPath} (${Math.round(stat.size / 1024 / 1024)}MB)`)
      process.exit(0)
    }
  } catch {}
}

console.log(`Downloading ffmpeg ${release} for ${platform}-${arch}...`)
console.log(`  URL: ${downloadUrl}`)
console.log(`  Destination: ${destPath}`)

function download(url) {
  return new Promise((resolve, reject) => {
    const follow = (url) => {
      https.get(url, { headers: { 'User-Agent': 'node' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          follow(res.headers.location)
        } else if (res.statusCode === 200) {
          resolve(res)
        } else {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        }
      }).on('error', reject)
    }
    follow(url)
  })
}

async function run() {
  const res = await download(downloadUrl)
  const tmpPath = destPath + '.tmp'

  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(tmpPath)
    pipeline(res, zlib.createGunzip(), file, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })

  fs.renameSync(tmpPath, destPath)
  try { fs.chmodSync(destPath, 0o755) } catch {}

  const stat = fs.statSync(destPath)
  console.log(`Done: ${destPath} (${Math.round(stat.size / 1024 / 1024)}MB)`)
}

run().catch(err => {
  console.error('Failed to download ffmpeg:', err.message)
  process.exit(1)
})
