import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,validate} from '../server.mjs';
import {deliver} from '../mail.mjs';
import {Readable} from 'node:stream';
const valid={name:'Camille Exemple',email:'camille@example.com',project:'Textiles de badminton',quantity:'1',personalization:'CAMILLE',message:'Un t-shirt vert taille M.',consent:'on'};
test('validation des champs et du piège anti-spam',()=>{
 assert.ok(validate(valid));
 for(const patch of [{email:'invalid'},{quantity:'0'},{quantity:'2.5'},{consent:''},{message:'   '},{name:[]},{project:'unknown'},{website:'spam'}])assert.equal(validate({...valid,...patch}),false);
});
test('FormSubmit : destination privée, personnalisation et réponse positive',async()=>{
 let sent;await deliver(valid,async(url,options)=>{assert.ok(url.startsWith('https://formsubmit.co/ajax/'));sent=JSON.parse(options.body);return {ok:true,json:async()=>({success:'true'})};});
 assert.equal(sent.personalization,'CAMILLE');assert.equal(sent.quantity,'1');assert.equal(sent._template,'table');
});
test('FormSubmit : un HTTP 200 avec success false est un échec',async()=>{
 await assert.rejects(deliver(valid,async()=>({ok:true,json:async()=>({success:'false'})})));
 await assert.rejects(deliver(valid,async()=>({ok:false})));
});
// Exercise the actual request handler with streams, without opening a network port.
async function request(server,url,options={}){
 const req=Readable.from(options.body?[Buffer.from(options.body)]:[]);
 req.url=url;req.method=options.method||'GET';req.headers=Object.fromEntries(Object.entries(options.headers||{}).map(([k,v])=>[k.toLowerCase(),v]));req.headers.host='localhost';req.socket={remoteAddress:'127.0.0.1'};
 return new Promise(resolve=>{
  const res={headers:{},status:200,setHeader(k,v){this.headers[k]=v;},writeHead(status,headers){this.status=status;Object.assign(this.headers,headers);},end(body){resolve({status:this.status,body:body?.toString()||'',headers:this.headers});}};
  server.emit('request',req,res);
 });
}
const post=data=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
test('requêtes : données filtrées et limite d’envoi',async()=>{
 let sent;const server=createServer({sender:async data=>{sent=data;}});
 assert.equal((await request(server,'/api/contact',post({...valid,_cc:'attacker@example.com'}))).status,200);
 assert.equal(sent._cc,undefined);assert.equal(sent.personalization,'CAMILLE');
 assert.equal((await request(server,'/api/contact',post({...valid,consent:''}))).status,400);
 for(let i=0;i<3;i++)await request(server,'/api/contact',post(valid));
 assert.equal((await request(server,'/api/contact',post(valid))).status,429);
});
test('requêtes : destination inaccessible et erreur fournisseur masquée',async()=>{
 const server=createServer({sender:async()=>{throw new Error('private destination');}});
 const response=await request(server,'/api/contact',post(valid));assert.equal(response.status,502);assert.ok(!response.body.includes('private destination'));
 assert.equal((await request(server,'/contact_config.json')).status,404);
 assert.equal((await request(server,'/api/contact',{...post(valid),headers:{'Content-Type':'application/json','Origin':'https://attacker.example'}})).status,403);
});
