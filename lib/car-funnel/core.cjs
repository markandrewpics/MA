'use strict';
const crypto = require('node:crypto');
const BASE = 'https://www.markandrewboudoir.com';
const CAMPAIGN = 'photo-giveaway-2026-09-28';
const TAG = {
  audience: 'car people',
  subscriber: `${CAMPAIGN}-subscriber`, confirmed: `${CAMPAIGN}-confirmed`,
  consent: `${CAMPAIGN}-consent`, test: `${CAMPAIGN}-test`,
};
class PublicError extends Error { constructor(message,status=400){super(message);this.status=status;} }
function config(env=process.env){
  return { token:env.PHOTO_GHL_TOKEN, location:env.PHOTO_GHL_LOCATION || 'Q6lVK1sfocdqesjFfFhK',
    key:env.PHOTO_LINK_SECRET, admin:env.PHOTO_ADMIN_SECRET,
    mode:env.PHOTO_MESSAGE_MODE || 'off', testEmail:(env.PHOTO_TEST_EMAIL || '').toLowerCase(),
    testPhone:env.PHOTO_TEST_PHONE || '', announcement:env.PHOTO_ANNOUNCEMENT_AT || '',
    galleryReady:env.PHOTO_GALLERY_READY === 'true', from:env.PHOTO_FROM_NUMBER || '',
    signupOpen:env.PHOTO_SIGNUP_OPEN === 'true' };
}
function secretKey(c){if(!c.key || c.key.length<32)throw new Error('Missing signing secret');return crypto.createHash('sha256').update(c.key).digest();}
function makeToken(id,c,now=Date.now()){
 const iv=crypto.randomBytes(12), cipher=crypto.createCipheriv('aes-256-gcm',secretKey(c),iv);
 const encrypted=Buffer.concat([cipher.update(JSON.stringify({id,campaign:CAMPAIGN,exp:now+1000*60*60*24*120})),cipher.final()]);
 return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url');
}
function readToken(token,c,now=Date.now()){
 try {
  if(typeof token!=='string'||token.length>1500)throw Error();
  const b=Buffer.from(token,'base64url');if(b.length<30)throw Error();
  const decipher=crypto.createDecipheriv('aes-256-gcm',secretKey(c),b.subarray(0,12));decipher.setAuthTag(b.subarray(12,28));
  const p=JSON.parse(Buffer.concat([decipher.update(b.subarray(28)),decipher.final()]).toString());
  if(p.campaign!==CAMPAIGN||p.exp<=now||!/^[-\w]{8,80}$/.test(p.id))throw Error();return p.id;
 } catch {throw new PublicError('Please open your personal link from Mark’s text or email.',401);}
}
function personalLink(id,c){return `${BASE}/car-show/#entry=${makeToken(id,c)}`;}
function phone(value){const digits=String(value||'').replace(/\D/g,'');let n=digits.length===10?'1'+digits:digits;if(!/^1[2-9]\d{2}[2-9]\d{6}$/.test(n))throw new PublicError('Please enter a valid 10-digit US mobile number.');return '+'+n;}
function validateSignup(body){
 const name=String(body.name||'').trim().replace(/\s+/g,' '), email=String(body.email||'').trim().toLowerCase();
 if(name.length<2||name.length>100)throw new PublicError('Please enter your name.');
 if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new PublicError('Please enter a valid email address.');
 if(body.consent!==true)throw new PublicError('Please check the permission box so Mark can contact you.');
 if(body.website)throw new PublicError('Please refresh and try again.');
 return {name,email,phone:phone(body.phone)};
}
function allowed(c,contact){return c.mode==='live'||(c.mode==='test'&&c.testEmail&&c.testPhone&&contact.email?.toLowerCase()===c.testEmail&&contact.phone===c.testPhone);}
function optedOut(contact,type){return contact.dnd===true || ['active','true'].includes(String(contact.dndSettings?.[type]?.status).toLowerCase());}
function deadline(c){const t=Date.parse(c.announcement);return Number.isFinite(t)?t:null;}
function windowOpen(c,now=Date.now()){const t=deadline(c);return t!==null&&now<t;}
function reminderDue(c,hours,now=Date.now()) {const t=deadline(c); if(t===null)return false;const start=t-hours*3600000;return now>=start&&now<start+3600000;}
function has(contact,tag){return Array.isArray(contact.tags)&&contact.tags.includes(tag);}
function eligible(contact,c,kind,now=Date.now()){
 if(!has(contact,TAG.subscriber)||!has(contact,TAG.consent)||!allowed(c,contact))return false;
 if(c.mode==='live'&&has(contact,TAG.test))return false;
 if(kind.startsWith('reminder')&&(has(contact,TAG.confirmed)||!windowOpen(c,now)))return false;
 return true;
}
function createApi(c,fetcher=fetch){return async function api(path,method='GET',body){
 const result=await fetcher('https://services.leadconnectorhq.com'+path,{method,headers:{Authorization:`Bearer ${c.token}`,Version:'2021-07-28','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 if(!result.ok){const e=new Error(`GHL ${result.status}`);e.status=result.status;throw e;}return result.status===204?{}:result.json();
};}
function createService(c,api,now=()=>Date.now()){
 async function getContact(id){const r=await api('/contacts/'+encodeURIComponent(id));const p=r.contact;if(!p||p.locationId!==c.location)throw new PublicError('This entry link is not valid.',401);return p;}
 async function addTags(id,tags){return api(`/contacts/${id}/tags`,'POST',{tags});}
 async function note(id,body){return api(`/contacts/${id}/notes`,'POST',{body});}
 async function duplicate(key,value){try{return (await api('/contacts/search/duplicate?'+new URLSearchParams({locationId:c.location,[key]:value}))).contact||null;}catch(e){if(e.status===404)return null;throw e;}}
 async function signup(input){
  if(!c.signupOpen)throw new PublicError('Signup is temporarily unavailable. Please try again shortly.',503);
  const data=validateSignup(input);
  if(c.mode==='test'&&!allowed(c,data))throw new PublicError('This form is currently being tested. Please check back shortly.',403);
  const [byEmail,byPhone]=await Promise.all([duplicate('email',data.email),duplicate('number',data.phone)]);
  if(byEmail&&byPhone&&byEmail.id!==byPhone.id)throw new PublicError('Please check your email address and mobile number. They do not match the same saved contact. If both are correct, ask Mark to update your details.',409);
  let p=byEmail||byPhone;
  const hadConsent=p&&has(p,TAG.consent);
  if(p?.email && p.email.trim().toLowerCase()!==data.email)throw new PublicError('Please use the email address you used before with this mobile number. If your email has changed, ask Mark to update it.',409);
  if(p?.phone && phone(p.phone)!==data.phone)throw new PublicError('Please use the mobile number you used before with this email address. If your number has changed, ask Mark to update it.',409);
  if(!p){p=(await api('/contacts/','POST',{locationId:c.location,name:data.name,email:data.email,phone:data.phone,source:'Car People — free photo QR signup',tags:[TAG.audience,TAG.subscriber,TAG.consent]})).contact;}
  else if(!p.email||!p.phone){const missing={};if(!p.email)missing.email=data.email;if(!p.phone)missing.phone=data.phone;await api('/contacts/'+p.id,'PUT',missing);}
  if(!p?.id)throw Error('Contact save unverified');
  const tags=[TAG.audience,TAG.subscriber,TAG.consent];if(c.mode==='test')tags.push(TAG.test);
  if(!hadConsent)await note(p.id,`Photo campaign consent ${new Date(now()).toISOString()}. Source: /car-show/signup/. User checked: I agree to receive texts and emails from Mark Andrew Photography about my photo and occasional offers. Message and data rates may apply. Reply STOP to opt out. Contact details supplied through QR signup.`);
  await addTags(p.id,tags);p=await getContact(p.id);
  if(!has(p,TAG.subscriber))throw Error('Membership save unverified');
  const link=personalLink(p.id,c);
  // Messaging errors must not discard a successful signup or prevent redirect.
  try{await sendOnce(p.id,'welcome','SMS');await sendOnce(p.id,'welcome','Email');}catch{await addTags(p.id,[`${CAMPAIGN}-message-review`]).catch(()=>{});}
  return {ok:true,redirect:link};
 }
 async function status(token){const p=await getContact(readToken(token,c,now()));if(!has(p,TAG.subscriber))throw new PublicError('Please sign up for your free photo first.',401);return {ok:true,confirmed:has(p,TAG.confirmed),open:windowOpen(c,now()),announcement:c.announcement};}
 async function confirm(token){const id=readToken(token,c,now());let p=await getContact(id);if(!has(p,TAG.subscriber))throw new PublicError('Please sign up for your free photo first.',401);if(has(p,TAG.confirmed))return {ok:true,confirmed:true,already:true};if(!windowOpen(c,now()))throw new PublicError(deadline(c)?'This giveaway is now closed. Your photo is still free.':'The drawing time is being finalized. Please check back shortly.',409);
  await addTags(id,[TAG.confirmed]);p=await getContact(id);if(!has(p,TAG.confirmed))throw Error('Entry save unverified');
  await note(id,`Giveaway entry explicitly confirmed ${new Date(now()).toISOString()}. Prize: full photoshoot + 8x12 fine art print, total value $780.`).catch(()=>{});
  return {ok:true,confirmed:true};
 }
 function copy(kind,link){
  if(!windowOpen(c,now())&&['welcome','gallery'].includes(kind))return {subject:kind==='gallery'?'Your free photo is ready':'Your free photo — Mark Andrew Photography',text:kind==='gallery'?`Hey, it’s Mark! Your photos are ready. Find and download your free picture here: ${link}`:`Hey, it’s Mark with Mark Andrew Photography! I’ll text your free gallery link from this number when your picture is ready, and email it too. Your photo page: ${link}`};
  if(kind==='welcome')return {subject:'Your free photo — Mark Andrew Photography',text:`Hey, it’s Mark with Mark Andrew Photography! I’ll text your free gallery link from this number when your picture is ready, and email it too. I’m also giving away a full photoshoot and an 8x12 fine art print — a $780 value. Confirm your entry here: ${link}`};
  if(kind==='gallery')return {subject:'Your free photo is ready',text:`Hey, it’s Mark! Your photos are ready. Find and download your free picture here: ${link} You can also confirm your entry into the photoshoot giveaway on that page.`};
  const hours=kind==='reminder48'?48:24;return {subject:`${hours} hours left to enter`,text:`Hey, it’s Mark with Mark Andrew Photography! ${hours} hours left to enter the giveaway for a free photoshoot and an 8x12 fine art print — a $780 value. Confirm your entry here: ${link}`};
 }
 async function sendOnce(id,kind,type){
  let p=await getContact(id);if(!eligible(p,c,kind,now())||optedOut(p,type)||!p[type==='SMS'?'phone':'email'])return {skipped:true};
  if(kind==='gallery'&&!c.galleryReady)return {skipped:true};
  const prefix=`${CAMPAIGN}-${kind}-${type.toLowerCase()}`;
  if(has(p,`${prefix}-sent`)||has(p,`${prefix}-sending`))return {skipped:true};
  // Durable claim prevents ordinary retries after ambiguous provider failures.
  await addTags(id,[`${prefix}-sending`]);p=await getContact(id);
  if(!eligible(p,c,kind,now())||optedOut(p,type))return {skipped:true};
  const link=personalLink(id,c)+(kind==='gallery'?'&view=gallery':'');const text=copy(kind,link);
  const payload={type,contactId:id};
  if(type==='SMS'){payload.message=text.text+' Reply STOP to opt out.';if(c.from)payload.fromNumber=c.from;if(kind==='welcome')payload.attachments=[`${BASE}/car-show/assets/giveaway-message.jpg`];}
  else{payload.emailFrom='Mark Andrew Photography <mark@markandrewphotography.com>';payload.subject=text.subject;payload.html='<p>'+text.text.replaceAll('&','&amp;').replaceAll('<','&lt;').replace(/(https:\/\/[^ ]+)/g,'<a href="$1">Open your personal page</a>')+'</p><p>— Mark Andrew Photography</p>';}
  try{
   if(type==='SMS'){
    const result=await api('/links/','POST',{locationId:c.location,name:`Car photo ${kind} ${crypto.createHash('sha256').update(id).digest('hex').slice(0,12)}`,redirectTo:link});
    const trigger=result.link?.fieldKey;
    if(typeof trigger!=='string'||!/^\{\{trigger_link\.[-\w]+\}\}$/.test(trigger))throw Error('Short link creation unverified');
    payload.message=payload.message.replace(link,trigger);
   }
   const result=await api('/conversations/messages','POST',payload);const messageId=result.messageId||result.emailMessageId||result.id;if(!messageId)throw Error('No message receipt');await addTags(id,[`${prefix}-sent`]);await note(id,`${prefix}: provider accepted message ${messageId} at ${new Date(now()).toISOString()}`).catch(()=>{});return {sent:true};}
  catch {await addTags(id,[`${prefix}-review`]).catch(()=>{});return {review:true};}
 }
 async function run(kind,page=1){
  if(!['reminder48','reminder24','gallery'].includes(kind))throw new PublicError('Invalid action');
  if(!Number.isInteger(page)||page<1||page>1000)throw new PublicError('Invalid page');
  if(kind==='gallery'&&!c.galleryReady)return {skipped:'gallery-not-ready'};
  if(kind.startsWith('reminder')&&!reminderDue(c,Number(kind.slice(8)),now()))return {skipped:'outside-send-window'};
  if(c.mode==='off')return {skipped:'messaging-disabled'};
  // One contact per invocation keeps GHL calls within function time limits.
  const r=await api('/contacts/search','POST',{locationId:c.location,page,pageLimit:1,filters:[{field:'tags',operator:'eq',value:TAG.subscriber}]});
  let sent=0,skipped=0,review=0;
  for(const p of r.contacts||[]){for(const type of ['SMS','Email']){const result=await sendOnce(p.id,kind,type);if(result.sent)sent++;else if(result.review)review++;else skipped++;}}
  const total=Number(r.total)||0;
  return {sent,skipped,review,nextPage:page<total?page+1:null};
 }

 return {signup,status,confirm,sendOnce,run,getContact};
}
module.exports={BASE,CAMPAIGN,TAG,PublicError,config,makeToken,readToken,personalLink,validateSignup,phone,allowed,eligible,reminderDue,windowOpen,createApi,createService};
