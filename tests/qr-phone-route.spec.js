import {test,expect} from '@playwright/test';

test('shared QR link opens phone connection controls directly without a role chooser',async({browser,page})=>{
  await page.goto('./');
  const link=await page.locator('#entry-link').inputValue();
  expect(new URL(link).searchParams.get('join')).toBe('1');
  const phones=[
    ['iPhone Safari','Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'],
    ['iPhone Chrome','Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/143.0.0.0 Mobile/15E148 Safari/604.1'],
    ['Android Chrome','Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 Chrome/143.0.0.0 Mobile Safari/537.36'],
    ['Samsung Internet','Mozilla/5.0 (Linux; Android 16; SM-S938B) AppleWebKit/537.36 SamsungBrowser/29.0 Chrome/136.0.0.0 Mobile Safari/537.36'],
    ['Android scanner WebView','Mozilla/5.0 (Linux; Android 15; Pixel 9 Build/AP4A; wv) AppleWebKit/537.36 Version/4.0 Chrome/137.0.0.0 Mobile Safari/537.36'],
    ['iPad desktop Safari','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15'],
  ];
  for(const [name,userAgent]of phones){
    await test.step(name,async()=>{
      const context=await browser.newContext({userAgent,hasTouch:true,viewport:{width:390,height:844}});
      if(name.startsWith('iPad'))await context.addInitScript(()=>Object.defineProperty(navigator,'maxTouchPoints',{get:()=>5}));
      try{
        const phone=await context.newPage();await phone.goto(link);
        await expect(phone.locator('body')).toHaveAttribute('data-page','controller');
        await expect(phone.locator('#entry')).toBeHidden();
        await expect(phone.getByRole('dialog',{name:'Headset connection'})).toBeVisible();
        await expect(phone.locator('#connect')).toBeVisible();
        await expect(phone.locator('#paste-invitation')).toBeHidden();
        expect(new URL(phone.url()).hash).toBe('');
      }finally{await context.close();}
    });
  }
});
