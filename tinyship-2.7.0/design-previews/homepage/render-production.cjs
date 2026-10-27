const {chromium}=require('playwright');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1,javaScriptEnabled:false});
 await page.goto('http://127.0.0.1:7013/',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:path.join(__dirname,'previews/production-desktop.png')});
 await page.screenshot({path:path.join(__dirname,'previews/production-full.png'),fullPage:true});
 const desktop=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth,title:document.title,h1:document.querySelector('h1')?.textContent,videos:document.querySelectorAll('.example-grid video').length,columns:getComputedStyle(document.querySelector('#rap-maker')).gridTemplateColumns}));
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:path.join(__dirname,'previews/production-mobile.png')});
 const mobile=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth}));
 console.log(JSON.stringify({desktop,mobile}));
 await browser.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
