(() => {
  'use strict';
  window.disposeOrinHome?.();
  let instance = null;
  function mount(options = {}) {
    const root = document.getElementById('orin-home');
    if (instance?.root === root && root?.isConnected) return;
    instance?.dispose(); instance = null;
    if (!root) return;
    const events = new AbortController(), { signal } = events;
    const $ = s => root.querySelector(s);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const menu = $('.menu-toggle'), nav = $('#navigation'), hero = $('.hero'), artExit = $('.art-exit');
    const canvas = $('#dust'), ctx = canvas?.getContext('2d');
    let frame = 0, scrollFrame = 0, entryTimer = 0, entryReadyTimer = 0, lastTime = 0, width = 0, height = 0, darkBottom = 0;
    let stars = [], pointer = {x: -9999, y: -9999}, disposed = false;
    let revealObserver;
    const setMenu = (open, focus = false) => {
      nav?.classList.toggle('is-open', open);
      menu?.setAttribute('aria-expanded', String(open));
      if (menu) menu.lastElementChild.textContent = open ? '−' : '＋';
      if (focus) menu?.focus();
    };
    menu?.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'), {signal});
    document.addEventListener('keydown', e => {if(e.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') setMenu(false, true)}, {signal});
    document.addEventListener('pointerdown', e => {if(!e.target.closest('#orin-home .site-header'))setMenu(false)}, {signal});
    matchMedia('(min-width: 851px)').addEventListener('change', () => setMenu(false), {signal});
    nav?.addEventListener('click', e => {if(e.target.closest('a'))setMenu(false)}, {signal});
    root.addEventListener('focusin', e => {
      const el = e.target.closest('[data-reveal]');
      if(el) {el.classList.remove('reveal-ready');el.classList.add('reveal-visible');el.style.transition='none';revealObserver?.unobserve(el)}
    }, {signal});
    root.addEventListener('click', e => {
      if(!e.target.closest('a[href="#writing"]'))return;
      e.preventDefault(); const writing = $('#writing');
      writing?.scrollIntoView({behavior: reduced.matches || e.detail === 0 ? 'instant' : 'smooth', block: 'start'});
      writing?.focus({preventScroll:true});
    }, {signal});
    $('#back-top')?.addEventListener('click', e => window.scrollTo({top:0,behavior:reduced.matches || e.detail === 0 ? 'instant' : 'smooth'}), {signal});
    async function enter() {
      root.classList.remove('entry-running','entry-short');
      if (!hero || options.restore || reduced.matches || scrollY > 80) {root.classList.add('entry-safe');return}
      const navigationType = performance.getEntriesByType('navigation')[0]?.type;
      let returned = options.short || navigationType === 'back_forward';
      // A reload always gets the full entrance, even when it has a same-site referrer.
      if(navigationType !== 'reload' && document.referrer) {
        try {const from = new URL(document.referrer);returned ||= from.origin === location.origin && from.pathname !== location.pathname} catch {}
      }
      const delays = [100, 220, 460, 640, 760];
      root.querySelectorAll('[data-entry]').forEach(el => el.style.setProperty('--entry-delay', (delays[Number(el.dataset.entry)] || 0) + 'ms'));
      const image = $('.hero-art');
      await Promise.race([
        Promise.allSettled([document.fonts?.load('16px OrinSignatureV2'), image?.decode?.()]),
        new Promise(resolve => {entryReadyTimer = setTimeout(resolve, 400)})
      ]);
      clearTimeout(entryReadyTimer);
      if(disposed || !root.isConnected)return;
      root.classList.add('entry-safe');
      if(reduced.matches || scrollY > 80)return;
      void root.offsetWidth;
      root.classList.add(returned ? 'entry-short' : 'entry-running');
      entryTimer = setTimeout(() => root.classList.remove('entry-running','entry-short'), returned ? 500 : 1700);
    }
    function reveals() {
      revealObserver?.disconnect();
      const elements = root.querySelectorAll('[data-reveal]');
      if (reduced.matches || options.restore || !('IntersectionObserver' in window)) {
        elements.forEach(el => {el.classList.remove('reveal-ready');el.classList.add('reveal-visible')}); return;
      }
      revealObserver = new IntersectionObserver(entries => entries.forEach(({target,isIntersecting}) => {
        if(!isIntersecting)return;
        target.classList.add('reveal-visible');target.classList.remove('reveal-ready');revealObserver.unobserve(target);
      }), {threshold:.08,rootMargin:'0px 0px -18px 0px'});
      elements.forEach((el,i) => {
        if(el.dataset.shown)return;el.dataset.shown='true';
        el.style.setProperty('--reveal-delay', (i < 3 ? i * 60 : 0) + 'ms');
        el.classList.add('reveal-ready');revealObserver.observe(el);
      });
    }
    function measure() {
      darkBottom = hero ? hero.getBoundingClientRect().bottom : $('.site-header').getBoundingClientRect().bottom;
      if(!hero || !artExit)return;
      const rect = hero.getBoundingClientRect(), top = rect.top + scrollY;
      const available = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const end = Math.min(top + rect.height * .7, available * .88), start = Math.min(80, end * .2);
      const t = Math.max(0, Math.min(1, (scrollY - start) / Math.max(1,end-start)));
      artExit.style.opacity = String(1 - t*t*(3-2*t));
    }
    function resize() {
      measure();if(!ctx)return;
      const oldW=width,oldH=height;width=innerWidth;height=innerHeight;
      const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      if(!stars.length || oldW!==width || oldH!==height){
        let seed=9329;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};
        stars=Array.from({length:Math.min(95,Math.max(25,Math.round(width*height/17000)))},()=>({x:rand()*width,y:rand()*height,r:.5+rand()*1.2,vx:(rand()-.5)*3,vy:-(2+rand()*5),dx:0,dy:0,alpha:.3+rand()*.35}));
      }
      draw(0,false);
    }
    function draw(dt,moving) {
      if(!ctx)return;ctx.clearRect(0,0,width,height);
      for(const s of stars){
        if(moving){s.x=(s.x+s.vx*dt+width)%width;s.y=(s.y+s.vy*dt+height)%height}
        const dx=s.x-pointer.x,dy=s.y-pointer.y,dist=Math.hypot(dx,dy)||1,force=moving?Math.max(0,1-dist/130)*20:0;
        const blend=moving?1-Math.exp(-dt*6):1;s.dx+=(dx/dist*force-s.dx)*blend;s.dy+=(dy/dist*force-s.dy)*blend;
        const x=s.x+s.dx,y=s.y+s.dy,night=y<darkBottom;
        ctx.globalAlpha=night?s.alpha:s.alpha*.38;ctx.fillStyle=night?'#c8e2ff':'#9ebcde';ctx.beginPath();ctx.arc(x,y,s.r,0,Math.PI*2);ctx.fill();
        if(night&&s.r>1.48){ctx.globalAlpha=.08;ctx.beginPath();ctx.arc(x,y,s.r*3,0,Math.PI*2);ctx.fill()}
      }
      ctx.globalAlpha=1;
    }
    function tick(now) {
      frame=0;if(disposed || !root.isConnected || document.hidden || reduced.matches)return;
      const dt=lastTime?Math.min((now-lastTime)/1000,.05):0;lastTime=now;draw(dt,true);frame=requestAnimationFrame(tick);
    }
    function start() {if(ctx && !frame && !disposed && !document.hidden && !reduced.matches){lastTime=0;frame=requestAnimationFrame(tick)}}
    function stop() {cancelAnimationFrame(frame);frame=0;lastTime=0;}
    window.addEventListener('resize',()=>{resize();start()}, {signal,passive:true});
    window.addEventListener('scroll',()=>{
      if(scrollFrame)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;measure();if(reduced.matches)draw(0,false)});
    },{signal,passive:true});
    root.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!fine.matches||reduced.matches)return;pointer={x:e.clientX,y:e.clientY}}, {signal,passive:true});
    root.addEventListener('pointerleave',()=>pointer={x:-9999,y:-9999},{signal});
    document.addEventListener('visibilitychange',()=>{root.classList.toggle('motion-paused',document.hidden);if(document.hidden)stop();else start()}, {signal});
    reduced.addEventListener('change',()=>{stop();pointer={x:-9999,y:-9999};root.classList.remove('entry-running','entry-short');reveals();resize();start()}, {signal});
    const sizeObserver = new ResizeObserver(() => {measure();if(reduced.matches)draw(0,false)});sizeObserver.observe(root);
    function dispose() {
      disposed=true;events.abort();stop();cancelAnimationFrame(scrollFrame);clearTimeout(entryTimer);clearTimeout(entryReadyTimer);revealObserver?.disconnect();sizeObserver.disconnect();
      root.classList.add('entry-safe');root.classList.remove('entry-running','entry-short','motion-paused');
      root.querySelectorAll('.reveal-ready').forEach(el => el.classList.remove('reveal-ready'));
    }
    instance={root,dispose};enter();reveals();resize();start();
  }
  const unmount=()=>{instance?.dispose();instance=null};
  const ready=()=>mount();
  const pjaxComplete=()=>mount({short:true});
  const pageshow=e=>{if(e.persisted)mount({restore:true});else mount()};
  document.addEventListener('DOMContentLoaded',ready);
  document.addEventListener('pjax:send',unmount);
  document.addEventListener('pjax:complete',pjaxComplete);
  window.addEventListener('pagehide',unmount);
  window.addEventListener('pageshow',pageshow);
  window.disposeOrinHome=()=>{unmount();document.removeEventListener('DOMContentLoaded',ready);document.removeEventListener('pjax:send',unmount);document.removeEventListener('pjax:complete',pjaxComplete);window.removeEventListener('pagehide',unmount);window.removeEventListener('pageshow',pageshow)};
  if(document.readyState!=='loading')mount();
})();

