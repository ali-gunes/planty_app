const apiUrl = 'http://192.168.1.152:5026/data'; // Replace with your backend URL

// Fetch data from backend
async function fetchPlantData() {
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        // Update alerts
        const alertsDiv = document.getElementById('alerts');
        alertsDiv.innerHTML = data.alerts.length
            ? data.alerts.map(alert => `<p>${alert}</p>`).join('')
            : 'No alerts.';

        // Update chart
        updateChart(data);
    } catch (error) {
        console.error('Error fetching plant data:', error);
    }
}

// Initialize Chart.js
let statusChart;
function initChart() {
    const ctx = document.getElementById('status-chart').getContext('2d');
    statusChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Temperature', 'Humidity', 'Light (LDR)', 'Soil Moisture'],
            datasets: [{
                label: 'Current Values',
                data: [0, 0, 0, 0], // Initial placeholder values
                backgroundColor: ['#4caf50', '#2196f3', '#ffeb3b', '#795548'],
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Update Chart.js with new data
function updateChart(data) {
    const chartData = [
        data.temperature || 0,
        data.humidity || 0,
        data.ldr || 0,
        data.moisture || 0,
    ];
    statusChart.data.datasets[0].data = chartData;
    statusChart.update();
}

// Handle manual watering
document.getElementById('water-plant').addEventListener('click', () => {
    console.log('Watering plant...');
    // Optional: Send a request to the backend to manually activate the pump
});

// Initialize
initChart();
fetchPlantData();
setInterval(fetchPlantData, 10000); 
