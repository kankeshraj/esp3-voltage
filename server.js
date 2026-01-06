const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Store latest ESP32 data
let latestESP32Data = {
    current: null,
    voltage: null,
    timing: null,
    timestamp: null
};

// Endpoint to receive data from ESP32
app.post('/api/esp32-data', (req, res) => {
    const { current, voltage, timing } = req.body;
    
    // Validate and store data
    if (current !== undefined) latestESP32Data.current = parseFloat(current);
    if (voltage !== undefined) latestESP32Data.voltage = parseFloat(voltage);
    if (timing !== undefined) latestESP32Data.timing = timing;
    latestESP32Data.timestamp = new Date();
    
    console.log('Received ESP32 data:', latestESP32Data);
    
    res.json({ 
        success: true, 
        message: 'Data received successfully',
        data: latestESP32Data
    });
});

// Endpoint to get latest ESP32 data (for polling)
app.get('/api/esp32-data', (req, res) => {
    res.json(latestESP32Data);
});

// Serve the HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server - listen on all network interfaces
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Server accessible at http://10.131.82.230:${PORT}`);
    console.log(`ESP32 can send data to: http://10.131.82.230:${PORT}/api/esp32-data`);
    console.log(`Open http://localhost:${PORT} or http://10.131.82.230:${PORT} in your browser`);
});