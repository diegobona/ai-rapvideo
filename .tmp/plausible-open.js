await page.goto('https://plausible.io/sites', {waitUntil:'domcontentloaded'});
return await tabbit.observe({frames:'none',maxChars:6500});
