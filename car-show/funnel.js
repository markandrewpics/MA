'use strict';
(async()=>{
 const form=document.querySelector('#photo-signup');
 const button=document.querySelector('#confirm-entry');
 const entryButtons=[...document.querySelectorAll('[data-confirm-entry]')];
 const feedback=[...document.querySelectorAll('[data-entry-feedback]')];
 const successDialog=document.querySelector('#entry-success');
 document.querySelectorAll('[data-close-entry]').forEach(b=>b.addEventListener('click',()=>successDialog.close()));
 const setButtons=(disabled,label)=>entryButtons.forEach(b=>{b.disabled=disabled;b.textContent=label||(b.dataset.label||'Tap to confirm my entry');});
 const setStatus=text=>{document.querySelector('#confirmation-status').textContent=text;feedback.forEach(p=>p.textContent=text);};
 async function call(body){const r=await fetch('/api/car-funnel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({error:'Please try again shortly.'}));if(!r.ok)throw Error(d.error||'Please try again shortly.');return d;}
 if(form){
  form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;const submit=form.querySelector('button');const message=document.querySelector('#signup-status');submit.disabled=true;submit.textContent='Saving…';message.textContent='';
   try{const f=new FormData(form);const data=await call({action:'signup',name:f.get('name'),email:f.get('email'),phone:f.get('phone'),carYear:f.get('carYear'),carMakeModel:f.get('carMakeModel'),carColor:f.get('carColor'),carCondition:f.get('carCondition'),carDetails:f.get('carDetails'),consent:f.get('consent')==='on',website:f.get('website')});
    const destination=new URL(data.redirect);if(destination.origin!==location.origin&&destination.origin!=='https://www.markandrewboudoir.com')throw Error('Please ask Mark for help with your link.');location.assign(destination.href);
   }catch(err){message.textContent=err.message;submit.disabled=false;submit.textContent='Confirm';}
  });
 }
 if(button){
  const status=document.querySelector('#confirmation-status'),description=document.querySelector('#confirmation-intro');
  const params=new URLSearchParams(location.hash.slice(1)),token=params.get('entry');
  if(token)document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=document.querySelector(a.getAttribute('href'));if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth'});}}));
  if(params.get('view')==='gallery')document.querySelector('#gallery')?.scrollIntoView();
  const show=(data)=>{description.textContent=data.confirmed?"You’re entered!":"Tap to confirm your entry.";setButtons(data.confirmed||!data.open,data.confirmed?'You’re entered!':null);setStatus(data.confirmed?'Your entry is confirmed. We’ll let you know the result on September 28 at noon Eastern.':data.open?'One tap confirms your entry. Your photo is free either way.':'The drawing is not accepting entries right now. Your photo is still free.');};
  if(!token){description.textContent='Open the personal link from your text or email to confirm your entry.';status.replaceChildren();const a=document.createElement('a');a.href='signup/';a.textContent='Haven’t signed up? Get your free photo here.';status.append(a);setButtons(true);feedback.forEach(p=>{const a=document.createElement('a');a.href='signup/';a.textContent='Get your free photo and enter here.';p.replaceChildren(a);});return;}
  try{show(await call({action:'status',token}));}catch(err){setStatus(err.message);setButtons(true);}
  entryButtons.forEach(b=>b.addEventListener('click',async()=>{setButtons(true,'Confirming…');try{const result=await call({action:'confirm',token});show({...result,open:true});if(result.confirmed&&!successDialog.open)successDialog.showModal();}catch(err){setStatus(err.message);setButtons(false,'Try confirming again');}}));
 }
})();
