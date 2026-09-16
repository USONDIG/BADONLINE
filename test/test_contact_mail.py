import json
import unittest
from unittest.mock import Mock
from contact_mail import validate, send_request, RateLimiter
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

    def test_limit(self):
        limiter=RateLimiter()
        for _ in range(30):self.assertTrue(limiter.allow())
        self.assertFalse(limiter.allow())

if __name__=='__main__':unittest.main()
