#include <WiFi.h>           // Include WiFi library
#include <ArduinoJson.h>     // Include ArduinoJson library
#include <DHT.h>

const char* ssid = "kepce";    // Replace with your Wi-Fi SSID
const char* password = "boyunegme";  // Replace with your Wi-Fi password

// Define DHT sensor type and pin
#define DHTTYPE DHT22
#define DHTPIN 2

// Initialize the DHT sensor
DHT dht(DHTPIN, DHTTYPE);

// Define LDR pin
#define LDRPIN A0  // AO pin of the LDR module
#define MOISTURE_PIN A1  // Analog pin for soil moisture sensor

const char* server = "192.168.57.144";  // Raspberry Pi's IP
const int serverPort = 5026;          // Server port

WiFiClient client;

void setup() {
    Serial.begin(115200);
    delay(10);

    // Connect to Wi-Fi
    Serial.println("Connecting to Wi-Fi...");
    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED) {
      delay(1000);
      Serial.print(".-");
    }
    Serial.println("Connected to Wi-Fi!");

    // Initialize DHT sensor
    dht.begin();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi disconnected! Attempting reconnection...");
    WiFi.begin(ssid, password);
    delay(5000); 
    return; 
  }

  // Read sensors
  float temperature = dht.readTemperature();  // Read temperature
  float humidity = dht.readHumidity();        // Read humidity
  int ldrValue = analogRead(LDRPIN);         // Read LDR sensor
  int moistureValue = analogRead(MOISTURE_PIN);  // Read soil moisture sensor
  
  // Healthchecks
  bool dht22Health = true;
  bool ldrHealth = true;
  bool moistureHealth = true;

  // Check if any reading failed
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    dht22Health = false;
  }
  if (isnan(ldrValue)) {
    Serial.println("Failed to read from LDR sensor!");
    ldrHealth = false;
  }
  if (isnan(moistureValue)) {
    Serial.println("Failed to read from Moisture sensor!");
    moistureHealth = false;
  }

  // Create a JSON document
  StaticJsonDocument<400> doc;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["ldr"] = ldrValue;
  doc["moisture"] = moistureValue;
  doc["dht22Health"] = dht22Health;
  doc["ldrHealth"] = ldrHealth;
  doc["moistureHealth"] = moistureHealth;

  // Serialize JSON to string
  String jsonData;
  serializeJson(doc, jsonData);
  Serial.println(jsonData);

  // Send data to the server
  if (client.connect(server, serverPort)) {  // Connect to the Raspberry Pi server
    client.println("POST /data HTTP/1.1");
    client.println("Host: 192.168.57.144");  // Use Raspberry Pi's IP
    client.println("Content-Type: application/json");
    client.print("Content-Length: ");
    client.println(jsonData.length());
    client.println();
    client.print(jsonData);  // Send JSON data

    while (client.connected()) {
      if (client.available()) {
        String response = client.readString();
        Serial.println("Server response: " + response);
        break;
      }
    }
    client.stop();  // Disconnect from the server
  } else {
    Serial.println("Server connection failed!");
  }
 
  // Wait before sending data again
  delay(5000);  // Send data every 10 seconds
}
