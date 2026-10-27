import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const output = fileURLToPath(new URL('../public/', import.meta.url))
const preview = fileURLToPath(new URL('../.wrangler/', import.meta.url))
const background = '#191714'
const foreground = '#eee9df'
const heights = [10, 18, 25, 18, 10]
const bars = heights.map((height, index) => `<rect x="${index * 5}" y="${(25 - height) / 2}" width="2" height="${height}"/>`).join('')
const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="25" viewBox="0 0 22 25"><g fill="${foreground}">${bars}</g></svg>\n`
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${background}"/><g transform="translate(10 7) scale(2)" fill="${foreground}">${bars}</g></svg>\n`

// Align the smallest raster bars to whole pixels instead of shrinking thin
// vector edges onto half-pixels. Larger exports use the exact header geometry.
function source(size) {
  if (size !== 16 && size !== 32) return icon
  const smallHeights = size === 16 ? [4, 8, 12, 8, 4] : [10, 18, 26, 18, 10]
  const positions = size === 16 ? [3, 5, 7, 9, 11] : [5, 10, 15, 20, 25]
  const width = size === 16 ? 1 : 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${size * 0.1875}" fill="${background}"/><g fill="${foreground}">${smallHeights.map((height, index) => `<rect x="${positions[index]}" y="${(size - height) / 2}" width="${width}" height="${height}"/>`).join('')}</g></svg>`
}

async function png(size) {
  return sharp(Buffer.from(source(size))).resize(size, size).png().toBuffer()
}

function ico(frames) {
  const header = Buffer.alloc(6 + frames.length * 16)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(frames.length, 4)
  let offset = header.length
  frames.forEach(({ size, bytes }, index) => {
    const entry = 6 + index * 16
    header[entry] = size >= 256 ? 0 : size
    header[entry + 1] = size >= 256 ? 0 : size
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(bytes.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += bytes.length
  })
  return Buffer.concat([header, ...frames.map(frame => frame.bytes)])
}

await mkdir(output, { recursive: true })
await mkdir(preview, { recursive: true })
await Promise.all([
  writeFile(`${output}/logo.svg`, logo),
  writeFile(`${output}/favicon-wave.svg`, icon),
  ...[[16, 'favicon-16x16.png'], [32, 'favicon-32x32.png'], [180, 'apple-touch-icon.png'], [192, 'android-chrome-192x192.png'], [512, 'android-chrome-512x512.png']].map(async ([size, name]) => writeFile(`${output}/${name}`, await png(size))),
  writeFile(`${preview}/favicon-preview.png`, await png(256)),
])
const frames = await Promise.all([16, 32, 48].map(async size => ({ size, bytes: await png(size) })))
const favicon = ico(frames)
await Promise.all(['favicon.ico', 'favicon-wave.ico'].map(name => writeFile(`${output}/${name}`, favicon)))
await writeFile(`${output}/site.webmanifest`, JSON.stringify({
  name: 'AI Rap Video', short_name: 'AI Rap Video', start_url: '/',
  icons: [192, 512].map(size => ({ src: `/android-chrome-${size}x${size}.png?v=wave1`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any' })),
  theme_color: background, background_color: background, display: 'standalone',
}, null, 2) + '\n')
console.log('Generated waveform SVG, multi-size ICO, 16/32/180/192/512 PNG, manifest and preview.')
