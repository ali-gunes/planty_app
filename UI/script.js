async function fetchSensorData() {
            try {
                const response = await fetch('http://192.168.50.144:5000/data'); // Update IP if needed
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                // Update the sensor data
                const sensorDiv = document.getElementById('sensor-data');
                sensorDiv.innerHTML = `
                    <p>Temperature: ${data.temperature} °C</p>
                    <p>Humidity: ${data.humidity} %</p>
                    <p>LDR Value: ${data.ldr}</p>
                    <p>Soil Moisture: ${data.moisture}</p>
                    <p>DHT22 Health: ${data.dht22Health ? 'Good' : 'Failed'}</p>
                    <p>LDR Health: ${data.ldrHealth ? 'Good' : 'Failed'}</p>
                    <p>Soil Moisture Health: ${data.moistureHealth ? 'Good' : 'Failed'}</p>
                `;

                // Update the last updated time in the desired format
                const lastUpdated = document.getElementById('last-updated');
                const now = new Date();
                const options = {
                    weekday: 'long', // Day of the week (e.g., Monday)
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false // 24-hour format
                };
                const formattedDate = now.toLocaleString('en-GB', options); // en-GB for the day/month format
                lastUpdated.innerHTML = `Last Updated: ${formattedDate}`;
            } catch (error) {
                console.error("Error fetching sensor data:", error);
                document.getElementById('sensor-data').innerText = 'Failed to load sensor data.';
                document.getElementById('last-updated').innerHTML = 'Last Updated: Failed to update.';
            }
        }

        // Fetch data every 5 seconds
        fetchSensorData();
        setInterval(fetchSensorData, 5000);