const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const { Client } = require('pg');

// Initialize express app
const app = express();

// Other necessary configuration and middleware
app.use(cors());
app.use(express.static('public'));

// PostgreSQL Client Setup (Only use DATABASE_URL)
const client = new Client({
  connectionString: process.env.DATABASE_URL,  // Use the DATABASE_URL provided by Heroku
  ssl: {
    rejectUnauthorized: false,  // Required for Heroku Postgres SSL connections
  },
});

client.connect();

// Define your route logic below
// Example of categorizing flight data (already present)
app.get('/planes-near-gunnison', async (req, res) => {
  try {
    const response = await axios.get('https://opensky-network.org/api/states/all', {
      params: {
        lamin: 38,     // min latitude
        lamax: 39,     // max latitude
        lomin: -107.4, // min longitude
        lomax: -106.4  // max longitude
      },
      timeout: 20000,  // Set timeout to 20 seconds
    });

    const states = response.data.states || [];
    console.log('Fetched Flight Data:', states);

    // Filter and categorize the flight data...
    const planes = states.map(plane => {
      // Process the flight data and categorize
    });

    // Respond with the flight data
    res.status(200).json(planes);
  } catch (error) {
    console.error('Error fetching or inserting flight data:', error);
    res.status(500).send('Error fetching or inserting flight data.');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
