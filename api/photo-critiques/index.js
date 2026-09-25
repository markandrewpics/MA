const core=require('../../lib/photo-critiques/core.cjs');
const {Readable}=require('node:stream');
const recent=new Map();
function throttle(key,max,window){const now=Date.now();for(const[k,v]of recent)if(v.expires<now)recent.delete(k);const r=recent.get(key)||{count:0,expires:now+window};if(++r.count>max)throw new core.PublicError('Too many attempts. Please try again later.',429);recent.set(key,r);}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag','noindex, nofollow');
 try{
  const blob=await import('@vercel/blob');const store=core.createStore(blob);
  const query=req.query||{};const action=req.method==='GET'?query.action:(req.body?.action);
  if(req.method==='GET'&&action==='health')return res.status(200).json({ready:!!((process.env.BLOB_READ_WRITE_TOKEN||process.env.BLOB_STORE_ID)&&(process.env.CRITIQUE_ADMIN_SECRET||process.env.PHOTO_ADMIN_SECRET))});
  if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Use GET or POST.'});
  if(req.method==='POST'){
   const origins=(process.env.CRITIQUE_ALLOWED_ORIGINS||'https://www.markandrewboudoir.com,https://markandrewboudoir.com').split(',');
   if(!origins.includes(req.headers.origin))throw new core.PublicError('Please use the submission page.',403);
   if(!String(req.headers['content-type']).startsWith('application/json'))throw new core.PublicError('Please reload the page.',415);
   if(!req.body||Buffer.byteLength(JSON.stringify(req.body))>3800000)throw new core.PublicError('These files are too large. Please choose smaller photographs.',413);
  }
  if(action==='login'){
   throttle('login:'+req.headers['x-forwarded-for'],10,15*60000);
   if(!core.equal(req.body.code,core.adminCode()))throw new core.PublicError('That access code is not correct.',401);
   res.setHeader('Set-Cookie',`critique_session=${core.session()}; HttpOnly; Secure; SameSite=Strict; Path=/api/photo-critiques; Max-Age=28800`);
   return res.status(200).json({ok:true});
  }
  if(action==='logout') {res.setHeader('Set-Cookie','critique_session=; HttpOnly; Secure; SameSite=Strict; Path=/api/photo-critiques; Max-Age=0');return res.status(200).json({ok:true});}
  if(action==='submit'){
   const record=core.validate(req.body);
   core.adminCode();
   if(!(process.env.BLOB_READ_WRITE_TOKEN||process.env.BLOB_STORE_ID))throw new core.PublicError('Submissions are temporarily unavailable. Please try again later.',503);
   const existing=await store.read('records/'+record.id+'.json');
   if(existing)return res.status(200).json({ok:true,reference:record.id});
   // Persistent email/hour claim also limits abuse across function instances; no raw email in the key.
   const rateKey='limits/'+core.mac(record.email+':'+Math.floor(Date.now()/3600000))+'.json';
   const claim=await store.read(rateKey);
   if(claim&&claim.id!==record.id)throw new core.PublicError('You have already submitted this hour. Please try again later.',429);
   throttle('submit:'+req.headers['x-forwarded-for'],8,3600000);
   const images=await Promise.all(req.body.images.map(core.imageBytes));
   if(!claim){try{await store.write(rateKey,{id:record.id});}catch(e){if(e.name==='BlobAlreadyExistsError')throw new core.PublicError('Please try again later.',429);throw e;}}
   record.images=[];
   for(let i=0;i<images.length;i++){const path='images/'+record.id+'/'+i+'.jpg';await store.image(path,images[i]);record.images.push({path,name:'photo-'+(i+1)+'.jpg'});}
   try{await store.write('records/'+record.id+'.json',record);}catch(e){if(e.name!=='BlobAlreadyExistsError')throw e;}
   return res.status(200).json({ok:true,reference:record.id});
  }
  if(!core.isAdmin(req))throw new core.PublicError('Please sign in to review submissions.',401);
  if(action==='list'){
   const page=await store.list(typeof query.cursor==='string'?query.cursor.slice(0,2000):undefined);
   const records=await Promise.all(page.blobs.map(b=>store.read(b.pathname.slice(core.PREFIX.length))));
   return res.status(200).json({records:records.filter(Boolean),cursor:page.hasMore?page.cursor:null});
  }
  if(action==='image'){
   if(typeof query.path!=='string'||!/^images\/[a-f0-9-]{36}\/[0-2]\.jpg$/.test(query.path))throw new core.PublicError('Photo not found.',404);
   const r=await store.getImage(query.path);if(!r||r.statusCode!==200)throw new core.PublicError('Photo not found.',404);
   res.setHeader('Content-Type','image/jpeg');if(query.download==='1')res.setHeader('Content-Disposition','attachment; filename="critique-photo.jpg"');return Readable.fromWeb(r.stream).pipe(res);
  }
  if(action==='status'){
   const {id,status}=req.body;if(!/^[a-f0-9-]{36}$/.test(id)||!['New','Selected','Reviewed','Archived'].includes(status))throw new core.PublicError('Invalid update.');
   const record=await store.read('records/'+id+'.json');if(!record)throw new core.PublicError('Submission not found.',404);record.status=status;await store.write('records/'+id+'.json',record,true);return res.status(200).json({ok:true});
  }
  throw new core.PublicError('Unknown action.');
 }catch(e){return res.status(e instanceof core.PublicError?e.status:503).json({error:e instanceof core.PublicError?e.message:'We could not finish that just now. Your photos have not been confirmed as received. Please retry.'});}
};
