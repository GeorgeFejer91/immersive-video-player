import { prepareWithSegments, measureLineStats, measureNaturalWidth, setLocale } from '@chenglou/pretext';

// Flow grows to fit; user font enlargement is never undone to make a label fit.
export async function measureTextRegions() {
  await document.fonts.ready;
  setLocale(document.documentElement.lang);
  const cache = new Map();
  let frame;
  const targets = [...document.querySelectorAll('button, .button-link, summary, h1, h2, .notice, .connection, .small, .eyebrow, #intro')];
  function measure() {
    frame = undefined;
    const results = targets.filter(el => el.getClientRects().length).map(el => {
      const css = getComputedStyle(el), rect = el.getBoundingClientRect();
      const px = v => Number.parseFloat(v) || 0;
      const width = rect.width - px(css.paddingLeft) - px(css.paddingRight) - px(css.borderLeftWidth) - px(css.borderRightWidth) - (el.tagName === 'SUMMARY' ? 22 : 0);
      const text = el.textContent.trim();
      const font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
      const key = `${text}|${font}|${css.letterSpacing}`;
      let prepared = cache.get(key);
      if (!prepared) { prepared=prepareWithSegments(text,font,{letterSpacing:px(css.letterSpacing)}); cache.set(key,prepared); if(cache.size>128)cache.delete(cache.keys().next().value); }
      const stats=measureLineStats(prepared,Math.max(1,width-2));
      const natural=measureNaturalWidth(prepared);
      const lineHeight=px(css.lineHeight)||px(css.fontSize)*1.5;
      return { el, lines:stats.lineCount, natural, width, height:Math.ceil(stats.lineCount*lineHeight+px(css.paddingTop)+px(css.paddingBottom)+2) };
    });
    for(const r of results){
      r.el.dataset.textFit = r.natural <= r.width-2 ? 'single' : 'wrapped';
      if(r.el.tagName==='BUTTON') r.el.style.minHeight=`${Math.max(46,r.height)}px`;
    }
    document.documentElement.dataset.pretext = 'measured';
  }
  const queue=()=>{if(!frame)frame=requestAnimationFrame(measure);};
  const resize=new ResizeObserver(queue); targets.forEach(el=>resize.observe(el));
  const mutation=new MutationObserver(queue); mutation.observe(document.body,{subtree:true,childList:true,characterData:true});
  queue();
  return ()=>{resize.disconnect();mutation.disconnect();cancelAnimationFrame(frame);};
}
