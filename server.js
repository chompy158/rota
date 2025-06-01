// server.js
const express = require('express');
const path = require('path');
const fs = require('fs'); // Node.js File System module
const bodyParser = require('body-parser'); // For parsing JSON data from requests

const app = express();
const port = process.env.PORT || 27013; // Pterodactyl usually assigns ports, check your egg's config

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// Define the path to your data file on the server
// This file will store your rota and notes data persistently
const DATA_FILE = path.join(__dirname, 'rota_data.json');

// API Endpoint: GET /api/rota
// This will send the current rota data to the frontend
app.get('/api/rota', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            // If the file doesn't exist yet (first run), return empty data
            if (err.code === 'ENOENT') {
                return res.json({ rota: {}, notes: '', lastUpdated: null });
            }
            console.error('Error reading rota data:', err);
            return res.status(500).json({ message: 'Error retrieving rota data' });
        }
        // If file exists, parse its content and send it
        try {
            res.json(JSON.parse(data));
        } catch (parseError) {
            console.error('Error parsing rota data JSON:', parseError);
            res.status(500).json({ message: 'Error parsing stored rota data' });
        }
    });
});

// API Endpoint: POST /api/rota
// This will receive updated rota data from the frontend and save it
app.post('/api/rota', (req, res) => {
    // Extract rota, notes, and lastUpdated from the request body
    const { rota, notes, lastUpdated } = req.body;
    const newData = { rota, notes, lastUpdated };

    // Write the new data to the JSON file
    fs.writeFile(DATA_FILE, JSON.stringify(newData, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Error writing rota data:', err);
            return res.status(500).json({ message: 'Error saving rota data' });
        }
        res.status(200).json({ message: 'Rota data saved successfully' });
    });
});

// Serve static files from the 'build' directory (your compiled React app)
app.use(express.static(path.join(__dirname, 'build')));

// All other GET requests will serve the React app's index.html
// This is important for client-side routing (e.g., if you had /admin, /home etc.)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`React static server listening on port ${port}`);
});