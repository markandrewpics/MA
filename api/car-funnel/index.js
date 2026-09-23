const {config,createApi,createService,PublicError,BASE} = require('../../lib/car-funnel/core.cjs');
module.exports=async (req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Use POST.'});}
 const c=config();
 if(!c.token||!c.key)return res.status(503).json({error:'Please try again shortly. Mark is connecting the photo signup.'});
 let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;if(!body||JSON.stringify(body).length>8192)throw Error();}catch{return res.status(400).json({error:'Please check your details.'});}
 const service=createService(c,createApi(c));
 try{
  if(body.action==='run'){
   const auth=req.headers.authorization||'';
   if(!c.admin||auth!==`Bearer ${c.admin}`)return res.status(401).json({error:'Unauthorized'});
   return res.status(200).json(await service.run(body.kind,body.page||1));
  }
  const origin=req.headers.origin;
  if(![BASE,'https://markandrewboudoir.com'].includes(origin))return res.status(403).json({error:'Please use the photo signup page.'});
  let result;
  if(body.action==='signup')result=await service.signup(body);
  else if(body.action==='status')result=await service.status(body.token);
  else if(body.action==='confirm')result=await service.confirm(body.token);
  else throw new PublicError('Unknown action');
  res.status(200).json(result);
 }catch(e){res.status(e instanceof PublicError?e.status:503).json({error:e instanceof PublicError?e.message:'We couldn’t finish that just now. Please try again or ask Mark for help.'});}
};
