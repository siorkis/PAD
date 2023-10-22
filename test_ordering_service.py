# test_ordering_service.py
import unittest
import requests

class TestOrderingService(unittest.TestCase):

    def setUp(self):
        self.base_url = 'http://localhost:4000/order'
        self.headers = {'Content-Type': 'application/json'}

    def test_create_order(self):
        data = {
            'item': 'apple',
            'seller': 'Stock',
            'quantity': 5,
            'address': '123 Main St',
            'card_number': '1234567890123456',
        }
        response = requests.post(f'{self.base_url}/create_order', json=data, headers=self.headers)
        self.assertEqual(response.status_code, 201)
        response_data = response.json()
        self.assertEqual(response_data['status'], 'sent')
        self.assertEqual(response_data['item'], data['item'])
        self.assertEqual(response_data['seller'], data['seller'])
        self.assertEqual(response_data['quantity'], data['quantity'])
        self.assertEqual(response_data['address'], data['address'])
        self.assertEqual(response_data['card_number'], data['card_number'])

    def test_create_order_invalid_input(self):
        data = {
            'item': 'nonexistent',
            'seller': 'Stock',
            'quantity': 5,
            'address': '123 Main St',
            'card_number': '1234567890123456',
        }
        response = requests.post(f'{self.base_url}/create_order', json=data, headers=self.headers)
        self.assertEqual(response.status_code, 200)
        response_text = response.text
        self.assertEqual(response_text, 'Wrong input. No such item in the stock or quantity not an integer.')

if __name__ == '__main__':
    unittest.main()
