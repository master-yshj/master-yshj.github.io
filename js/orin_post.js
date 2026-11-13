(() => {
  'use strict';
  const root=document.getElementById('orin-post');if(!root)return;
  const $=selector=>root.querySelector(selector),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const menu=$('.menu-toggle'),nav=$('#navigation');let frame=0,timer;
  function setMenu(open,focus=false){menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);menu.lastElementChild.textContent=open?'−':'＋';if(focus)menu.focus()}
  menu.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true')setMenu(false,true)});
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('.site-header'))setMenu(false)});
  matchMedia('(min-width:901px)').addEventListener('change',()=>setMenu(false));
  const headings=[...root.querySelectorAll('#article h1[id],#article h2[id],#article h3[id]')];
  function update(){
    frame=0;const rect=$('#article').getBoundingClientRect(),distance=Math.max(1,rect.height-innerHeight+120);
    const progress=Math.max(0,Math.min(1,-(rect.top-115)/distance));$('.reading-progress').style.transform='scaleX('+progress+')';
    if($('#reading-percent'))$('#reading-percent').textContent='已读 '+Math.round(progress*100)+'%';
    let current=headings[0]?.id;headings.forEach(h=>{if(h.getBoundingClientRect().top<=160)current=h.id});
    root.querySelectorAll('.toc-links a').forEach(a=>{if(decodeURIComponent(a.hash.slice(1))===current)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});
  }
  const queue=()=>{if(!frame)frame=requestAnimationFrame(update)};
  window.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',queue,{passive:true});
  new ResizeObserver(queue).observe($('#article'));document.fonts.ready.then(update);update();
  root.addEventListener('click',e=>{
    const anchor=e.target.closest('a[href^="#"]');if(!anchor)return;
    let target;try{target=document.getElementById(decodeURIComponent(anchor.hash.slice(1)))}catch{return}if(!target)return;
    e.preventDefault();const details=anchor.closest('.mobile-toc');if(details)details.open=false;
    target.scrollIntoView({behavior:reduced.matches||e.detail===0?'instant':'smooth',block:'start'});
    if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');target.focus({preventScroll:true});history.replaceState(null,'',anchor.hash);
  });
  function tell(message){clearTimeout(timer);$('#toast').textContent=message;$('#toast').hidden=false;timer=setTimeout(()=>$('#toast').hidden=true,2500)}
  async function copy(text){try{await navigator.clipboard.writeText(text);tell('已复制')}catch{tell('浏览器未允许复制，请选中内容后手动复制。')}}
  $('#copy-link').addEventListener('click',()=>copy(location.href.split('#')[0]));
  $('#back-top').addEventListener('click',e=>window.scrollTo({top:0,behavior:reduced.matches||e.detail===0?'instant':'smooth'}));
  root.querySelectorAll('figure.highlight,pre').forEach(block=>{
    if(block.tagName==='PRE'&&block.closest('figure.highlight'))return;
    const text=block.querySelector('.code pre')?.textContent||block.querySelector('code')?.textContent||block.textContent;
    const toolbar=document.createElement('div');toolbar.className='code-toolbar';
    const language=document.createElement('span');language.textContent=[...block.classList].find(c=>c!=='highlight')||block.querySelector('code')?.className.replace('language-','')||'代码';
    const button=document.createElement('button');button.type='button';button.className='copy-code';button.textContent='复制代码';button.addEventListener('click',()=>copy(text));
    toolbar.append(language,button);
    const wrapper=document.createElement('div');wrapper.className='code-block';block.before(wrapper);wrapper.append(toolbar,block);
    block.tabIndex=0;block.setAttribute('aria-label',language.textContent+' 代码');
  });
  root.querySelectorAll('#article table').forEach(table=>{if(table.closest('.highlight'))return;const wrap=document.createElement('div');wrap.className='table-scroll';wrap.tabIndex=0;wrap.setAttribute('aria-label','表格，可横向滚动');table.before(wrap);wrap.append(table)});
})();
