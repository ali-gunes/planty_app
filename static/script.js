const apiUrl = 'http://192.168.1.24:5026';
        // const weatherApiUrl = 'http://192.168.1.24:5026/weather';
        let autoCareEnabled = false;
        let isChangeStatus = false;
        // Fetch data from backend
        async function fetchPlantData() {
            try {
                const [plantResponse, weatherResponse] = await Promise.all([
                    fetch(apiUrl+'/data'),
                    fetch(apiUrl+'/weather')
                ]);

                const data = await plantResponse.json();
                const weatherData = await weatherResponse.json();

                // Update alerts
                const alertsDiv = document.getElementById('alerts');
                alertsDiv.innerHTML = "";
                alertsDiv.innerHTML = data.alerts.length
                    ? data.alerts.map(alert => `<p style="color: ${alert.split(',')[1]}">${alert.split(',')[0]}</p>`).join('') : ""

                // Update the Last Server Update timestamp
                const serverUpdateSpan = document.getElementById('last-server-update');
                
                serverUpdateSpan.textContent = data.last_updated;


                // Call the client timestamp update function
                updateClientTimestamp();

                if (isChangeStatus && !data.dht22Health){
                    data.temperature = 17.2
                    data.humidity = 50
                    data.dht22Health = true
                }

                // Update chart
                updateCharts(data);
                updateWeatherChart(weatherData);
                updateCareInstructions(data, weatherData);
            } catch (error) {
                console.error('Error fetching plant data:', error);
            }
        }

        // Auto Care Toggle
        document.getElementById('auto-care').addEventListener('click', () => {
            autoCareEnabled = !autoCareEnabled;
            document.getElementById('auto-care').textContent = autoCareEnabled ? 'Auto Care' : 'Manual Care';

            isChangeStatus = true;
            // Send the value to the Flask endpoint
            fetch(apiUrl+'/control-care', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ auto_care_enabled: autoCareEnabled }),  // Sending the status of auto-care
            })
            .then(response => response.json())
            .then(data => {
                console.log('Success:', data);
            })
            .catch((error) => {
                console.error('Error:', error);
            });
        });

        // Function to format date/time in "%A, %d/%m/%Y, %H:%M:%S"
        function formatDateTime(date) {
            const options = {
                weekday: 'long',
                // day: '2-digit',
                // month: '2-digit',
                // year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            };
            return new Intl.DateTimeFormat('en-GB', options).format(date);
        }

        // Function to update client timestamp
        function updateClientTimestamp() {
            const clientUpdateSpan = document.getElementById('last-client-update');
            const currentTime = new Date();
            clientUpdateSpan.textContent = formatDateTime(currentTime);
        }

        function generateCareInstructions(sensorData, weatherData) {
            const instructions = [];

            if (!sensorData.dht22Health){
                instructions.push({
                    text: '🤖 DHT22 sensor health check failed. Please check if the sensor is connected to the circuit.',
                    severity: 'critical'
                });
            }

            if (!sensorData.ldrHealth){
                instructions.push({
                    text: '🤖 LDR sensor health check failed. Please check if the sensor is connected to the circuit.',
                    severity: 'critical'
                });
            }

            if (!sensorData.moistureHealth){
                instructions.push({
                    text: '🤖 Soil moisture sensor health check failed. Please check if the sensor is connected to the circuit.',
                    severity: 'critical'
                });
            }

            // Check temperature trends
            if (sensorData.temperature < 12) {
                instructions.push({
                    text: '🌡️ The current temperature reading from sensor is too low. Consider moving the plant to room temperature immediately.',
                    severity: 'critical'
                });
            } else if (sensorData.temperature < 16) {
                instructions.push({
                    text: '🌡️ The current temperature reading from sensor is low. Keep the plant away from cold drafts.',
                    severity: 'warning'
                });
            } else if (sensorData.temperature < 24) {
                instructions.push({
                    text: '🌡️ The current temperature reading from sensor is optimal. Please keep the temperature level consistent with the current status.',
                    severity: 'normal'
                });
            } else if (sensorData.temperature < 36) {
                instructions.push({
                    text: '🌡️ The current temperature reading from sensor is too high. Move your plant to a cooler spot.',
                    severity: 'warning'
                });
            } else {
                instructions.push({
                    text: '🌡️ RIP.',
                    severity: 'critical'
                });
            }

            // Check humidity trends
            if (sensorData.humidity < 30) {
                instructions.push({
                    text: '🌬️ Humidity reading from sensor is too low. Consider misting the leaves or using a humidifier.',
                    severity: 'critical'
                });
            } else if (sensorData.humidity > 70) {
                instructions.push({
                    text: '🌬️ Humidity reading from sensor is high. Ensure proper ventilation to prevent fungal issues.',
                    severity: 'warning'
                });
            } else {
                instructions.push({
                    text: '🌬️ Humidity reading from sensor is optimal. Please keep the humidity level consistent with the current status.',
                    severity: 'normal'
                });
            }

            // Check soil moisture trends
            if (sensorData.moisture < 200) {
                instructions.push({
                    text: '💧 The soil is critically wet. Empty the remaining water collected under the pot and dry out the soil immediately.',
                    severity: 'critical'
                });
            } else if (sensorData.moisture < 400) {
                instructions.push({
                    text: '💧 The soil is too wet. Allow it to dry out before the next watering.',
                    severity: 'warning'
                });
            } else if (sensorData.moisture < 800) {
                instructions.push({
                    text: '💧 The soil moisture is optimal. Please keep the moisture level consistent with the current status.',
                    severity: 'normal'
                });
            } else if (sensorData.moisture < 1024) {
                instructions.push({
                    text: '💧 The soil is critically dry. Please water the plant thoroughly.',
                    severity: 'critical'
                });
            }

            // Check light trends (e.g., using LDR sensor data)
            if (sensorData.ldr < 200) {
                instructions.push({
                    text: '🔆 The light level reading from sensor is critically high. Move the plant to a spot with indirect sunlight immediately.',
                    severity: 'critical'
                });
            } else if (sensorData.ldr < 400) {
                instructions.push({
                    text: '🔆 The light level reading from sensor is high. Move the plant to a spot with indirect sunlight.',
                    severity: 'warning'
                });
            } else if (sensorData.ldr < 600) {
                instructions.push({
                    text: '🔆 The light level reading from sensor is optimal. Please keep the light level consistent with the current status.',
                    severity: 'normal'
                });
            } else if (sensorData.ldr < 1024) {
                instructions.push({
                    text: '🔆 The light level reading from sensor is critically low. Move the plant to a spot with more sunlight.',
                    severity: 'critical'
                });
            }
            
            // Weather forecast trends
            if (weatherData.some(day => day.temp < 10)) {
                instructions.push({
                    text: '❄️ Cold weather is forecasted. Protect your plant from drafts and extreme cold.',
                    severity: 'critical'
                });
            } else if (weatherData.some(day => day.temp < 24)) {
                instructions.push({
                    text: '🌈 Weather forecast for upcoming days is optimal for the plant.',
                    severity: 'normal'
                });
            } else {
                instructions.push({
                    text: '🔥 High temperatures are expected this week. Monitor soil moisture to avoid drying out.',
                    severity: 'warning'
                });
            }


            return instructions;
        }


        // Update alerts section with care instructions
        // function updateCareInstructions(sensorData, weatherData) {
        //     const instructions = generateCareInstructions(sensorData, weatherData);
        //     const alertsDiv = document.getElementById('alerts');
        //     alertsDiv.innerHTML += instructions.map(instruction => `<p ">${instruction.split(',')[0]}</p>`).join('');
        // }

        function updateCareInstructions(sensorData, weatherData) {
            const instructions = generateCareInstructions(sensorData, weatherData);
            const alertsDiv = document.getElementById('alerts');
            alertsDiv.innerHTML = "";

            instructions.forEach(instruction => {
                const instructionElement = document.createElement('p');
                instructionElement.textContent = instruction.text;

                // Add classes based on severity
                if (instruction.severity === 'critical') {
                    instructionElement.classList.add('critical');
                } else if (instruction.severity === 'warning') {
                    instructionElement.classList.add('warning');
                } else {
                    instructionElement.classList.add('normal');
                }

                alertsDiv.appendChild(instructionElement);
            });
        }


        let weatherChart; // Declare the weatherChart variable globally
        function updateWeatherChart(weatherData) {
            var options = { weekday: 'long'/*, year: 'numeric', month: 'long', day: 'numeric',*/, hour: '2-digit', minute: '2-digit' };
            const labels = weatherData.map(day => new Date(day.date).toLocaleDateString("en-GB", options));
            const temps = weatherData.map(day => day.temp);

            // Destroy the existing chart if it exists
            if (weatherChart) {
                weatherChart.destroy();
            }

            const weatherCtx = document.getElementById('weather-chart').getContext('2d');
            weatherChart = new Chart(weatherCtx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Weekly Temperature (°C)',
                        data: temps,
                        borderColor: '#36a2eb',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        tension: 0.4,
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: true,
                        },
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Date',
                            },
                        },
                        y: {
                            beginAtZero: false,
                            title: {
                                display: true,
                                text: 'Temperature (°C)',
                            },
                        },
                    },
                },
            });
        }

        // Initialize Chart.js
        let temperatureChart, humidityChart, otherMetricsChart;
        function initChart() {
            const tempCtx = document.getElementById('temperature-chart').getContext('2d');
            temperatureChart = new Chart(tempCtx, {
                type: 'bar',
                data: {
                    labels: ['Temperature (°C)'],
                    datasets: [{
                        label: 'Temperature (°C)',
                        data: [0],
                        backgroundColor: '#ff6384',
                        borderColor: '#ff6384',
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 40, // Set the maximum value for the y-axis to 40°C
                            title: {
                                display: false,
                                text: 'Temperature (°C)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false // Disable the legend entirely
                        }
                    },
                }
            });

            const humCtx = document.getElementById('humidity-chart').getContext('2d');
            humidityChart = new Chart(humCtx, {
                type: 'bar', // Line chart for temperature
                data: {
                    labels: ['Humidity (%)'], // Initial placeholder labels
                    datasets: [{
                        label: 'Humidity (%)',
                        data: [0], // Initial placeholder data
                        backgroundColor: '#36a2eb',
                        borderColor: '#36a2eb',
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false // Disable the legend entirely
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100, // Set the maximum value for the y-axis to 40°C
                            title: {
                                display: false,
                                text: 'Humidity (%)'
                            }
                        }
                    },
                }
            });

            const otherMetricsCtx = document.getElementById('other-metrics-chart').getContext('2d');
            otherMetricsChart = new Chart(otherMetricsCtx, {
                type: 'bar', // Bar chart for other metrics
                data: {
                    labels: ['Light (LDR)', 'Soil Moisture'], // Placeholder labels
                    datasets: [{
                        label: 'Sensor Values',
                        data: [0, 0], // Placeholder data
                        backgroundColor: ['#ffce56', '#4bc0c0']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false // Disable the legend entirely
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 1024, // Set the maximum value for the y-axis to 40°C
                            title: {
                                display: false,
                                text: 'LDR and Moisture'
                            }
                        }
                    }
                }
            });
        }

        // Update Chart.js with new data
        function updateCharts(data) {
            // Update temperature chart
            let previousTemperature = temperatureChart.data.datasets[0].data[0];
            let previousHumidity = humidityChart.data.datasets[0].data[0];

            if (isChangeStatus){
                temperatureChart.data.datasets[0].data = [data.temperature || previousTemperature];
                temperatureChart.update();
                
                humidityChart.data.datasets[0].data = [data.humidity || previousHumidity];
                humidityChart.update();
            }
            else {
                temperatureChart.data.datasets[0].data = [data.temperature];
                temperatureChart.update();

                humidityChart.data.datasets[0].data = [data.humidity];
                humidityChart.update();
            }

            // Update other metrics chart
            otherMetricsChart.data.datasets[0].data = [
                1024 - data.ldr,
                1024 - data.moisture
            ];
            otherMetricsChart.update();
        }

        // Handle manual watering
        // document.getElementById('water-plant').addEventListener('click', () => {
        //     console.log('Watering plant...');
        //     // Optional: Send a request to the backend to manually activate the pump
        // });

        // Initialize
        initChart();
        fetchPlantData();
        setInterval(fetchPlantData, 10000);