(function(root){
'use strict';
const encoder=new TextEncoder();
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function header(size){const bytes=new Uint8Array(size);return {bytes,view:new DataView(bytes.buffer)};}
function zip(files){
 const parts=[],directory=[];let offset=0,dirSize=0;
 for(const file of files){const name=encoder.encode(file.name),data=typeof file.data==='string'?encoder.encode(file.data):file.data,crc=crc32(data);
 if(offset+data.length>0xffffffff||files.length>65535)throw Error('This export is too large for one ZIP file.');
 const h=header(30),v=h.view;v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);
 parts.push(h.bytes,name,data);
 const c=header(46),w=c.view;w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x800,true);w.setUint16(14,33,true);w.setUint32(16,crc,true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);w.setUint16(28,name.length,true);w.setUint32(42,offset,true);directory.push(c.bytes,name);dirSize+=46+name.length;offset+=30+name.length+data.length;
 }
 const end=header(22),v=end.view;v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,dirSize,true);v.setUint32(16,offset,true);
 return new Blob([...parts,...directory,end.bytes],{type:'application/zip'});
}
async function collectPages(read){const records=[],seen=new Set(),cursors=new Set();let cursor;do{const page=await read(cursor);for(const r of page.records)if(!seen.has(r.id)){seen.add(r.id);records.push(r);}cursor=page.cursor;if(cursor&&cursors.has(cursor))throw Error('Could not load all submissions. Please try again.');cursors.add(cursor);}while(cursor);return records;}
async function build(records,readImage,progress){const files=[{name:'submissions.json',data:JSON.stringify(records,null,2)}];let completed=0;for(const r of records){const folder=(r.name.replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,70)||'photographer')+'-'+r.id;files.push({name:folder+'/details-and-permissions.txt',data:[r.name,r.email,r.instagram||'',r.website||'','Submitted: '+r.createdAt,'Status: '+r.status,'','Feedback requested:',r.feedback||'','', 'Recorded permissions (as submitted):',JSON.stringify(r.consent,null,2)].join('\n')});for(let i=0;i<r.images.length;i++)files.push({name:folder+'/photo-'+(i+1)+'.jpg',data:await readImage(r.images[i].path)});progress?.(++completed,records.length);}return zip(files);}
const api={zip,collectPages,build};if(typeof module!=='undefined')module.exports=api;else root.CritiqueExport=api;
})(typeof window==='undefined'?globalThis:window);
