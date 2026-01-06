// Data storage
let esp32Data = {
    current: null,
    voltage: null,
    timing: null,
    lastUpdate: null
};

let unitConsumptions = [];
let dataHistory = [];

// Poll ESP32 data every 2 seconds
const POLL_INTERVAL = 2000;
const SERVER_URL = 'http://10.219.105.230:3000/api/esp32-data';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    startPolling();
    loadFromLocalStorage();
    renderDataHistory();
});

// Poll ESP32 data from server
function startPolling() {
    fetchESP32Data();
    setInterval(fetchESP32Data, POLL_INTERVAL);
}

async function fetchESP32Data() {
    try {
        const response = await fetch(SERVER_URL);
        if (response.ok) {
            const data = await response.json();
            // Check if we have valid data (not all null)
            if (data && (data.current !== null || data.voltage !== null || data.timing !== null)) {
                updateESP32Display(data);
                updateStatus(true);
            } else {
                // Data exists but all values are null (ESP32 not connected yet)
                updateStatus(false);
            }
        } else {
            updateStatus(false);
        }
    } catch (error) {
        console.error('Error fetching ESP32 data:', error);
        updateStatus(false);
    }
}

function updateESP32Display(data) {
    // Update current value
    if (data.current !== undefined && data.current !== null) {
        esp32Data.current = data.current;
        const currentElement = document.getElementById('current');
        currentElement.textContent = data.current.toFixed(2);
        currentElement.classList.add('updated');
        setTimeout(() => currentElement.classList.remove('updated'), 500);
    } else if (data.current === null) {
        document.getElementById('current').textContent = '--';
    }
    
    // Update voltage value
    if (data.voltage !== undefined && data.voltage !== null) {
        esp32Data.voltage = data.voltage;
        const voltageElement = document.getElementById('voltage');
        voltageElement.textContent = data.voltage.toFixed(2);
        voltageElement.classList.add('updated');
        setTimeout(() => voltageElement.classList.remove('updated'), 500);
    } else if (data.voltage === null) {
        document.getElementById('voltage').textContent = '--';
    }
    
    // Update timing value
    if (data.timing !== undefined && data.timing !== null) {
        esp32Data.timing = data.timing;
        const timingElement = document.getElementById('timing');
        timingElement.textContent = formatTiming(data.timing);
        timingElement.classList.add('updated');
        setTimeout(() => timingElement.classList.remove('updated'), 500);
    } else if (data.timing === null) {
        document.getElementById('timing').textContent = '--';
    }
    
    esp32Data.lastUpdate = new Date();
    
    // Update last update time in status
    const statusText = document.getElementById('status-text');
    if (statusText) {
        const timeStr = esp32Data.lastUpdate.toLocaleTimeString();
        statusText.textContent = `Connected to ESP32 - Last update: ${timeStr}`;
    }
}

function formatTiming(timing) {
    if (typeof timing === 'number') {
        // If timing is in seconds
        const hours = Math.floor(timing / 3600);
        const minutes = Math.floor((timing % 3600) / 60);
        const seconds = Math.floor(timing % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return timing;
}

function updateStatus(isOnline) {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    if (isOnline) {
        indicator.className = 'status-indicator status-online';
        if (esp32Data.lastUpdate) {
            const timeStr = esp32Data.lastUpdate.toLocaleTimeString();
            statusText.textContent = `Connected to ESP32 - Last update: ${timeStr}`;
        } else {
            statusText.textContent = 'Connected to ESP32';
        }
    } else {
        indicator.className = 'status-indicator status-offline';
        statusText.textContent = 'Waiting for ESP32 data...';
    }
}

function addUnitConsumption() {
    const input = document.getElementById('unit-consumption');
    const value = parseFloat(input.value);
    
    if (isNaN(value) || value <= 0) {
        alert('Please enter a valid positive number for unit consumption');
        return;
    }
    
    unitConsumptions.push({
        value: value,
        timestamp: new Date()
    });
    
    input.value = '';
    renderUnitList();
    
    // If we have ESP32 data, add to history
    if (esp32Data.current !== null && esp32Data.voltage !== null) {
        addToHistory();
    }
    
    saveToLocalStorage();
}

function renderUnitList() {
    const unitList = document.getElementById('unit-list');
    
    if (unitConsumptions.length === 0) {
        unitList.innerHTML = '<p class="empty-message">No units added yet</p>';
        return;
    }
    
    unitList.innerHTML = unitConsumptions.map((unit, index) => `
        <div class="unit-item">
            <span>${unit.value.toFixed(2)} kWh - ${formatDateTime(unit.timestamp)}</span>
            <button onclick="removeUnit(${index})" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Remove</button>
        </div>
    `).join('');
}

function removeUnit(index) {
    unitConsumptions.splice(index, 1);
    renderUnitList();
    saveToLocalStorage();
}

function addToHistory() {
    const historyEntry = {
        timestamp: new Date(),
        current: esp32Data.current,
        voltage: esp32Data.voltage,
        timing: esp32Data.timing,
        unitConsumption: unitConsumptions.length > 0 ? unitConsumptions[unitConsumptions.length - 1].value : null
    };
    
    dataHistory.push(historyEntry);
    renderDataHistory();
    saveToLocalStorage();
}

function renderDataHistory() {
    const tbody = document.getElementById('table-body');
    
    if (dataHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999; font-style: italic;">No data recorded yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = dataHistory.map(entry => `
        <tr>
            <td>${formatDateTime(entry.timestamp)}</td>
            <td>${entry.current !== null ? entry.current.toFixed(2) : '--'}</td>
            <td>${entry.voltage !== null ? entry.voltage.toFixed(2) : '--'}</td>
            <td>${entry.timing !== null ? formatTiming(entry.timing) : '--'}</td>
            <td>${entry.unitConsumption !== null ? entry.unitConsumption.toFixed(2) : '--'}</td>
        </tr>
    `).join('');
}

function formatDateTime(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    return date.toLocaleString();
}

function exportToCSV() {
    if (dataHistory.length === 0) {
        alert('No data to export. Please add some data first.');
        return;
    }
    
    // CSV Header
    const headers = ['Timestamp', 'Current (A)', 'Voltage (V)', 'Timing', 'Unit Consumption (kWh)'];
    
    // CSV Rows
    const rows = dataHistory.map(entry => [
        formatDateTime(entry.timestamp),
        entry.current !== null ? entry.current.toFixed(2) : '',
        entry.voltage !== null ? entry.voltage.toFixed(2) : '',
        entry.timing !== null ? formatTiming(entry.timing) : '',
        entry.unitConsumption !== null ? entry.unitConsumption.toFixed(2) : ''
    ]);
    
    // Combine headers and rows
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `esp32_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function clearData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        dataHistory = [];
        unitConsumptions = [];
        esp32Data = {
            current: null,
            voltage: null,
            timing: null,
            lastUpdate: null
        };
        
        document.getElementById('current').textContent = '--';
        document.getElementById('voltage').textContent = '--';
        document.getElementById('timing').textContent = '--';
        
        renderDataHistory();
        renderUnitList();
        saveToLocalStorage();
    }
}

function saveToLocalStorage() {
    try {
        localStorage.setItem('esp32DataHistory', JSON.stringify(dataHistory));
        localStorage.setItem('unitConsumptions', JSON.stringify(unitConsumptions));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const savedHistory = localStorage.getItem('esp32DataHistory');
        const savedUnits = localStorage.getItem('unitConsumptions');
        
        if (savedHistory) {
            dataHistory = JSON.parse(savedHistory);
            // Convert timestamp strings back to Date objects
            dataHistory.forEach(entry => {
                entry.timestamp = new Date(entry.timestamp);
            });
        }
        
        if (savedUnits) {
            unitConsumptions = JSON.parse(savedUnits);
            // Convert timestamp strings back to Date objects
            unitConsumptions.forEach(unit => {
                unit.timestamp = new Date(unit.timestamp);
            });
        }
        
        renderDataHistory();
        renderUnitList();
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
}