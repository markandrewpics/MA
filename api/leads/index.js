const auth=require('../../lib/leads/auth.cjs');
const attempts=new Map();
function limited(ip){const now=Date.now();for(const[k,v]of attempts)if(v.until<now)attempts.delete(k);const record=attempts.get(ip)||{count:0,until:now+900000};record.count++;attempts.set(ip,record);return record.count>5;}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('Vary','Cookie');
 if(!auth.allowedHost(req))return res.status(404).json({error:'Not found.'});
 const c=auth.config();
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed.'});
 const action=req.method==='GET'?req.query?.action:req.body?.action;
 if(req.method==='POST'&&(!auth.sameOrigin(req)||!String(req.headers['content-type']||'').startsWith('application/json')))return res.status(403).json({error:'Please use the secure lead desk.'});
 if(req.method==='POST'&&(!req.body||Buffer.byteLength(JSON.stringify(req.body))>8192))return res.status(413).json({error:'Request too large.'});
 if(action==='health')return res.status(200).json({configured:!!c,live:false});
 if(!c)return res.status(503).json({error:'Private access is not configured yet. Lead data and GoHighLevel syncing are unavailable.'});
 try{
  if(action==='login'&&req.method==='POST'){
   const ip=String(req.headers['x-forwarded-for']||'unknown').split(',')[0].trim();
   if(limited(ip))return res.status(429).json({error:'Too many attempts. Try again later.'});
   if(!await auth.checkCode(req.body.code,c))return res.status(401).json({error:'Access code not recognized.'});
   res.setHeader('Set-Cookie',auth.cookie(auth.session(c)));return res.status(200).json({ok:true,live:false});
  }
  if(action==='logout'&&req.method==='POST'){res.setHeader('Set-Cookie',auth.cookie('',0));return res.status(200).json({ok:true});}
  if(!auth.authorized(req,c))return res.status(401).json({error:'Sign in to open the lead desk.'});
  if(action==='session')return res.status(200).json({ok:true,live:false,timezone:'America/Indiana/Indianapolis'});
  if(action==='faq'){
   const items=JSON.parse(process.env.LEADS_FAQ_JSON||'[]');
   if(!Array.isArray(items)||!items.every(x=>typeof x.question==='string'&&typeof x.answer==='string'&&typeof x.category==='string'&&typeof x.needsConfirmation==='boolean'))return res.status(503).json({error:'The calling reference is unavailable.'});
   return res.status(200).json({items,notice:'Staff reference draft. Confirm campaign and session-specific terms. This is not a contract.'});
  }
  if(action==='leads')return res.status(200).json({leads:[],live:false,notice:'GoHighLevel is not connected. No live leads are loaded.'});
  return res.status(503).json({error:'Live changes are disabled until the connection and permissions are verified. Nothing was saved to GoHighLevel.'});
 }catch{return res.status(503).json({error:'The request could not be completed. Nothing is confirmed as saved.'});}
};
