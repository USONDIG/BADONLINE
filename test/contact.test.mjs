import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, validate } from '../server.mjs';
const valid = {name:'Club Test',email:'club@example.com',project:'Textiles de badminton',quantity:'30',message:'Une tenue verte pour notre club.',consent:'on'};
test('refuse les champs invalides et un consentement absent', () => {
 assert.ok(validate(valid));
 for (const patch of [{email:'invalid'},{quantity:'0'},{quantity:'2.5'},{quantity:'100001'},{consent:''},{message:'   '},{name:[]},{project:'unknown'}]) assert.equal(validate({...valid,...patch}),false);
});
async function setup(t, options) {const server=createServer(options); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));return `http://127.0.0.1:${server.address().port}`;}
const post = data => ({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
test('sans configuration, aucune fausse confirmation',async t=>{const base=await setup(t,{});assert.equal((await fetch(base+'/api/config').then(r=>r.json())).contactEnabled,false);assert.equal((await fetch(base+'/api/contact',post(valid))).status,503);assert.equal((await fetch(base)).status,200);assert.equal((await fetch(base+'/missing')).status,404);});
test('transmet seulement les champs attendus et limite les abus',async t=>{let sent;const base=await setup(t,{webhook:'https://example.com',fetcher:async(u,o)=>{sent=JSON.parse(o.body);return {ok:true};}});assert.equal((await fetch(base+'/api/contact',post({...valid,secret:'ignore'}))).status,200);assert.equal(sent.email,valid.email);assert.equal(sent.secret,undefined);assert.equal((await fetch(base+'/api/contact',post({...valid,consent:''}))).status,400);for(let i=0;i<3;i++)await fetch(base+'/api/contact',post(valid));assert.equal((await fetch(base+'/api/contact',post(valid))).status,429);});
test('un échec de réception ne devient pas un succès',async t=>{const base=await setup(t,{webhook:'https://example.com',fetcher:async()=>({ok:false})});assert.equal((await fetch(base+'/api/contact',post(valid))).status,502);});
