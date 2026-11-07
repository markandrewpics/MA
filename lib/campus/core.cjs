const crypto=require('node:crypto');
const PREFIX='campus-signups/';
const CONSENT='By submitting, you agree that Mark Andrew Photography may text you about your pictures and interview. No marketing signup. Message and data rates may apply.';
class PublicError extends Error{constructor(message,status=400){super(message);this.status=status;}}
function validate(b){
 if(!b||typeof b!=='object'||b.website)throw new PublicError('Please check your details.');
 const name=typeof b.name==='string'?b.name.trim().replace(/\s+/g,' '):'';
 if(!name||name.length>100||/[\x00-\x1f]/.test(name))throw new PublicError('Please enter your name.');
 const raw=typeof b.phone==='string'?b.phone:'';const digits=raw.replace(/\D/g,'');
 const phone=digits.length===10?'1'+digits:digits;
 if(raw.length>40||!/^1[2-9]\d{2}[2-9]\d{6}$/.test(phone))throw new PublicError('Please enter a valid 10-digit US phone number.');
 if(b.consent!==true)throw new PublicError('Please reload the page and submit again.');
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(b.id||''))throw new PublicError('Please reload the page and try again.');
 return {id:b.id,name,phone:'+'+phone,createdAt:new Date().toISOString(),source:'/campus/',permission:CONSENT};
}
function equal(a,b){return typeof a==='string'&&typeof b==='string'&&a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));}
module.exports={PREFIX,CONSENT,PublicError,validate,equal};
