const crypto=require('node:crypto');
const {promisify}=require('node:util');
const scrypt=promisify(crypto.scrypt);
const COOKIE='lead_desk_session';
const HOST='markandrew.ai';
function config(env=process.env){
 const {LEADS_SESSION_SECRET:secret,LEADS_ACCESS_SALT:salt,LEADS_ACCESS_HASH:hash}=env;
 return typeof secret==='string'&&secret.length>=48&&/^[a-f0-9]{32,128}$/i.test(salt||'')&&/^[a-f0-9]{128}$/i.test(hash||'')?{secret,salt,hash}:null;
}
function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;return crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));}
async function checkCode(code,c){if(!c||typeof code!=='string'||code.length<16||code.length>200)return false;return equal((await scrypt(code,c.salt,64)).toString('hex'),c.hash);}
function sign(value,c){return crypto.createHmac('sha256',c.secret).update(value).digest('base64url');}
function session(c,now=Date.now()){const exp=now+8*3600000;const data=`${exp}.${crypto.randomBytes(24).toString('base64url')}`;return `${data}.${sign(data,c)}`;}
function authorized(req,c,now=Date.now()){
 if(!c)return false;const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!raw)return false;
 const [exp,nonce,sig,...extra]=raw.split('.');if(extra.length||!/^\d{13}$/.test(exp)||!/^[-_A-Za-z0-9]{32}$/.test(nonce)||!sig)return false;
 return Number(exp)>now&&Number(exp)<=now+8*3600000&&equal(sig,sign(`${exp}.${nonce}`,c));
}
function sameOrigin(req){return req.headers.origin===`https://${HOST}`;}
function allowedHost(req){return String(req.headers.host||'').toLowerCase()===HOST;}
function cookie(value,max=28800){return `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/api/leads; Max-Age=${max}`;}
module.exports={config,checkCode,session,authorized,sameOrigin,allowedHost,cookie};
