const menu = document.querySelector('.menu-button');
const nav = document.querySelector('#navigation');
menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); });
nav.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.focus(); } });
document.querySelectorAll('[data-project]').forEach(a => a.addEventListener('click', () => { document.querySelector('[name=project]').value = a.dataset.project; }));
document.querySelector('a[href="#confidentialite"]').addEventListener('click', () => { document.querySelector('#confidentialite').open = true; });
document.querySelector('#year').textContent = new Date().getFullYear();
const form = document.querySelector('#quote-form');
const status = document.querySelector('#form-status');
let direct = false;
fetch('/api/config').then(r => r.ok ? r.json() : {}).then(config => { direct = config.contactEnabled === true; if (direct) document.querySelector('#delivery-note').textContent = 'Votre demande sera transmise directement. Vos coordonnées servent uniquement à vous répondre.'; }).catch(() => {});
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
  const body = `Bonjour BADONLINE,\n\nJe souhaite un devis pour mon projet.\n\nNom : ${data.name}\nE-mail : ${data.email}\nTéléphone : ${data.phone || 'Non renseigné'}\nClub / entreprise : ${data.organization || 'Non renseigné'}\nProjet : ${data.project}\nQuantité estimée : ${data.quantity}\n\n${data.message}\n\nJ’accepte l’utilisation de mes informations pour répondre à cette demande.`;
  const fallback = () => { document.querySelector('#request-text').value = body; document.querySelector('#mail-fallback').hidden = false; };
  if (!direct) {
    fallback();
    status.textContent = 'Votre demande est préparée. Envoyez l’e-mail depuis votre messagerie pour la transmettre : rien n’a encore été envoyé par le site.';
    window.location.href = `mailto:bastien.sudan@gmail.com?subject=${encodeURIComponent('Demande de devis BADONLINE — ' + data.project)}&body=${encodeURIComponent(body)}`;
    return;
  }
  const button = form.querySelector('[type=submit]');
  button.disabled = true;
  status.textContent = 'Transmission de votre demande…';
  try {
    const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!response.ok) throw new Error('Send failed');
    status.textContent = 'Votre demande a bien été transmise. Merci !';
    form.reset(); document.querySelector('#mail-fallback').hidden = true;
  } catch { status.textContent = 'La demande n’a pas pu être confirmée. Vous pouvez nous écrire directement avec le texte ci-dessous.'; fallback(); }
  finally { button.disabled = false; }
});
document.querySelector('#copy-request').addEventListener('click', async () => { const field = document.querySelector('#request-text'); try { await navigator.clipboard.writeText(field.value); status.textContent = 'Demande copiée. Collez-la dans un e-mail à bastien.sudan@gmail.com puis envoyez-le.'; } catch { field.focus(); field.select(); status.textContent = 'Sélectionnez et copiez ce texte pour l’envoyer par e-mail.'; } });
const mobile = document.querySelector('.mobile-cta');
new IntersectionObserver(entries => { mobile.classList.toggle('hidden', entries[0].isIntersecting); }, { threshold: 0 }).observe(document.querySelector('#contact'));
