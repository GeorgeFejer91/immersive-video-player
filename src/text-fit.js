import { prepareWithSegments, measureLineStats, measureNaturalWidth, setLocale } from '@chenglou/pretext';

export async function measureTextRegions(){
  await document.fonts.ready;setLocale(document.documentElement.lang);
  const cache=new Map();let frame;
  const shells=[...document.querySelectorAll('.stretch-shell')];
  const prepared=(text,font,spacing)=>{
    const key=`${text}|${font}|${spacing}`;
    if(!cache.has(key)){cache.set(key,prepareWithSegments(text,font,{letterSpacing:spacing}));if(cache.size>256)cache.delete(cache.keys().next().value);}
    return cache.get(key);
  };
  const px=value=>parseFloat(value)||0;
  let resetKey='';
  function measure(){
    frame=undefined;
    const floor=Math.max(16,px(getComputedStyle(document.documentElement).fontSize));
    const key=`${innerWidth}|${innerHeight}|${floor}|${[...document.querySelectorAll('[data-accordion][open]')].map(el=>el.id).join(',')}`;
    if(key!==resetKey){shells.forEach(el=>el.dataset.layout='bounded');resetKey=key;}
    const visible=shells.filter(el=>el.getClientRects().length);
    let changed=false;
    for(const shell of visible){
      const {width,height:rawHeight}=shell.getBoundingClientRect();const height=Math.min(rawHeight,innerHeight),short=innerHeight<=430;
      const gap=short?4:Math.round(Math.max(6,Math.min(20,width*.025,height*.018)));
      let size=Math.max(floor,Math.min(20,Math.floor(Math.min(width*.052,height*.034))));
      const actions=[...shell.querySelectorAll('.fixed-action')].filter(el=>el.getClientRects().length);
      while(size>floor){
        const allFit=actions.every(el=>{
          const css=getComputedStyle(el),budget=el.clientWidth-px(css.paddingLeft)-px(css.paddingRight)-2;
          const font=`${css.fontStyle} ${css.fontWeight} ${size}px ${css.fontFamily}`;
          const p=prepared(el.textContent.trim(),font,px(css.letterSpacing));
          return measureNaturalWidth(p)<=budget&&measureLineStats(p,Math.max(1,budget)).lineCount===1;
        });
        if(allFit)break;size--;
      }
      const tokens={'--ui-font':size,'--gap':gap,'--control':short?36:Math.round(Math.max(40,Math.min(48,width*.14,height*.12))),'--summary':short?28:Math.round(Math.max(30,Math.min(40,width*.10,height*.075))),'--range':short?28:Math.round(Math.max(30,Math.min(40,width*.10,height*.07)))};
      for(const [name,value]of Object.entries(tokens))if(shell.style.getPropertyValue(name)!==`${value}px`){shell.style.setProperty(name,`${value}px`);changed=true;}
    }
    if(changed){queue();return;}
    const writes=[];
    for(const el of document.querySelectorAll('button,.button-link,summary,h1,.status,label>span,output')){
      if(!el.checkVisibility())continue;
      const css=getComputedStyle(el),rect=el.getBoundingClientRect();
      const width=rect.width-px(css.paddingLeft)-px(css.paddingRight)-px(css.borderLeftWidth)-px(css.borderRightWidth)-(el.tagName==='SUMMARY'?22:0);
      const font=`${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
      const p=prepared(el.textContent.trim(),font,px(css.letterSpacing));
      const stats=measureLineStats(p,Math.max(1,width-2));
      const natural=measureNaturalWidth(p),lineHeight=px(css.lineHeight)||px(css.fontSize)*1.4;
      const shell=el.closest('.stretch-shell');
      const minimum=el.tagName==='SUMMARY'?px(shell?.style.getPropertyValue('--summary')):px(shell?.style.getPropertyValue('--control'))||36;
      writes.push({el,mode:natural<=width-2?'single':'wrapped',height:Math.max(minimum,Math.ceil(stats.lineCount*lineHeight+px(css.paddingTop)+px(css.paddingBottom)+2))});
    }
    for(const w of writes){w.el.dataset.textFit=w.mode;if(w.el.matches('button,.button-link,summary')){const height=`${w.height}px`;if(w.el.style.minHeight!==height)w.el.style.minHeight=height;}}
    for(const shell of visible){
      const body=shell.querySelector('.stretch-body');
      if(shell.dataset.layout!=='flow'&&body?.classList.contains('panel-body')){
        const groups=[...body.querySelectorAll('[data-accordion]')];
        const summaries=groups.reduce((sum,el)=>sum+el.querySelector('summary').getBoundingClientRect().height,0);
        const available=Math.max(0,body.clientHeight-summaries-px(getComputedStyle(body).gap)*(groups.length-1));
        for(const group of groups)if(group.open)group.querySelector('.accordion-content').style.height=`${available}px`;
      }
    }
    const qr=document.querySelector('.qr-space');
    if(qr?.getClientRects().length){const r=qr.getBoundingClientRect();qr.style.setProperty('--qr-side',`${Math.floor(Math.min(r.width,r.height,420))}px`);}
    for(const shell of visible){
      const body=shell.querySelector('.stretch-body');
      const regions=[shell,body,...shell.querySelectorAll('[open]>.accordion-content')].filter(Boolean);
      if(regions.some(el=>el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2)){
        shell.dataset.layout='flow';for(const el of shell.querySelectorAll('.accordion-content'))el.style.height='auto';
      }
    }
    document.documentElement.dataset.pretext='measured';
  }
  function queue(){if(!frame)frame=requestAnimationFrame(measure);}
  const resize=new ResizeObserver(queue);shells.forEach(el=>resize.observe(el));document.querySelectorAll('.stretch-body,.qr-space').forEach(el=>resize.observe(el));
  const mutation=new MutationObserver(queue);mutation.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['open','hidden']});
  document.addEventListener('toggle',queue,true);window.addEventListener('resize',queue);queue();
  return()=>{resize.disconnect();mutation.disconnect();document.removeEventListener('toggle',queue,true);window.removeEventListener('resize',queue);cancelAnimationFrame(frame);};
}
