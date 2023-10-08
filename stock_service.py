# stock_service.py
import requests
from flask import Flask, request, jsonify
from timeout_helper import async_timeout, AsyncTimeoutException
import json 

app = Flask(__name__)
SERVICE1_URL = 'http://localhost:5001'
numbers = []

@app.route('/show_stock', methods=['GET', 'POST'])
@async_timeout(5)
async def show_stock():
    try:
        with open('stock.json', 'r') as file:
            data = json.load(file)
        return data, 200
    except:
        return jsonify({'status': 'failure', 'message': 'Could not fetch data from Service'}), 500


@app.route('/search', methods=['POST'])
@async_timeout(5)
async def search():
    try:
        response = request.get_json()
        query = response.get('find_all', [])
        with open('stock.json', 'r') as file:
            data = json.load(file)
        
        return data[query], 200
    except:
        return jsonify({'status': 'failure', 'message': 'Could not fetch data from Service'}), 500


@app.route('/add_item', methods=['POST'])
@async_timeout(5)
async def add_item():
    try:
        response = request.get_json()

        with open('stock.json', 'r') as file:
            stock = json.load(file)

        for item, sellers_data in response.items():
            if item in stock:
                stock[item].update(sellers_data)
            else:
                stock[item] = sellers_data

        with open('stock.json', 'w') as file:
            json.dump(stock, file, indent=4)

        return {"status": "success"}, 200
    except:
        return jsonify({'status': 'failure', 'message': 'Could not fetch data from Service 1'}), 500


@app.route('/update_stock', methods=['POST'])
@async_timeout(5)
async def update_stock():
    try:
        data = request.json

        with open('stock.json', 'r') as file:
            stock = json.load(file)

        key = data["item"]
        seller_key = "seller-" + data["current_seller"]
        if key in stock and seller_key in stock[key]:
                stock[key][seller_key]["quantity"] -= data["quantity"]
        else:
            print("Item or Seller not found in stock.")

     
        with open('stock.json', 'w') as file:
            json.dump(stock, file, indent=4)
    
        return "Stock has been updated"
    except:
        return jsonify({'status': 'failure', 'message': 'Could not fetch data from Service'}), 500



@app.route('/status', methods=['GET'])
@async_timeout(5)
async def status():
    return jsonify({'status': 'Healthy'}), 200


if __name__ == '__main__':
    app.run(port=5000)
