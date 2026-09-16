import { readFileSync } from 'node:fs';
const config = JSON.parse(readFileSync(new URL('./contact_config.json',import.meta.url),'utf8'));
export async function deliver(data, fetcher=fetch) {
  const recipient=process.env.FORMSUBMIT_RECIPIENT || config.recipient;
  const response=await fetcher('https://formsubmit.co/ajax/'+encodeURIComponent(recipient),{
    method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({...data,_subject:'BADONLINE — Nouvelle demande de personnalisation',_template:'table',_captcha:'false',_url:process.env.SITE_URL || config.site_url}),
    signal:AbortSignal.timeout(20000)
  });
  if(!response.ok)throw new Error('Delivery unavailable');
  const result=await response.json();
  if(String(result.success).toLowerCase()!=='true')throw new Error('Delivery not confirmed');
}
