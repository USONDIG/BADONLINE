"""Validate small JPEG design previews without trusting browser filenames or recipients."""
import base64
import binascii

MAX_JPEG_BYTES = 1050000
MAX_DATA_URL = 1400023


def decode_preview(value):
    if not isinstance(value, str) or len(value) > MAX_DATA_URL or not value.startswith('data:image/jpeg;base64,'):
        raise ValueError('Aperçu invalide ou trop volumineux.')
    try:
        raw = base64.b64decode(value.split(',', 1)[1], validate=True)
    except (binascii.Error, ValueError):
        raise ValueError('Aperçu invalide.') from None
    if not 4 <= len(raw) <= MAX_JPEG_BYTES or not raw.startswith(b'\xff\xd8\xff') or not raw.endswith(b'\xff\xd9'):
        raise ValueError('Format d’aperçu invalide.')
    return raw


def validate_creations(creations):
    if not isinstance(creations, list) or len(creations) > 2:
        raise ValueError('Vous pouvez joindre un t-shirt et un tube par demande.')
    summaries, attachments, kinds = [], [], set()
    for creation in creations:
        if not isinstance(creation, dict) or creation.get('kind') not in ('shirt', 'tube'):
            raise ValueError('Création invalide.')
        kind = creation['kind']
        if kind in kinds:
            raise ValueError('Création en double.')
        kinds.add(kind)
        summary = creation.get('summary')
        if not isinstance(summary, str) or not 1 <= len(summary.strip()) <= 3500:
            raise ValueError('Description de création invalide.')
        prefix = 'T-SHIRT — TEXTILE NON FOURNI, FOURNI PAR LE CLIENT.' if kind == 'shirt' else 'TUBE PERSONNALISÉ.'
        summaries.append(prefix + '\n' + summary.strip())
        attachments.append((f'badonline-{kind}.jpg', decode_preview(creation.get('preview'))))
        if creation.get('photo') is not None:
            if kind != 'tube':
                raise ValueError('Photo inattendue.')
            attachments.append(('badonline-photo-tube.jpg', decode_preview(creation['photo'])))
    return '\n\n'.join(summaries), attachments
