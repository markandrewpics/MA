const {PREFIX,PublicError,validate,equal}=require('../../lib/campus/core.cjs');
const recent=new Map();
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag','noindex, nofollow');
 try{
 const ready=!!(process.env.BLOB_READ_WRITE_TOKEN||process.env.BLOB_STORE_ID);
 if(req.method==='GET'&&req.query?.action==='health')return res.status(200).json({ready});
 if(!ready)throw new PublicError('Signup is temporarily unavailable. Please ask Mark for help.',503);
 const blob=await import('@vercel/blob');
 const authCore=require('../../lib/photo-critiques/core.cjs');
 async function access(){const r=await blob.get('photo-critiques/auth/review.json',{access:'private',useCache:false});return r?.statusCode===200?JSON.parse(await new Response(r.stream).text()):null;}
 async function owner(){const secret=process.env.PHOTO_ADMIN_SECRET;if(secret&&equal(req.headers.authorization,'Bearer '+secret))return true;const a=await access();return authCore.isAdmin({headers:{cookie:(req.headers.cookie||'').replace(/campus_session=/g,'critique_session=')}},a?.version);}

 if(req.method==='GET'){
  if(!await owner())throw new PublicError('Please sign in to view signups.',401);
  const page=await blob.list({prefix:PREFIX+'records/',limit:100,cursor:req.query?.cursor||undefined});
  const records=await Promise.all(page.blobs.map(async b=>{const r=await blob.get(b.pathname,{access:'private',useCache:false});return r?.statusCode===200?JSON.parse(await new Response(r.stream).text()):null;}));
  return res.status(200).json({records:records.filter(r=>r&&!(r.name==='SYSTEM TEST — not a visitor'&&r.phone==='+12025550198')),cursor:page.hasMore?page.cursor:null});
 }
 if(req.method!=='POST'){res.setHeader('Allow','POST');throw new PublicError('Use POST.',405);}
 if(!['https://www.markandrewboudoir.com','https://markandrewboudoir.com'].includes(req.headers.origin))throw new PublicError('Please use the signup page.',403);
 if(!String(req.headers['content-type']).startsWith('application/json'))throw new PublicError('Please reload the page.',415);
 if(!req.body||Buffer.byteLength(JSON.stringify(req.body))>2048)throw new PublicError('Please check your details.',413);
 if(req.body.action==='login'){
  const key='login:'+req.headers['x-forwarded-for'],now=Date.now();const r=recent.get(key)||{count:0,until:now+900000};if(r.until<now){r.count=0;r.until=now+900000;}if(++r.count>10)throw new PublicError('Please wait 15 minutes before trying again.',429);recent.set(key,r);
  const a=await access();if(!await authCore.checkAccess(req.body.code,a))throw new PublicError('That access code is not correct.',401);
  res.setHeader('Set-Cookie',`campus_session=${authCore.session(a?.version)}; HttpOnly; Secure; SameSite=Strict; Path=/api/campus; Max-Age=28800`);return res.status(200).json({ok:true});
 }
 if(req.body.action==='logout'){res.setHeader('Set-Cookie','campus_session=; HttpOnly; Secure; SameSite=Strict; Path=/api/campus; Max-Age=0');return res.status(200).json({ok:true});}
 const record=validate(req.body);
 const ip=String(req.headers['x-forwarded-for']||'').split(',')[0];const now=Date.now();
 for(const [key,value]of recent)if(value.until<now)recent.delete(key);
 const rate=recent.get(ip)||{count:0,until:now+60000};if(++rate.count>20)throw new PublicError('Please wait a minute and try again.',429);recent.set(ip,rate);
 const path=PREFIX+'records/'+record.id+'.json';
 // Idempotent retry, no CRM enrollment, no automatic messages, no public contact data.
 try{await blob.put(path,JSON.stringify(record),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json',cacheControlMaxAge:60});}catch(e){const prior=await blob.get(path,{access:'private',useCache:false});if(prior?.statusCode!==200)throw e;const saved=JSON.parse(await new Response(prior.stream).text());if(saved.name!==record.name||saved.phone!==record.phone)throw new PublicError('Please reload the page and submit again.',409);}
 const check=await blob.get(path,{access:'private',useCache:false});
 if(check?.statusCode!==200)throw Error('Save not verified');
 const saved=JSON.parse(await new Response(check.stream).text());if(saved.name!==record.name||saved.phone!==record.phone)throw Error('Save not verified');
 return res.status(200).json({ok:true});
 }catch(e){return res.status(e instanceof PublicError?e.status:503).json({error:e instanceof PublicError?e.message:'Your details have not been confirmed as saved. Please try again or ask Mark for help.'});}
};
