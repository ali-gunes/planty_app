#include <WiFi.h>          // Include WiFi library
#include <ArduinoJson.h>   // Include ArduinoJson library
#include <DHT.h>

// Wi-Fi credentials
const char* ssid = "kepce";
const char* password = "boyunegme";

// Sensor and Relay pins
#define DHTTYPE DHT22
#define DHTPIN 2
#define RELAYPIN 7
#define LDRPIN A0
#define MOISTURE_PIN A1

// Server details
const char* server = "192.168.206.144";
const int serverPort = 5026;

// Sensor and Wi-Fi objects
DHT dht(DHTPIN, DHTTYPE);
WiFiClient client;

void connectToWiFi() {
    Serial.println("Connecting to Wi-Fi...");
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.print(".-");
    }
    Serial.println("\nConnected to Wi-Fi!");
}

void sendDataToServer(float temperature, float humidity, int ldrValue, int moistureValue, bool dht22Health, bool ldrHealth, bool moistureHealth) {
    // Prepare JSON data
    StaticJsonDocument<400> doc;
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    doc["ldr"] = ldrValue;
    doc["moisture"] = moistureValue;
    doc["dht22Health"] = dht22Health;
    doc["ldrHealth"] = ldrHealth;
    doc["moistureHealth"] = moistureHealth;

    String jsonData;
    serializeJson(doc, jsonData);

    // Send data
    if (client.connect(server, serverPort)) {
        client.println("POST /data HTTP/1.1");
        client.println("Host: 192.168.206.144");
        client.println("Content-Type: application/json");
        client.print("Content-Length: ");
        client.println(jsonData.length());
        client.println();
        client.print(jsonData);

        Serial.println("Data sent to server:");
        Serial.println(jsonData);

        // Process server response
        processServerResponse();
    } else {
        Serial.println("Server connection failed!");
    }
    client.stop();
}

void processServerResponse() {
    while (client.connected()) {
        if (client.available()) {
            String response = client.readString();
            Serial.println("Server response: " + response);

            // Parse the JSON response
            int jsonStart = response.indexOf('{');
            if (jsonStart != -1) {
                String jsonBody = response.substring(jsonStart);
                StaticJsonDocument<200> responseDoc;
                DeserializationError error = deserializeJson(responseDoc, jsonBody);

                if (!error) {
                    bool enablePump = responseDoc["enable_pump"];
                    int pumpDuration = responseDoc["pump_duration"];

                    if (enablePump) {
                        Serial.println("Activating water pump...");
                        digitalWrite(RELAYPIN, HIGH);
                        delay(pumpDuration * 1000);
                        digitalWrite(RELAYPIN, LOW);
                        Serial.println("Water pump deactivated.");
                    } else {
                        Serial.println("Pump not enabled by server.");
                    }
                } else {
                    Serial.print("Failed to parse JSON response: ");
                    Serial.println(error.c_str());
                }
            } else {
                Serial.println("No JSON found in server response.");
            }
            break;
        }
    }
}

void setup() {
    Serial.begin(115200);
    pinMode(RELAYPIN, OUTPUT);
    digitalWrite(RELAYPIN, LOW);

    // Connect to Wi-Fi
    connectToWiFi();

    // Initialize DHT sensor
    dht.begin();
}

void loop() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("Wi-Fi disconnected! Reconnecting...");
        connectToWiFi();
        return;
    }

    // Read sensors
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    int ldrValue = analogRead(LDRPIN);
    int moistureValue = analogRead(MOISTURE_PIN);

    // Health checks
    bool dht22Health = !(isnan(temperature) || isnan(humidity));
    bool ldrHealth = !isnan(ldrValue);
    bool moistureHealth = !isnan(moistureValue);

    if (!dht22Health) Serial.println("Failed to read from DHT sensor!");
    if (!ldrHealth) Serial.println("Failed to read from LDR sensor!");
    if (!moistureHealth) Serial.println("Failed to read from Moisture sensor!");

    // Send data to server
    sendDataToServer(temperature, humidity, ldrValue, moistureValue, dht22Health, ldrHealth, moistureHealth);

    delay(5000); // Wait before the next iteration
}
