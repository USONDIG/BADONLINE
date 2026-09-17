"""Streamlit website with a private, server-side FormSubmit connection."""
from pathlib import Path
import base64
import re
import os
import time
from contact_mail import send_request, RateLimiter, DeliveryError

PUBLIC = Path(__file__).parent / 'public'


def website_assets():
    source = (PUBLIC / 'index.html').read_text(encoding='utf-8')
    body = re.search(r'<body>(.*)</body>', source, re.S).group(1)
    for image in (PUBLIC / 'assets').glob('*.svg'):
        uri = 'data:image/svg+xml;base64,' + base64.b64encode(image.read_bytes()).decode()
        body = body.replace('/assets/' + image.name, uri)
    css = (PUBLIC / 'style.css').read_text(encoding='utf-8') + '\n' + (PUBLIC / 'studio.css').read_text(encoding='utf-8')
    css += '\n[data-testid="stHeader"]{display:none}[data-testid="stMainBlockContainer"]{padding:0;max-width:none}[data-testid="stMain"]{background:#e8ece9}[data-testid="stVerticalBlock"]{gap:0}'
    shared = (PUBLIC / 'studio.js').read_text(encoding='utf-8') + '\n' + (PUBLIC / 'app.js').read_text(encoding='utf-8').split('// STREAMLIT_SPLIT')[0]
    js = shared + '''\nexport default function(component) {
      const {parentElement, setTriggerValue, data} = component;
      return mountBadonline(parentElement, payload => {setTriggerValue('submission',payload);return null;},data?.result);
    }'''
    return body, css, js


def main():
    import streamlit as st
    st.set_page_config(page_title='BADONLINE — Votre style. Vos couleurs. Votre jeu.',page_icon='🏸',layout='wide')
    html, css, js = website_assets()

    @st.cache_resource
    def component():
        return st.components.v2.component('badonline_website',html=html,css=css,js=js,isolate_styles=False)

    @st.cache_resource
    def limiter():
        return RateLimiter()

    def setting(key):
        if os.getenv(key):
            return os.environ[key]
        try:
            return st.secrets.get(key)
        except (FileNotFoundError, st.errors.StreamlitSecretNotFoundError):
            return None

    outcome = component()(key='website',data={'result':st.session_state.get('delivery_result')},on_submission_change=lambda:None)
    data = outcome.submission
    if not isinstance(data,dict):
        return
    request_id = data.get('request_id')
    if not isinstance(request_id,str) or not re.fullmatch(r'[a-f0-9-]{36}',request_id):
        return
    if st.session_state.get('handled_request') == request_id:
        return
    st.session_state['handled_request'] = request_id
    result = {'id':request_id,'ok':False}
    now = time.monotonic()
    if now - st.session_state.get('last_attempt',-1000) < 30:
        result['message'] = 'Merci de patienter 30 secondes avant une nouvelle demande.'
    else:
        st.session_state['last_attempt'] = now
        try:
            if not limiter().allow():
                raise RuntimeError('Rate limited')
            send_request(data,recipient=setting('FORMSUBMIT_RECIPIENT'),site_url=setting('SITE_URL'))
            result.update(ok=True,message='Votre demande a été prise en charge par le service d’envoi. Merci !')
        except DeliveryError as error:
            result['message'] = str(error)
        except ValueError as error:
            result['message'] = str(error)
        except Exception:
            # Never echo provider output: it may contain the private recipient.
            result['message'] = 'L’envoi n’a pas pu être confirmé. Vos informations restent dans le formulaire. Réessayez dans un instant.'
    st.session_state['delivery_result'] = result
    st.rerun()


if __name__ == '__main__':
    main()
