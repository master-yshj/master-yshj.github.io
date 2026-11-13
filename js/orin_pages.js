(() => {
  const root=document.getElementById('orin-pages');if(!root)return;
  root.querySelectorAll('.friend-avatar').forEach(img=>{const fallback=()=>img.remove();img.addEventListener('error',fallback);if(img.complete&&!img.naturalWidth)fallback()});
  const menu=root.querySelector('.menu-toggle'),nav=root.querySelector('#navigation');
  const setMenu=open=>{menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);menu.lastElementChild.textContent=open?'−':'＋'};
  menu.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){setMenu(false);menu.focus()}});
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('.site-header'))setMenu(false)});
  matchMedia('(min-width:901px)').addEventListener('change',()=>setMenu(false));
  let author='all';const search=root.querySelector('.list-search input'),entries=[...root.querySelectorAll('.entry')];
  function filter(){let count=0;const term=(search?.value||'').trim().toLowerCase();entries.forEach(entry=>{entry.hidden=!(author==='all'||entry.dataset.author===author)||!entry.dataset.search.includes(term);if(!entry.hidden)count++});const empty=root.querySelector('.filter-empty');if(empty)empty.hidden=count>0;root.querySelectorAll('.archive-year').forEach(year=>{let item=year.nextElementSibling,visible=false;while(item&&!item.matches('.archive-year')){if(item.matches('.entry')&&!item.hidden)visible=true;item=item.nextElementSibling}year.hidden=!visible})}
  root.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{author=button.dataset.filter;root.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button))});filter()}));
  search?.addEventListener('input',filter);
  root.querySelector('#back-top').addEventListener('click',e=>window.scrollTo({top:0,behavior:e.detail===0||matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'}));
})();
