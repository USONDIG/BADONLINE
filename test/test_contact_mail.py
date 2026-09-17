import json
import base64
import unittest
from unittest.mock import Mock
from contact_mail import validate, send_request, RateLimiter, DeliveryError
from streamlit_app import website_assets

VALID={'name':'Camille Exemple','email':'camille@example.com','project':'Textiles de badminton','quantity':'1','personalization':'CAMILLE','message':'Un t-shirt vert taille M.','consent':'on'}

class ContactTest(unittest.TestCase):
    def test_invalid_fields(self):
        self.assertEqual(validate(VALID)['quantity'],'1')
        for patch in [{'email':'bad'},{'consent':''},{'quantity':'1.5'},{'quantity':0},{'website':'spam'},{'message':' '},{'name':[]}]:
            with self.subTest(patch=patch),self.assertRaises(ValueError):validate({**VALID,**patch})

    def test_formsubmit_payload(self):
        response=Mock(status=200)
        response.read.return_value=b'{"success":"true"}'
        response.__enter__=Mock(return_value=response)
        response.__exit__=Mock(return_value=False)
        opener=Mock(return_value=response)
        self.assertTrue(send_request({**VALID,'_cc':'attacker@example.com'},opener=opener))
        request=opener.call_args.args[0]
        payload=json.loads(request.data)
        self.assertEqual(payload['personalization'],'CAMILLE')
        self.assertNotIn('_cc',payload)
        response.read.return_value=b'{"success":"false"}'
        with self.assertRaises(RuntimeError):send_request(VALID,opener=opener)

    def test_no_destination_in_browser_assets(self):
        html,css,js=website_assets()
        self.assertNotIn('bastien.sudan',html+css+js)
        self.assertNotIn('mailto:',html+js)
        self.assertNotIn('/assets/',html)
        for name in ['Camille','Alex','Léa','Hugo']:self.assertIn(name,html)
        self.assertIn('setTriggerValue',js)

    def test_creation_attachments(self):
        image = 'data:image/jpeg;base64,' + base64.b64encode(bytes([255,216,255,224,0,2,255,217])).decode()
        creation = {'kind':'shirt','summary':'Dos : CAMILLE','preview':image}
        data = validate({**VALID,'creations':[creation]})
        self.assertIn('TEXTILE NON FOURNI',data['creations_summary'])
        self.assertEqual(data['attachments'][0][0],'badonline-shirt.jpg')
        for items in [[creation,creation],[{**creation,'kind':'unknown'}],[{**creation,'preview':'data:text/html;base64,bad'}],[{**creation,'photo':image}],[{**creation,'preview':'data:image/jpeg;base64,bad'}]]:
            with self.subTest(items=items),self.assertRaises(ValueError):validate({**VALID,'creations':items})
        response=Mock(status=200)
        response.read.return_value=b'{"success":"true"}'
        response.__enter__=Mock(return_value=response)
        response.__exit__=Mock(return_value=False)
        opener=Mock(return_value=response)
        self.assertTrue(send_request({**VALID,'creations':[creation]},opener=opener))
        request=opener.call_args.args[0]
        self.assertIn('multipart/form-data',request.get_header('Content-type'))
        self.assertIn(b'filename="badonline-shirt.jpg"',request.data)
        self.assertNotIn(b'data:image/jpeg;base64',request.data)

    def test_delivery_errors_are_safe_and_activation_is_not_success(self):
        from urllib.error import URLError, HTTPError
        for error, code in [(URLError('private@example.com'), 'network'),
                            (HTTPError('https://private.example', 429, 'secret', {}, None), 'limited')]:
            with self.assertRaises(DeliveryError) as raised:
                send_request(VALID, opener=Mock(side_effect=error))
            self.assertEqual(raised.exception.code, code)
            self.assertNotIn('private', str(raised.exception))
        response = Mock(status=200)
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        for body, code in [(b'{"success":true,"message":"Please activate your form private@example.com"}', 'activation'),
                           (b'<html>private@example.com</html>', 'response')]:
            response.read.return_value = body
            with self.assertRaises(DeliveryError) as raised:
                send_request(VALID, opener=Mock(return_value=response))
            self.assertEqual(raised.exception.code, code)
            self.assertNotIn('private', str(raised.exception))

    def test_limit(self):
        limiter=RateLimiter()
        for _ in range(30):self.assertTrue(limiter.allow())
        self.assertFalse(limiter.allow())

if __name__=='__main__':unittest.main()
