from flask import Flask, request, jsonify
import requests
import threading
import json

app = Flask(__name__)

# @app.route('/saga', methods=['POST', 'GET'])
# async def make_transaction():
#     data = request.json

#     return data
timeout_duration = 3

@app.route('/2pc', methods=['POST', 'GET'])
async def make_transaction():
    if request.method == 'POST':
        data = request.json

        # Identify which service is sending the data
        if 'service_identifier' in data:
            if data['service_identifier'] == 'ordering':
                # Process data from Service 1
                processed_data_ordering = process_ordering_data(data)  
        else:
            processed_data = {"error": "No service identifier provided"}

        processed_data_stock = requests.get('http://localhost:4000/stock/status', json={})

        # try:
        #     processed_data_stock = requests.get('http://localhost:4000/stock/status', json={}, timeout=timeout_duration)
        #     stock_health = processed_data_stock.json()
        #     if stock_health['status'] == "Healthy":
        #         stock_status = True
        # except requests.exceptions.Timeout:
        #     # Handle the timeout error
        #     print("Request timed out. The server might be down or too slow to respond.")
        #     stock_status = False  # or any default value
        # except requests.exceptions.ConnectionError:
        #     # Handle the connection error
        #     print("Connection error occurred. The server might be down or the URL might be incorrect.")
        #     stock_status = False  # or any default value
        # except requests.exceptions.RequestException as e:
        #     # Handle other possible exceptions
        #     print(f"An error occurred: {e}")
        #     stock_status = False  # or any default value

        stock_health = processed_data_stock.json()
        print(processed_data_stock.json())
        if processed_data_ordering and (processed_data_stock.status_code == 200 or stock_health['status'] == "Healthy"):
            print("commit success")
            return {"action": "commit"}
        else:
            return {"action": "rollback"}
    else:
        return {"error": "Invalid request method"}

def process_ordering_data(data):
    if data['status_ordering'] == 'ready':
        status_ordering = True
    else:
        status_ordering = False

    return status_ordering

def process_stock_data(data):
    if data['status_stock'] == 'ready':
        status_stock = True
    else:
        status_stock = False
        
    return status_stock

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=4002)