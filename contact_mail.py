"""Server-only FormSubmit delivery. No credentials or destination reach the browser."""
import json
import re
import time
import threading
import uuid
from creation_validation import validate_creations
from collections import deque
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

PROJECTS = ('Textiles de badminton', 'Tubes de volants', 'Textiles et tubes de volants', 'Autre projet')
CONFIG = json.loads((Path(__file__).parent / 'contact_config.json').read_text())


class DeliveryError(RuntimeError):
    """Only fixed, public-safe messages may cross the component boundary."""
    MESSAGES = {
        'activation': 'Le service de contact attend son activation par BADONLINE. Votre demande n’a pas été envoyée ; vos informations sont conservées.',
        'refused': 'Le service d’envoi a refusé la demande. Vos informations sont conservées. Référence : MAIL-REFUSED.',
        'network': 'Le serveur ne parvient pas à joindre le service d’envoi. Vos informations sont conservées. Référence : MAIL-NETWORK.',
        'response': 'Le service d’envoi a renvoyé une réponse inattendue. L’envoi n’est pas confirmé. Référence : MAIL-RESPONSE.',
        'limited': 'Le service d’envoi reçoit trop de demandes. Patientez quelques minutes. Référence : MAIL-LIMIT.',
    }

    def __init__(self, code, status=None):
        self.code = code
        suffix = f' (HTTP {int(status)})' if status is not None else ''
        super().__init__(self.MESSAGES[code] + suffix)


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
    summary, attachments = validate_creations(data.get('creations', []))
    cleaned['creations_summary'] = summary
    cleaned['attachments'] = attachments
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
    attachments = data.pop('attachments')
    payload = {**data, '_subject':'BADONLINE — Nouvelle demande de personnalisation',
               '_template':'table', '_captcha':'false',
               '_url':site_url or CONFIG['site_url']}
    body = json.dumps(payload).encode()
    content_type = 'application/json'
    if attachments:
        boundary = 'badonline-' + uuid.uuid4().hex
        chunks = []
        for key, value in payload.items():
            chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
        for index, (filename, image) in enumerate(attachments):
            chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="attachment_{index+1}"; filename="{filename}"\r\nContent-Type: image/jpeg\r\n\r\n'.encode() + image + b'\r\n')
        chunks.append(f'--{boundary}--\r\n'.encode())
        body = b''.join(chunks)
        content_type = 'multipart/form-data; boundary=' + boundary
    req = Request('https://formsubmit.co/ajax/' + quote(recipient or CONFIG['recipient'], safe='@'),
                  data=body,
                  headers={'Content-Type':content_type, 'Accept':'application/json', 'User-Agent':'BADONLINE/1.0'}, method='POST')
    try:
        with opener(req, timeout=30) as response:
            result = json.loads(response.read(65536))
            if not isinstance(result, dict):
                raise DeliveryError('response')
            # Activation responses must never be presented as a delivered quote.
            message = str(result.get('message', '')).lower()
            if any(word in message for word in ('activate', 'activation', 'confirm your email')):
                raise DeliveryError('activation')
            if not 200 <= response.status < 300 or str(result.get('success', '')).lower() != 'true':
                raise DeliveryError('refused')
    except HTTPError as error:
        raise DeliveryError('limited' if error.code == 429 else 'refused', error.code) from None
    except (URLError, TimeoutError, OSError):
        raise DeliveryError('network') from None
    except (ValueError, UnicodeError):
        raise DeliveryError('response') from None
    return True
