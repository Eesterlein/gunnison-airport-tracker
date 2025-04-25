const express = require('express');
const axios = require('axios');
const { Client } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

// PostgreSQL Client Setup
const client = new Client({
  user: 'Elissa',         // Your Postgres username
  host: 'localhost',
  database: 'flight_tracker',
  password: 'yourpassword',  // Your Postgres password
  port: 5432,
});

client.connect();

// Fetch flights near Gunnison from OpenSky API and insert into PostgreSQL
app.get('/fetch-planes', async (req, res) => {
  try {
    // Fetch flight data from OpenSky API
    const response = await axios.get('https://opensky-network.org/api/states/all', {
      params: {
        lamin: 38,     // min latitude
        lamax: 39,     // max latitude
        lomin: -107.4,   // min longitude
        lomax: -106.4    // max longitude
      }
    });

    const states = response.data.states || [];

    // Loop through each flight and insert into PostgreSQL
    for (let plane of states) {
      const callsign = plane[1]?.trim();
      const icao24 = plane[0];
      const origin_country = plane[2];
      const latitude = plane[6];
      const longitude = plane[5];
      const altitude = plane[7];
      const velocity = plane[9];
      const on_ground = plane[8];

      // Insert into flights table
      const query = {
        text: 'INSERT INTO flights(icao24, callsign, origin_country, latitude, longitude, altitude, velocity, on_ground) VALUES($1, $2, $3, $4, $5, $6, $7, $8)',
        values: [icao24, callsign, origin_country, latitude, longitude, altitude, velocity, on_ground],
      };

      await client.query(query);
    }

    res.status(200).send('Data fetched and inserted successfully.');
  } catch (error) {
    console.error('Error fetching or inserting flight data:', error);
    res.status(500).send('Error fetching or inserting flight data.');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});




