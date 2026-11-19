// Packs the home page pictures: takes the wide screenshots of the valley (one per time of day) from a folder,
// shrinks them to 2400 px wide and writes them to public/assets/home/.
// Run: node tools/pack-home.mjs <folder with hero-dawn.jpg hero-noon.jpg hero-sunset.jpg hero-night.jpg>
import sharp from 'sharp'

const folder = process.argv[2]
if (!folder) throw new Error('Give the folder that holds the hero-*.jpg screenshots')
for (const time of ['dawn', 'noon', 'sunset', 'night']) {
  const out = `public/assets/home/hero-${time}.jpg`
  await sharp(`${folder}/hero-${time}.jpg`).resize({ width: 2400 }).jpeg({ quality: 82, mozjpeg: true }).toFile(out)
  console.log('wrote', out)
}
