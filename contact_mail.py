"""Server-only FormSubmit delivery. No credentials or destination reach the browser."""
import json
import re
import time
import threading
from collections import deque
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

PROJECTS = ('Textiles de badminton', 'Tubes de volants', 'Textiles et tubes de volants', 'Autre projet')
CONFIG = json.loads((Path(__file__).parent / 'contact_config.json').read_text())


def validate(data):
    if not isinstance(data, dict):
        raise ValueError('Demande invalide.')
    cleaned = {}
    for key, limit in {'name':120, 'email':254, 'phone':40, 'personalization':160, 'project':80, 'message':5000, 'website':200}.items():
        value = data.get(key, '')
        if not isinstance(value, str) or len(value) > limit:
            raise ValueError('Vérifiez la longueur des champs.')
        cleaned[key] = value.strip()
    quantity = str(data.get('quantity', ''))
    if not quantity.isdigit() or not 1 <= int(quantity) <= 100000:
        raise ValueError('Indiquez une quantité entière positive.')
    if not cleaned['name'] or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', cleaned['email']):
        raise ValueError('Vérifiez votre nom et votre adresse e-mail.')
    if cleaned['project'] not in PROJECTS or len(cleaned['message']) < 10 or data.get('consent') != 'on':
        raise ValueError('Complétez le projet, le message et le consentement.')
    if cleaned['website']:
        raise ValueError('La demande ne peut pas être envoyée.')
    cleaned['quantity'] = str(int(quantity))
    return cleaned


class RateLimiter:
    """Bound total outbound traffic across sessions within a server process."""
    def __init__(self):
        self.times = deque()
        self.lock = threading.Lock()

    def allow(self):
        with self.lock:
            now = time.monotonic()
            while self.times and now - self.times[0] >= 3600:
                self.times.popleft()
            if len(self.times) >= 30:
                return False
            self.times.append(now)
            return True


def send_request(data, recipient=None, site_url=None, opener=urlopen):
    data = validate(data)
    payload = {**data, '_subject':'BADONLINE — Nouvelle demande de personnalisation',
               '_template':'table', '_captcha':'false',
               '_url':site_url or CONFIG['site_url']}
    req = Request('https://formsubmit.co/ajax/' + quote(recipient or CONFIG['recipient'], safe='@'),
                  data=json.dumps(payload).encode(),
                  headers={'Content-Type':'application/json', 'Accept':'application/json', 'User-Agent':'BADONLINE/1.0'}, method='POST')
    with opener(req, timeout=20) as response:
        result = json.loads(response.read(65536))
        if not 200 <= response.status < 300 or str(result.get('success', '')).lower() != 'true':
            raise RuntimeError('Le service d’envoi n’a pas confirmé la demande.')
    return True
