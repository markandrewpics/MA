const {test}=require('node:test');const assert=require('node:assert/strict');
const {config,makeToken,readToken,validateSignup,eligible,reminderDue,TAG,createService}=require('../lib/car-funnel/core.cjs');
const time=Date.parse('2026-09-26T16:00:00Z');
const c={...config({}),location:'location',key:'test-secret-32-characters-at-least-long',announcement:'2026-09-28T16:00:00Z',signupOpen:true,mode:'test',testEmail:'owner@example.com',testPhone:'+15745551234'};
const contact={id:'contact123456',locationId:'location',name:'Owner',email:c.testEmail,phone:c.testPhone,tags:[TAG.subscriber,TAG.consent,TAG.test]};
test('encrypted link has no raw contact ID; expiry and tampering rejected',()=>{const token=makeToken(contact.id,c,time);assert(!token.includes(contact.id));assert.equal(readToken(token,c,time),contact.id);assert.throws(()=>readToken(token.slice(0,40)+'zz'+token.slice(42),c,time));assert.throws(()=>readToken(token,c,time+121*86400000));});
test('required consent and phone validated; mobile normalized',()=>{assert.equal(validateSignup({name:'Owner',email:'OWNER@EXAMPLE.COM',phone:'574-555-1234',consent:true}).phone,c.testPhone);assert.throws(()=>validateSignup({name:'Owner',email:c.testEmail,phone:'555',consent:true}));assert.throws(()=>validateSignup({name:'Owner',email:c.testEmail,phone:c.testPhone,consent:false}));});
test('48/24 reminder windows are absolute dates, not signup delays',()=>{assert(reminderDue(c,48,time));assert(!reminderDue(c,24,time));assert(reminderDue(c,24,time+86400000));assert(!reminderDue(c,48,time+86400000));assert(!reminderDue(c,24,time+2*86400000));});
test('confirmed subscribers get gallery delivery but no entry reminders',()=>{const p={...contact,tags:[...contact.tags,TAG.confirmed]};assert(!eligible(p,c,'reminder48',time));assert(eligible(p,c,'gallery',time));});
test('test mode excludes everyone except exact approved email and phone',()=>{assert(eligible(contact,c,'welcome',time));assert(!eligible({...contact,email:'other@example.com'},c,'welcome',time));assert(!eligible({...contact,phone:'+15745551235'},c,'welcome',time));assert(!eligible(contact,{...c,mode:'off'},'welcome',time));});
function mock(initial=contact){let p=structuredClone(initial),messages=[],notes=[],fail=false;const api=async(path,method,body)=>{if(path===`/contacts/${p.id}`)return {contact:structuredClone(p)};if(path.endsWith('/tags')){p.tags=[...new Set([...p.tags,...body.tags])];return {tags:p.tags};}if(path.endsWith('/notes')){notes.push(body);return {id:'note'};}if(path==='/conversations/messages'){messages.push(body);if(fail)throw Error('ambiguous timeout');return {messageId:'msg123'};}throw Error('Unexpected API request '+path);};return {api,get:()=>p,messages,notes,setFail:()=>fail=true};}
test('status never enters a contact; confirm persists once and repeats safely',async()=>{const m=mock(),s=createService(c,m.api,()=>time),t=makeToken(contact.id,c,time);assert.equal((await s.status(t)).confirmed,false);assert(!m.get().tags.includes(TAG.confirmed));assert.equal((await s.confirm(t)).confirmed,true);assert.equal((await s.confirm(t)).already,true);assert.equal(m.notes.length,1);});
test('closed campaign rejects new confirmation while preserving prior entries',async()=>{const m=mock(),s=createService(c,m.api,()=>time+3*86400000);await assert.rejects(()=>s.confirm(makeToken(contact.id,c,time)),/closed/);assert(!m.get().tags.includes(TAG.confirmed));});
test('DND blocks welcome message',async()=>{const m=mock({...contact,dnd:true}),s=createService(c,m.api,()=>time);await s.sendOnce(contact.id,'welcome','SMS');assert.equal(m.messages.length,0);});
test('confirmation immediately before reminder blocks send',async()=>{const m=mock(),s=createService(c,m.api,()=>time);await s.confirm(makeToken(contact.id,c,time));await s.sendOnce(contact.id,'reminder48','SMS');assert.equal(m.messages.length,0);});
test('ordinary reminder retries and uncertain provider failures do not duplicate texts',async()=>{const m=mock(),s=createService(c,m.api,()=>time);m.setFail();assert((await s.sendOnce(contact.id,'reminder48','SMS')).review);assert((await s.sendOnce(contact.id,'reminder48','SMS')).skipped);assert.equal(m.messages.length,1);});
test('gallery is withheld until photo release switch is on',async()=>{const m=mock(),s=createService(c,m.api,()=>time);assert((await s.sendOnce(contact.id,'gallery','SMS')).skipped);assert.equal(m.messages.length,0);});
test('repeated welcome sends are suppressed',async()=>{const m=mock(),s=createService(c,m.api,()=>time);assert((await s.sendOnce(contact.id,'welcome','SMS')).sent);assert((await s.sendOnce(contact.id,'welcome','SMS')).skipped);assert.equal(m.messages.length,1);assert.match(m.messages[0].message,/780/);});
test('signup saves membership and redirects; repeat signup does not create a second contact',async()=>{
 let p=null,created=0,notes=0;
 const api=async(path,method,body)=>{
  if(path.startsWith('/contacts/search/duplicate'))return {contact:p&&structuredClone(p)};
  if(path==='/contacts/'){assert(body.tags.includes('car people'));created++;p={...body,id:'newcontact12345'};return {contact:structuredClone(p)};}
  if(path==='/contacts/newcontact12345')return {contact:structuredClone(p)};
  if(path.endsWith('/notes')){notes++;return {id:'note'};}
  if(path.endsWith('/tags')){p.tags=[...new Set([...p.tags,...body.tags])];return {tags:p.tags};}
  throw Error('Unexpected request '+path);
 };
 const s=createService({...c,mode:'off'},api,()=>time);
 const input={name:'Owner',email:c.testEmail,phone:c.testPhone,consent:true};
 const result=await s.signup(input);assert(result.ok);assert(result.redirect.startsWith('https://www.markandrewboudoir.com/car-show/#entry='));assert(p.tags.includes(TAG.subscriber));assert(p.tags.includes(TAG.audience));assert(!p.tags.includes(TAG.confirmed));
 await s.signup(input);assert.equal(created,1);assert.equal(notes,1);
});
test('conflicting phone/email identities do not overwrite a contact',async()=>{
 let writes=0;const api=async(path,method)=>{if(method)writes++;return {contact:{...contact,id:path.includes('email=')?'contactEmail123':'contactPhone123'}};};
 const s=createService(c,api,()=>time);await assert.rejects(()=>s.signup({name:'Owner',email:c.testEmail,phone:c.testPhone,consent:true}),/quick check/);assert.equal(writes,0);
});
