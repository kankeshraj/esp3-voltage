from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# Store latest ESP32 data (Matches the structure in app.js)
latest_esp32_data = {
    "current": None,
    "voltage": None,
    "timing": None,
    "timestamp": None
}

# Serve the frontend files
@app.route('/')
def index():
    return send_from_directory(os.getcwd(), 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(os.getcwd(), path)

# Endpoint to receive data from ESP32 (POST)
@app.route('/api/esp32-data', methods=['POST'])
def receive_data():
    global latest_esp32_data
    data = request.json
    
    latest_esp32_data["current"] = float(data.get("current")) if data.get("current") is not None else None
    latest_esp32_data["voltage"] = float(data.get("voltage")) if data.get("voltage") is not None else None
    latest_esp32_data["timing"] = data.get("timing")
    latest_esp32_data["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    print(f"Received data: {latest_esp32_data}")
    return jsonify({"success": True, "data": latest_esp32_data})

# Endpoint for the dashboard to poll data (GET)
@app.route('/api/esp32-data', methods=['GET'])
def get_data():
    return jsonify(latest_esp32_data)

import os

if __name__ == '__main__':
    # Use the port assigned by the host, or 5000 as a backup
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)