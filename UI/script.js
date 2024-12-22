const apiUrl = 'http://192.168.1.152:5026/data';
        const weatherApiUrl = 'http://192.168.1.152:5026/weather';
        // Fetch data from backend
        async function fetchPlantData() {
            try {
                const [plantResponse, weatherResponse] = await Promise.all([
                    fetch(apiUrl),
                    fetch(weatherApiUrl)
                ]);

                const data = await plantResponse.json();
                const weatherData = await weatherResponse.json();

                // Update alerts
                const alertsDiv = document.getElementById('alerts');
                alertsDiv.innerHTML = "";
                alertsDiv.innerHTML = data.alerts.length
                    ? data.alerts.map(alert => `<p style="color: ${alert.split(',')[1]}">${alert.split(',')[0]}</p>`).join('') : ""


                // Update chart
                updateCharts(data);
                updateWeatherChart(weatherData);
                updateCareInstructions(data, weatherData);
            } catch (error) {
                console.error('Error fetching plant data:', error);
            }
        }

        function generateCareInstructions(sensorData, weatherData) {
            const instructions = [];

            // Check temperature trends
            if (sensorData.temperature < 12) {
                instructions.push('🌡️ The current temperature reading from sensor is too low. Consider moving the plant to room temperature immediately.');
            } else if (sensorData.temperature < 16) {
                instructions.push('🌡️ The current temperature reading from sensor is low. Keep the plant away from cold drafts.');
            } else if (sensorData.temperature < 24) {
                instructions.push('🌡️ The current temperature reading from sensor is optimal. Please keep the temperature level consistent with the current status.');
            } else if (sensorData.temperature < 36) {
                instructions.push('🌡️ The current temperature reading from sensor is too high. Move your plant to a cooler spot.');
            } else {
                instructions.push('🌡️ RIP.');
            }


            if (weatherData.some(day => day.temp < 10)) {
                instructions.push('❄️ Cold weather is forecasted. Protect your plant from drafts and extreme cold.');
            } else if (weatherData.some(day => day.temp < 24)) {
                instructions.push('🌈 Weather forecast for upcoming days are optimal for the plant.');
            } else {
                instructions.push('🔥 High temperatures are expected this week. Monitor soil moisture to avoid drying out.');
            }


            // Check humidity trends
            if (sensorData.humidity < 30) {
                instructions.push('🌬️ Humidity reading from sensor is too low. Consider misting the leaves or using a humidifier.');
            } else if (sensorData.humidity > 70) {
                instructions.push('🌬️ Humidity reading from sensor is high. Ensure proper ventilation to prevent fungal issues.');
            } else {
                instructions.push('🌬️ Humidity reading from sensor is optimal. Please keep the humidity level consistent with the current status.');
            }

            if (sensorData.moisture < 200) {
                instructions.push('💧 The soil is critically wet. Empty the remaining water collected under the pot and dry out the soil immediately.');
            } else if (sensorData.moisture < 400) {
                instructions.push('💧 The soil is too wet. Allow it to dry out before the next watering.');
            } else if (sensorData.moisture < 800) {
                instructions.push('💧 The soil moisture is optimal. Please keep the moisture level consistent with the current status.');
            } else if (sensorData.moisture < 1024) {
                instructions.push('💧 The soil is too dry. Please water the plant thoroughly.');
            }

            // Check light trends (e.g., using LDR sensor data)
            if (sensorData.ldr < 200) {
                instructions.push('🔆 The light level reading from sensor is critically high. Move the plant to a spot with indirect sunlight immediately.')
            } else if (sensorData.ldr < 400) {
                instructions.push('🔆 The light level reading from sensor is high. Move the plant to a spot with indirect sunlight.')
            } else if (sensorData.ldr < 600) {
                instructions.push('🔆 The light level reading from sensor is optimal. Please keep the light level consistent with the current status.')
            } else if (sensorData.ldr < 800) {
                instructions.push('🔆 The light level reading from sensor is critically high. Move the plant to a spot with indirect sunlight immediately.')
            }

            return instructions;
        }


        // Update alerts section with care instructions
        function updateCareInstructions(sensorData, weatherData) {
            const instructions = generateCareInstructions(sensorData, weatherData);
            const alertsDiv = document.getElementById('alerts');
            alertsDiv.innerHTML += instructions.map(instruction => `<p ">${instruction.split(',')[0]}</p>`).join('');
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
                    // Shrinks the bar width
                    // indexAxis: 'x', // Horizontal bar chart
                    // elements: {
                    //     bar: {
                    //         borderWidth: 1,
                    //         borderRadius: 4,
                    //         barPercentage: 0.4 // Shrinks the bars horizontally
                    //     }
                    // }
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
                    // // Shrinks the bar width
                    // indexAxis: 'x', // Horizontal bar chart
                    // elements: {
                    //     bar: {
                    //         borderWidth: 1,
                    //         borderRadius: 4,
                    //         barPercentage: 0.4 // Shrinks the bars horizontally
                    //     }
                    // }
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
            temperatureChart.data.datasets[0].data = [data.temperature];
            temperatureChart.update();

            humidityChart.data.datasets[0].data = [data.humidity];
            humidityChart.update();

            // Update other metrics chart
            otherMetricsChart.data.datasets[0].data = [
                data.ldr,
                data.moisture
            ];
            otherMetricsChart.update();
        }

        // Handle manual watering
        document.getElementById('water-plant').addEventListener('click', () => {
            console.log('Watering plant...');
            // Optional: Send a request to the backend to manually activate the pump
        });

        // Initialize
        initChart();
        fetchPlantData();
        setInterval(fetchPlantData, 10000); // Refresh every 10 seconds