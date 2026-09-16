import { validateCreations } from './creation-validation.mjs';
import { readFileSync } from 'node:fs';
const config = JSON.parse(readFileSync(new URL('./contact_config.json',import.meta.url),'utf8'));
export async function deliver(data, fetcher=fetch) {
  const recipient=process.env.FORMSUBMIT_RECIPIENT || config.recipient;
  const {summary,attachments}=validateCreations(data.creations ?? []);
  const fields=Object.fromEntries(['name','email','phone','personalization','project','quantity','message','consent'].map(key=>[key,data[key] || '']));
  const payload={...fields,creations_summary:summary,_subject:'BADONLINE — Nouvelle demande de personnalisation',_template:'table',_captcha:'false',_url:process.env.SITE_URL || config.site_url};
  let body=JSON.stringify(payload),headers={'Content-Type':'application/json','Accept':'application/json'};
  if(attachments.length){
    const form=new FormData();
    for(const [key,value] of Object.entries(payload))form.append(key,String(value));
    attachments.forEach((file,i)=>form.append(`attachment_${i+1}`,new Blob([file.bytes],{type:'image/jpeg'}),file.name));
    body=form;headers={'Accept':'application/json'};
  }
  const response=await fetcher('https://formsubmit.co/ajax/'+encodeURIComponent(recipient),{
    method:'POST',headers,body,signal:AbortSignal.timeout(30000)
  });
  if(!response.ok)throw new Error('Delivery unavailable');
  const result=await response.json();
  if(String(result.success).toLowerCase()!=='true')throw new Error('Delivery not confirmed');
}
