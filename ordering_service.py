# ordering_service.py
import requests
from flask import Flask, jsonify, request
from timeout_helper import async_timeout, AsyncTimeoutException
import json
from flask_sqlalchemy import SQLAlchemy
import asyncio
from werkzeug.serving import run_simple
import socket
import subprocess

app = Flask(__name__)
url = 'http://localhost:'

concurrent_task_limit = 5
semaphore = asyncio.Semaphore(concurrent_task_limit)


with open('db_config.json', 'r') as file:
    db_conf = json.load(file)

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://'+db_conf["user"]+':'    \
                                                       +db_conf["password"]+'@'\
                                                       +db_conf["host"]+':'    \
                                                       +db_conf["port"]+'/'    \
                                                       +db_conf["db_name"]
db = SQLAlchemy(app)

class Bills(db.Model):
    bill_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    item = db.Column(db.String(256))
    seller = db.Column(db.String(256))
    quantity = db.Column(db.Integer)
    address = db.Column(db.String(256))
    card_number = db.Column(db.String(256))
    price = db.Column(db.Integer)
    usd = db.Column(db.Integer)


@app.route('/create_order', methods=['POST'])
@async_timeout(5)
async def create_order():
    async with semaphore:
        try:
            current_seller = "Stock"
            data = request.json

            if "seller" in data:
                current_seller = data["seller"]

            with open('stock.json', 'r') as file:
                stock = json.load(file)

            if data["item"] in stock and isinstance(data["quantity"], int):
                new_bill = Bills(
                    item=data['item'],
                    seller=current_seller,
                    quantity=data['quantity'],
                    address=data['address'],
                    card_number=data['card_number'],
                    price=stock[data['item']]["seller-"+current_seller]["price"],
                    usd=stock[data['item']]["seller-"+current_seller]["price"]*data['quantity']
                )

                db.session.add(new_bill)
                ready = requests.post('http://localhost:4002/2pc', json={ "service_identifier": "ordering",
                                                                          "status_ordering" : "ready"})
                ready_data = ready.json()
                print(ready_data)
                if ready_data['action'] == "commit":
                    bill = {
                        "bill_id" : new_bill.bill_id,
                        "item" :new_bill.item,
                        "seller" :new_bill.seller,
                        "quantity" :new_bill.quantity,
                        "address" :new_bill.address,
                        "card_number" :new_bill.card_number,
                        "price" :new_bill.price,
                        "usd" : new_bill.usd
                    }

                    # bill = requests.post('http://localhost:4002/saga', json=bill)
                    db.session.commit()

                    order_data = {"current_seller" : current_seller, "item": new_bill.item, "quantity" : new_bill.quantity}
                
                    data = requests.get('http://localhost:4001/services/stock_service')
                    get_url = data.json()
                    response = requests.post(url+str(get_url['ServicePort'])+'/update_stock', json=order_data)

                    if response.status_code == 200:
                        print("Data sent successfully!")
                    else:
                        return (f"Failed to send data. Status code: {response.status_code}. Response text: {response.text}")
                    
                    return jsonify({'status': 'Order has been sent!',
                                    "bill_id": new_bill.bill_id,                               
                                    "item": new_bill.item,                           
                                    "seller": new_bill.seller,                            
                                    "quantity": new_bill.quantity,                              
                                    "price": stock[new_bill.item]["seller-"+new_bill.seller]["price"],
                                    "usd" : stock[new_bill.item]["seller-"+new_bill.seller]["price"]*new_bill.quantity,
                                    "address": new_bill.address,      
                                    "card_number": new_bill.card_number,            
                                    "status": "sent"                           
                                    }), 201
                elif ready_data['action'] == "rollback":
                    db.session.rollback()
                    return "rollback"
                else:
                    db.session.rollback()
                    return "rollback"
            else:
                return 'Wrong input. No such item in the stock or quantity not an integer.'
        
        except Exception as e:
            return jsonify({'message': str(e)}), 500

@app.route('/status', methods=['GET'])
@async_timeout(5)
async def status():
    async with semaphore:
        return jsonify({'status': 'Healthy'}), 200


def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]

if __name__ == '__main__':
    port = find_free_port()
    print(f"Running on port {port}")
    subprocess.run(["curl", "-X", "POST", "http://localhost:4001/register", "-H", "Content-Type: application/json", "--data", f'{{"serviceName": "ordering_service", "servicePort": {port}}}'])
    app.run(port=port, threaded=True)
    