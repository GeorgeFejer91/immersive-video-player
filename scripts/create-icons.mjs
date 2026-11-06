import { chromium } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';

// Reuse the controller's headset glyph, within the maskable icon safe zone.
const browser=await chromium.launch();
try {
  const page=await browser.newPage();await mkdir('public/icons',{recursive:true});
  for(const size of [180,192,512]){
    const png=await page.evaluate(async size=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
      const context=canvas.getContext('2d');context.fillStyle='#f3f2ec';context.fillRect(0,0,size,size);
      const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g transform="translate(0 4)" fill="none" stroke="#314d3b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7 9 3h14l3 4M6 8H4l-2 3v6l3 2M26 8h2l2 3v6l-3 2M8 7h16a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-4l-4-3-4 3H8a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3Z"/><path d="M10 12h3m6 0h3"/></g></svg>';
      const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(svg);await image.decode();
      context.drawImage(image,size*.2,size*.2,size*.6,size*.6);return canvas.toDataURL('image/png').split(',')[1];
    },size);
    await writeFile(`public/icons/controller-${size}.png`,Buffer.from(png,'base64'));
  }
} finally {await browser.close();}
