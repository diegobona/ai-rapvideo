const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
async function main() {
  const url = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700&family=Barlow+Condensed:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap';
  const response = await fetch(url, {headers:{'User-Agent':'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'},signal:AbortSignal.timeout(20000)});
  if(!response.ok) throw Error('Font stylesheet '+response.status);
  const original = await response.text();
  const blocks = original.match(/\/\* latin \*\/[\s\S]*?\}/g) || [];
  if(!blocks.length) throw Error('No Latin font faces found');
  let css = blocks.join('\n');
  const urls = [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map(m=>m[1]))];
  const dir = path.join(__dirname,'assets','fonts');
  await fs.mkdir(dir,{recursive:true});
  for(const address of urls) {
    const filename = crypto.createHash('sha256').update(address).digest('hex').slice(0,12)+'.woff2';
    const font = await fetch(address,{signal:AbortSignal.timeout(20000)});
    if(!font.ok) throw Error('Font file '+font.status);
    await fs.writeFile(path.join(dir,filename),Buffer.from(await font.arrayBuffer()));
    css = css.split(address).join('fonts/'+filename);
  }
  await fs.writeFile(path.join(__dirname,'assets','fonts.css'),css);
  console.log(JSON.stringify({fontFiles:urls.length,faces:blocks.length,stylesheet:'assets/fonts.css'}));
}
main().catch(error=>{console.error(error.message);process.exit(1)});
