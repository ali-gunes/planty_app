from flask import Flask, request, jsonify, send_from_directory
from datetime import datetime

#app = Flask(__name__, static_folder="UI", static_url_path="/UI")
app = Flask(__name__)
# Endpoint to receive sensor data
sensor_data = {}

@app.route("/data", methods=["POST"])
def receive_data():
    global sensor_data
    sensor_data = request.json

    sensor_data["last_updated"] = datetime.now().strftime("%A, %d/%m/%Y, %H:%M:%S")
    print("Received data:", sensor_data)
    return jsonify({"status": "success"}), 200

@app.route("/data", methods=["GET"])
def send_data():
    return jsonify(sensor_data)

# Serve the UI files
@app.route("/")
def index():
    return send_from_directory("UI", "index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5026, debug=True)
