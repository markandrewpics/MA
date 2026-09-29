'use strict';
const crypto=require('node:crypto');
const sharp=require('sharp');
const PREFIX='photo-critiques/';
const CONSENT="2026-09-29-v2";
const RIGHTS="I am at least 18 years old. I took these photographs and own the copyright or have authority from the copyright owner to grant the permissions below. I have permission from any recognizable people, including a parent or legal guardian for minors, for the public use and editing described below.";
const PERMISSION="I give Mark Boughton (Mark Andrew / markandrew.ai) a nonexclusive, worldwide, royalty-free license to reproduce, display, discuss and publish my submitted photographs, including edited versions, in public YouTube videos (including monetized videos), YouTube Shorts and related social media clips, thumbnails and posts promoting this critique series. I understand my photos may be seen and shared publicly, and my name and Instagram handle or website may be shown for credit. I authorize these uses without further approval or payment to me. I keep ownership of my photographs. Submission does not guarantee a feature or private feedback.";
const EDITING="I authorize Mark to edit copies of my photographs to demonstrate his critique and suggested improvements. This includes alternative crops and compositions; adjustments to color, toning, white balance, exposure, contrast and other image settings; object or distraction removal; retouching; and annotations. He may show the original and edited versions, including before-and-after comparisons, in the public content described above. These edits are teaching examples and may differ from my original creative choices.";
class PublicError extends Error{constructor(message,status=400){super(message);this.status=status;}}
function secret(){const s=process.env.CRITIQUE_ADMIN_SECRET||process.env.PHOTO_ADMIN_SECRET;if(!s||s.length<32)throw new PublicError('Submissions are temporarily unavailable. Please try again later.',503);return s;}
function mac(s){return crypto.createHmac('sha256',secret()).update('photo-critiques:'+s).digest('base64url');}
function adminCode(){return mac('review-access-v1').slice(0,28);}
function equal(a,b){return typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));}
function session(){const expires=String(Date.now()+8*3600000);return expires+'.'+mac('session:'+expires);}
function isAdmin(req){const v=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('critique_session='))?.slice(17);if(!v)return false;const [exp,sig]=v.split('.');return /^\d+$/.test(exp)&&Number(exp)>Date.now()&&Number(exp)<Date.now()+9*3600000&&equal(sig,mac('session:'+exp));}
function validate(b){
 if(!b||typeof b!=='object'||b.company)throw new PublicError('Please check your submission.');
 const text=(key,max,required=false)=>{const v=typeof b[key]==='string'?b[key].trim():'';if(v.length>max||(required&&!v))throw new PublicError('Please check '+key+'.');return v;};
 const name=text('name',100,true),email=text('email',254,true).toLowerCase(),instagram=text('instagram',100),website=text('website',300),feedback=text('feedback',2000);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new PublicError('Please enter a valid email address.');
 if(!instagram&&!website)throw new PublicError('Add your Instagram handle or website.');
 let handle=instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//i,'').replace(/^@/,'').replace(/\/$/,'');
 if(handle&&!/^[a-zA-Z0-9._]{1,30}$/.test(handle))throw new PublicError('Please enter your Instagram handle, such as @yourname.');
 let site='';if(website){try{const u=new URL(/^https?:\/\//i.test(website)?website:'https://'+website);if(!['https:','http:'].includes(u.protocol)||!u.hostname.includes('.')||u.username||u.password)throw Error();site=u.href;}catch{throw new PublicError('Please enter a valid website address.');}}
 if(b.consentVersion!==CONSENT)throw new PublicError('The permission wording has changed. Please reload this page, review the current permissions, and submit again.');
 if(b.rights!==true||b.permission!==true||b.editing!==true)throw new PublicError('Please check all three permission boxes.');
 if(!Array.isArray(b.images)||b.images.length<1||b.images.length>3)throw new PublicError('Please choose one to three photographs.');
 if(!/^[a-f0-9-]{36}$/.test(b.submissionId||''))throw new PublicError('Please refresh and try again.');
 return {id:b.submissionId,name,email,instagram:handle?'@'+handle:'',website:site,feedback,consent:{version:CONSENT,rights:RIGHTS,permission:PERMISSION,editing:EDITING,acknowledgements:{rights:true,permission:true,editing:true},acceptedAt:new Date().toISOString()},status:'New',createdAt:new Date().toISOString()};
}
async function imageBytes(item){
 if(!item||typeof item.data!=='string'||item.data.length>1200000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(item.data))throw new PublicError('Choose JPG, PNG, or WebP photographs.');
 try{const input=Buffer.from(item.data.split(',')[1],'base64');const pipeline=sharp(input,{limitInputPixels:30000000,failOn:'error'});const meta=await pipeline.metadata();if(!['jpeg','png','webp'].includes(meta.format)||meta.pages>1)throw Error();return await pipeline.rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).jpeg({quality:90}).toBuffer();}catch{throw new PublicError('One photograph could not be read. Please export it as a JPG and try again.');}
}
function createStore(blob){return {
 async read(path){const r=await blob.get(PREFIX+path,{access:'private',useCache:false});if(!r||r.statusCode!==200)return null;return JSON.parse(await new Response(r.stream).text());},
 async write(path,value,overwrite=false){return blob.put(PREFIX+path,JSON.stringify(value),{access:'private',addRandomSuffix:false,allowOverwrite:overwrite,contentType:'application/json',cacheControlMaxAge:60});},
 async image(path,bytes){return blob.put(PREFIX+path,bytes,{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'image/jpeg',cacheControlMaxAge:60});},
 async list(cursor){return blob.list({prefix:PREFIX+'records/',limit:12,cursor:cursor||undefined});},
 async getImage(path){return blob.get(PREFIX+path,{access:'private',useCache:false});},
 };}
module.exports={PREFIX,CONSENT,RIGHTS,PERMISSION,EDITING,PublicError,adminCode,equal,session,isAdmin,validate,imageBytes,createStore,mac};
