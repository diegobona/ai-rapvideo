const {chromium}=require('playwright');
const path=require('node:path');
const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 await fs.mkdir(path.join(__dirname,'previews'),{recursive:true});
 const names=process.argv.slice(2).length?process.argv.slice(2):['a-editorial','b-studio','c-midnight'];
 const results=await Promise.all(names.map(async name=>{
  const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4179/'+name+'.html',{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:path.join(__dirname,'previews',name+'-desktop.png')});
  await page.screenshot({path:path.join(__dirname,'previews',name+'-full.png'),fullPage:true});
  const desktop=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth,images:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.getAttribute('src'))}));
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(__dirname,'previews',name+'-mobile.png'),fullPage:true});
  const mobile=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth}));
  await page.close();return{name,desktop,mobile,errors};
 }));
 console.log(JSON.stringify(results));await browser.close();
})().catch(error=>{console.error(error.message);process.exit(1)});
