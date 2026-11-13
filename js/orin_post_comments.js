(() => {
  'use strict';
  const root=document.getElementById('orin-post'),configNode=document.getElementById('orin-post-config');
  if(!root||!configNode)return;
  const config=JSON.parse(configNode.textContent);if(!config.comments.enabled)return;
  const $=selector=>root.querySelector(selector),form=$('#comment-form'),feedback=$('#comment-feedback');
  if(!form)return;
  const list=$('#comment-list'),submit=form.querySelector('[type=submit]'),retry=$('#retry-comments'),more=$('#more-comments');
  const status=$('#form-status'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let endpoint,loading=false,sending=false,cursor=null,parentId=null,replyId=null,writable=false,lastPayload='',idempotencyKey='';
  const requests=new Set(),seen=new Set();
  try{
    if(!config.comments.apiBase)throw new Error();
    const base=new URL(config.comments.apiBase,location.origin);
    if(base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(base.hostname)))throw new Error();
    if(base.username||base.password||base.search||base.hash)throw new Error();
    endpoint=(base.href.endsWith('/')?base.href.slice(0,-1):base.href)+'/posts/'+encodeURIComponent(config.postId)+'/comments';
  }catch{feedback.textContent='评论功能准备中。';return}
  async function request(url,options={}){
    const controller=new AbortController();requests.add(controller);const timer=setTimeout(()=>controller.abort(),8000);
    try{
      const response=await fetch(url,{...options,signal:controller.signal,credentials:'omit',headers:{Accept:'application/json',...options.headers}});
      if(!response.ok){const details=await response.json().catch(()=>({}));const error=new Error(details.error||(response.status===429?'提交得有点频繁，请稍后再试。':response.status===403?'这篇文章暂时无法留言。':'请求没有完成，请稍后重试。'));error.status=response.status;throw error}
      return await response.json();
    }finally{clearTimeout(timer);requests.delete(controller)}
  }
  function clearReply(){parentId=null;replyId=null;$('.reply-target').hidden=true}
  $('#cancel-reply').addEventListener('click',()=>{clearReply();$('#comment-body').focus()});
  $('#comment-body').addEventListener('input',e=>$('#char-count').textContent=e.target.value.length+' / 2000');
  function row(item,pending=false){
    const el=document.createElement('div');el.className='comment-row'+(item.parentId?' reply':'')+(pending?' pending':'');
    const avatar=document.createElement('span');avatar.className='comment-avatar';avatar.setAttribute('aria-hidden','true');avatar.textContent=[...item.nickname][0]||'·';
    const account=item.authorId&&Object.hasOwn(config.authors,item.authorId)?config.authors[item.authorId]:null;
    if(account){const img=document.createElement('img');img.src=account.avatar;img.alt='';avatar.replaceChildren(img)}
    const content=document.createElement('div'),byline=document.createElement('div');byline.className='comment-byline';
    const name=document.createElement('span');name.className='comment-name';name.textContent=account?account.name:item.nickname;byline.append(name);
    if(pending){const badge=document.createElement('span');badge.className='comment-badge';badge.textContent='待审核';byline.append(badge)}
    else if(item.createdAt&&!Number.isNaN(Date.parse(item.createdAt))){const date=document.createElement('time');date.className='comment-time';date.dateTime=item.createdAt;date.textContent=new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(item.createdAt));byline.append(date)}
    const body=document.createElement('p');body.textContent=item.body;content.append(byline,body);
    if(!pending&&writable){const button=document.createElement('button');button.className='reply-button';button.type='button';button.textContent='回复';button.setAttribute('aria-label','回复 '+name.textContent);button.addEventListener('click',e=>{parentId=item.parentId||item.id;replyId=item.id;$('#reply-label').textContent='回复 '+name.textContent;$('.reply-target').hidden=false;form.scrollIntoView({behavior:reduced.matches||e.detail===0?'instant':'smooth',block:'center'});$('#comment-body').focus({preventScroll:true})});content.append(button)}
    el.append(avatar,content);return el;
  }
  async function load(append=false){
    if(loading)return;loading=true;retry.hidden=true;more.disabled=true;list.setAttribute('aria-busy','true');feedback.textContent='正在加载评论……';
    try{
      const url=new URL(endpoint);url.searchParams.set('limit','20');if(append&&cursor)url.searchParams.set('cursor',cursor);
      const data=await request(url);
      if(!Array.isArray(data.items)||typeof data.writable!=='boolean'||!Number.isInteger(data.totalPublished)||data.totalPublished<0||(data.nextCursor!==null&&typeof data.nextCursor!=='string'))throw new Error('评论暂时没能加载。');
      if(data.items.some(item=>!item||typeof item.id!=='string'||typeof item.nickname!=='string'||typeof item.body!=='string'))throw new Error('评论暂时没能加载。');
      writable=data.writable;form.hidden=!writable;submit.disabled=!writable||sending;
      if(!append){list.replaceChildren();seen.clear()}
      data.items.forEach(item=>{if(!seen.has(item.id)){seen.add(item.id);list.append(row(item))}});
      if(!writable){clearReply();list.querySelectorAll('.reply-button').forEach(button=>button.remove())}
      cursor=data.nextCursor;more.hidden=!cursor;$('#comment-count').textContent=String(data.totalPublished);
      feedback.textContent=!writable?'这篇文章暂时关闭了新留言，已有评论仍可阅读。':seen.size?'':'还没有评论，可以从你的第一条开始。';
    }catch{feedback.textContent='评论暂时没能加载，文章可以照常阅读。';retry.hidden=false;retry.dataset.append=String(append)}
    finally{loading=false;more.disabled=false;list.setAttribute('aria-busy','false')}
  }
  retry.addEventListener('click',()=>load(retry.dataset.append==='true'));more.addEventListener('click',()=>load(true));
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(sending||!writable)return;
    const fields=new FormData(form),payload={nickname:fields.get('nickname').trim(),email:fields.get('email').trim()||null,body:fields.get('body').trim(),parentId,replyToId:replyId};
    if(!payload.nickname||!payload.body){status.textContent='请填写昵称和留言内容。';return}
    const serialized=JSON.stringify(payload);
    if(serialized!==lastPayload){lastPayload=serialized;idempotencyKey=crypto.randomUUID()}
    sending=true;submit.disabled=true;submit.textContent='正在提交…';status.className='form-status';status.textContent='';
    try{
      const data=await request(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:serialized});
      if(typeof data.id!=='string'||!['pending','published'].includes(data.status))throw new Error('未收到提交确认，请重试，内容已保留。');
      if(data.status==='pending'){$('#pending-list').prepend(row({...payload,id:data.id},true));status.textContent='留言已收到，审核通过后会公开。'}
      else{status.textContent='留言已发表。';load(false)}
      form.elements.body.value='';$('#char-count').textContent='0 / 2000';clearReply();lastPayload='';idempotencyKey='';
    }catch(error){status.className='form-status error';status.textContent=(error.name==='AbortError'?'暂时没有收到确认，请重试。':error.message)+' 内容已保留。';if(error.status===403){writable=false;form.hidden=true;feedback.textContent='这篇文章暂时无法留言。';retry.hidden=false;retry.dataset.append='false'}}
    finally{sending=false;submit.disabled=!writable;submit.textContent='发表留言 ↗'}
  });
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();load()}},{rootMargin:'300px'});observer.observe($('#comments'))}else load();
  window.addEventListener('pagehide',()=>requests.forEach(controller=>controller.abort()));
})();
