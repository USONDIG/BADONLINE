// Shared UI for the Node site and the Streamlit component.
function mountBadonline(root, send, result = null) {
  const controller = new AbortController();
  const listen = (element, event, handler) => element?.addEventListener(event, handler, {signal:controller.signal});
  const find = selector => root.querySelector(selector);
  const menu = find('.menu-button');
  const nav = find('#navigation');
  listen(menu, 'click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded',String(open)); nav.classList.toggle('open',open); });
  listen(root, 'keydown', e => { if(e.key === 'Escape' && nav.classList.contains('open')) {nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.focus();} });
  root.querySelectorAll('a[href^="#"]').forEach(link => listen(link,'click',e => {
    e.preventDefault();
    if (link.dataset.project) find('[name=project]').value = link.dataset.project;
    if (link.dataset.example) find('[name=message]').value = `Je souhaite personnaliser un t-shirt inspiré de : ${link.dataset.example}.\nPrénom à imprimer : \nTaille : \nCouleurs souhaitées : `;
    const id=link.getAttribute('href').slice(1) || 'main';
    const target=find('#'+id);
    if (id==='confidentialite') target.open=true;
    target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    nav.classList.remove('open');menu.setAttribute('aria-expanded','false');
  }));
  find('#year').textContent=new Date().getFullYear();
  const form=find('#quote-form'), status=find('#form-status'), button=form.querySelector('[type=submit]');
  const show = reply => {status.textContent=reply.message;button.disabled=false;if(reply.ok)form.reset();};
  if(result && form.dataset.receipt!==result.id){show(result);form.dataset.receipt=result.id;}
  listen(form,'submit',async e=>{
    e.preventDefault();if(!form.reportValidity() || button.disabled)return;
    button.disabled=true;status.textContent='Transmission de votre demande…';
    const data=Object.fromEntries(new FormData(form));data.request_id=crypto.randomUUID();
    try {const reply=await send(data);if(reply)show(reply);}
    catch {show({ok:false,message:'L’envoi n’a pas pu être confirmé. Vos informations sont conservées dans le formulaire. Réessayez dans un instant.'});}
  });
  const mobile=find('.mobile-cta');
  const observer=new IntersectionObserver(entries=>mobile.classList.toggle('hidden',entries[0].isIntersecting),{threshold:0});
  observer.observe(find('#contact'));
  return ()=>{controller.abort();observer.disconnect();};
}
// STREAMLIT_SPLIT: the adapter loads only the reusable function above.
mountBadonline(document,async data=>{
  const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(25000)});
  const body=await response.json();
  if(!response.ok)throw new Error('Delivery unavailable');
  return {ok:true,message:body.message || 'Votre demande a été prise en charge par le service d’envoi. Merci !'};
});
