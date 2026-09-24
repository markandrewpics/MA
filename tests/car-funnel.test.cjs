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
function mock(initial=contact){let p=structuredClone(initial),messages=[],notes=[],fail=false;const api=async(path,method,body)=>{if(path===`/contacts/${p.id}`)return {contact:structuredClone(p)};if(path.endsWith('/tags')){p.tags=[...new Set([...p.tags,...body.tags])];return {tags:p.tags};}if(path.endsWith('/notes')){notes.push(body);return {id:'note'};}if(path==='/links/'){return {link:{fieldKey:'{{trigger_link.testShortLink123}}'}};}if(path==='/conversations/messages'){messages.push(body);if(fail)throw Error('ambiguous timeout');return {messageId:'msg123'};}throw Error('Unexpected API request '+path);};return {api,get:()=>p,messages,notes,setFail:()=>fail=true};}
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
 const s=createService(c,api,()=>time);await assert.rejects(()=>s.signup({name:'Owner',email:c.testEmail,phone:c.testPhone,consent:true}),/do not match the same saved contact/);assert.equal(writes,0);
});

for(const field of ['email','phone'])test(`changed ${field} gives specific guidance without changing the saved contact`,async()=>{
 let writes=0;
 const old={...contact,[field]:field==='email'?'previous@example.com':'+15745559876'};
 const api=async(path,method)=>{if(method)writes++;return {contact:old};};
 const s=createService({...c,mode:'off'},api,()=>time);
 await assert.rejects(()=>s.signup({name:'Owner',email:c.testEmail,phone:c.testPhone,consent:true}),field==='email'?/email address you used before/:/mobile number you used before/);
 assert.equal(writes,0);
});

test('SMS uses a GHL trigger link that retains the personal entry destination',async()=>{
 const m=mock();let destination;const api=async(path,method,body)=>{
  if(path==='/links/'){destination=body.redirectTo;return {link:{fieldKey:'{{trigger_link.short123}}'}};}
  return m.api(path,method,body);
 };
 const s=createService(c,api,()=>time);assert((await s.sendOnce(contact.id,'welcome','SMS')).sent);
 assert.equal(readToken(destination.split('#entry=')[1],c),contact.id);
 assert(m.messages[0].message.includes('{{trigger_link.short123}}'));
 assert(!m.messages[0].message.includes('#entry='));
 assert(!m.get().tags.includes(TAG.confirmed));
});
test('a short-link failure sends no broken SMS and marks it for review',async()=>{
 const m=mock();const api=async(path,method,body)=>{if(path==='/links/')throw Error('Unavailable');return m.api(path,method,body);};
 assert((await createService(c,api,()=>time).sendOnce(contact.id,'welcome','SMS')).review);
 assert.equal(m.messages.length,0);
});

for(const hours of [48,24])test(`${hours}-hour batch sends SMS and email once to unconfirmed subscribers`,async()=>{
 const m=mock();const api=async(path,method,body)=>path==='/contacts/search'?{contacts:[m.get()],total:1}:m.api(path,method,body);
 const s=createService(c,api,()=>time+(48-hours)*3600000);
 assert.equal((await s.run(`reminder${hours}`)).sent,2);
 assert.deepEqual(m.messages.map(p=>p.type),['SMS','Email']);
 assert.match(m.messages[1].subject,new RegExp(`${hours} hours left`));
 assert.equal((await s.run(`reminder${hours}`)).sent,0);
 assert.equal(m.messages.length,2);
});
test('confirmation between the 48-hour and 24-hour batches stops both later channels',async()=>{
 const m=mock();const api=async(path,method,body)=>path==='/contacts/search'?{contacts:[m.get()],total:1}:m.api(path,method,body);
 let now=time;const s=createService(c,api,()=>now);
 assert.equal((await s.run('reminder48')).sent,2);
 await s.confirm(makeToken(contact.id,c,time));now+=86400000;
 assert.equal((await s.run('reminder24')).sent,0);
 assert.equal(m.messages.length,2);
});
test('confirmation after reminder SMS blocks the email in that same batch',async()=>{
 const m=mock();const api=async(path,method,body)=>{
  if(path==='/contacts/search')return {contacts:[m.get()],total:1};
  const r=await m.api(path,method,body);
  if(path==='/conversations/messages'&&body.type==='SMS')m.get().tags.push(TAG.confirmed);
  return r;
 };
 const s=createService(c,api,()=>time);assert.equal((await s.run('reminder48')).sent,1);
 assert.deepEqual(m.messages.map(p=>p.type),['SMS']);
});
test('native workflow handoff saves verified links before enrollment and never sends directly',async()=>{
 let p=structuredClone(contact),readyBeforeLinks=false,messages=0;
 const api=async(path,method,body)=>{
  if(path.startsWith('/contacts/search/duplicate'))return {contact:structuredClone(p)};
  if(path===`/contacts/${p.id}`){if(method==='PUT')p.customFields=body.customFields.map(f=>({id:f.id,value:f.field_value}));return {contact:structuredClone(p)};}
  if(path.endsWith('/tags')){if(body.tags.includes(TAG.nativeReady))readyBeforeLinks=!p.customFields?.length;p.tags=[...new Set([...p.tags,...body.tags])];return {};}
  if(path==='/conversations/messages')messages++;
  throw Error('Unexpected request '+path);
 };
 const service=createService({...c,nativeWorkflow:true},api,()=>time);
 const result=await service.signup({name:'Owner',email:c.testEmail,phone:c.testPhone,consent:true});
 assert(result.ok);assert(p.tags.includes(TAG.nativeReady));assert.equal(readyBeforeLinks,false);assert.equal(messages,0);
 assert.equal((await service.run('reminder48')).skipped,'native-ghl-workflow');
 assert((await service.sendOnce(p.id,'welcome','SMS')).skipped);
});

test('native workflow never enrolls when personalized links fail readback',async()=>{
 const p=structuredClone(contact);let enrolled=false;
 const api=async(path,method,body)=>{
  if(path.startsWith('/contacts/search/duplicate')||path===`/contacts/${p.id}`)return {contact:structuredClone(p)};
  if(path.endsWith('/tags')){if(body.tags.includes(TAG.nativeReady))enrolled=true;p.tags=[...new Set([...p.tags,...body.tags])];return {};}
  throw Error('Unexpected request '+path);
 };
 const service=createService({...c,nativeWorkflow:true},api,()=>time);
 await assert.rejects(()=>service.signup({name:'Owner',email:c.testEmail,phone:c.testPhone,consent:true}),/Personal links not saved/);
 assert.equal(enrolled,false);
});
