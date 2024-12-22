from http.client import responses
import requests
from flask import Flask, request, jsonify, send_from_directory
from datetime import datetime, timedelta

#app = Flask(__name__, static_folder="UI", static_url_path="/UI")
app = Flask(__name__)
# Endpoint to receive sensor data
sensor_data = {}
alerts = []

# OpenWeatherMap API Configuration
WEATHER_API_KEY = "5dcb97a02a579b3c86904e8fe0d9bb54"
CITY = "Eskisehir,tr"
WEATHER_API_URL = f"https://api.openweathermap.org/data/2.5/forecast?q={CITY}&appid={WEATHER_API_KEY}&units=metric"

cached_weather_data = None
last_fetch_time = None

# Thresholds for Pachira Money Tree
TEMPERATURE_MIN = 16.0  # Minimum temperature for safe conditions
TEMPERATURE_OPTIMAL = 18.0  # Optimal growing temperature
TEMPERATURE_MAX = 26.0  # Maximum temperature for safe conditions

HUMIDITY_MIN = 40.0  # Minimum acceptable humidity
HUMIDITY_OPTIMAL = 50.0  # Optimal humidity lower bound
HUMIDITY_MAX = 75.0  # Optimal humidity upper bound

LDR_MIN = 800  # Minimum light value for adequate light (lower value means brighter light)
LDR_MAX = 200  # Maximum light value before risk of leaf burn (lower value means brighter light)

SOIL_MOISTURE_THRESHOLD = 600  # Soil moisture threshold for watering
SOIL_MOISTURE_MINIMUM_THRESHOLD = 300

def fetch_weather_data():
    global cached_weather_data, last_fetch_time

    now = datetime.now()
    # Check if cache is empty or data is older than 24 hours
    if not last_fetch_time or (now - last_fetch_time > timedelta(hours=24)):
        try:
            url = WEATHER_API_URL
            response = requests.get(url)
            data = response.json()

            response.raise_for_status()

            # Extract necessary data (e.g., daily projections)
            cached_weather_data = [
                {
                    'date': forecast['dt_txt'],
                    'temp': forecast['main']['temp'],
                    'humidity': forecast['main']['humidity'],
                    'description': forecast['weather'][0]['description']
                }
                for forecast in data['list']
            ]
            last_fetch_time = now
            print("Fetched new weather data.")
        except requests.RequestException as e:
            print(f"Error fetching weather data: {e}")
            # If an error occurs, return previously cached data (if available)
            if cached_weather_data:
                print("Using cached data due to fetch error.")
                return cached_weather_data
            return {"error": "Unable to fetch weather data"}
    else:
        print("Fetched cached weather data")
    return cached_weather_data

@app.route("/data", methods=["POST"])
def receive_data():
    global sensor_data
    global alerts
    alerts = []
    sensor_data = request.json

    sensor_data["last_updated"] = datetime.now().strftime("%A, %d/%m/%Y, %H:%M:%S")
    sensor_data["alerts"] = alerts

    print("Received data:", sensor_data)
    temperature = sensor_data.get('temperature', 0)
    humidity = sensor_data.get('humidity', 0)
    ldr = sensor_data.get('ldr', 0)
    moisture = sensor_data.get('moisture', 0)

    # Sensor health status
    dht22_health = sensor_data.get('dht22Health', False)
    ldr_health = sensor_data.get('ldrHealth', False)
    moisture_health = sensor_data.get('moistureHealth', False)

    # Initialize response
    response = {
        "alerts": alerts,
        "enable_pump": False,
        "pump_duration": 0  # Default: pump off
    }

    # Temperature Alerts
    # if temperature < TEMPERATURE_MIN:
    #     response["alerts"].append("Temperature too low! Move the plant to a warmer location.,red")
    # elif temperature > TEMPERATURE_MAX:
    #     response["alerts"].append("Temperature too high! Ensure adequate ventilation.,red")
    #
    # # Humidity Alerts
    # if humidity < HUMIDITY_MIN:
    #     response["alerts"].append("Humidity too low! Consider watering the plant.,red")
    # elif humidity > HUMIDITY_MAX:
    #     response["alerts"].append("Humidity too high! Risk of fungal growth.,red")
    #
    # # Light Alerts
    # if ldr > LDR_MIN:
    #     response["alerts"].append("Light levels too low! Move the plant to a brighter spot.,red")
    # elif ldr < LDR_MAX:
    #     response["alerts"].append("Light levels too high! Protect the plant from direct sunlight.,red")

    # Soil Moisture and Pump Logic
    if moisture < SOIL_MOISTURE_MINIMUM_THRESHOLD:
        response["enable_pump"] = True
        response["pump_duration"] = 10
    elif moisture < SOIL_MOISTURE_THRESHOLD:
        response["enable_pump"] = True
        # Adjust watering duration based on dryness and humidity
        response["pump_duration"] = 5 if humidity >= HUMIDITY_OPTIMAL else 10
    # elif moisture >= SOIL_MOISTURE_THRESHOLD:
    #     response["alerts"].append("Soil moisture is sufficient. No need to water the plant.,#1b5e20")

    # Sensor Health Alerts
    if not dht22_health:
        response["alerts"].append("🤖 DHT22 sensor health check failed. Please check if the sensor is connected to the circuit.")
    if not ldr_health:
        response["alerts"].append("🤖 LDR sensor health check failed. Please check if the sensor is connected to the circuit.")
    if not moisture_health:
        response["alerts"].append("🤖 Soil moisture sensor health check failed. Please check if the sensor is connected to the circuit.")


    return jsonify(response), 200

@app.route('/weather', methods=['GET'])
def get_weather():
    weather_data = fetch_weather_data()
    if "error" in weather_data:
        return jsonify({"error": "Could not fetch weather data"}), 500
    return jsonify(weather_data), 200


@app.route("/data", methods=["GET"])
def send_data():
    return jsonify(sensor_data)

# Serve the UI files
@app.route("/")
def index():
    return send_from_directory("UI", "index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5026, debug=True)
