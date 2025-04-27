const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

// PostgreSQL Client Setup
const { Client } = require('pg');
require('dotenv').config(); // This loads environment variables from your .env file

// PostgreSQL Client Setup using environment variables
const client = new Client({
  user: process.env.DB_USER,  // Get the username from the environment variable
  host: process.env.DB_HOST,  // Get the host from the environment variable
  database: process.env.DB_NAME,  // Get the database name from the environment variable
  password: process.env.DB_PASSWORD,  // Get the password from the environment variable
  port: process.env.DB_PORT,  // Get the port from the environment variable
});

client.connect();

// Commercial and Military Prefixes
const commercialPrefixes = ['UAL', 'AAL', 'SWA', 'SKW', 'DAL', 'ASA', 'FFT', 'JBU', 'NKS', 'ASH', 'ENY', 'RPA', 'QXE'];
const militaryPrefixes = ['RCH', 'MC', 'VV', 'VM', 'BAF', 'NATO', 'ROF', 'GAF'];

// Categorize Flights
function categorizeFlight(callsign) {
  const tailNumber = callsign?.replace(/\s/g, '') || '';
  
  const isPrivate = tailNumber.startsWith('N');
  const isCommercial = commercialPrefixes.some(prefix => tailNumber.startsWith(prefix));
  const isMilitary = militaryPrefixes.some(prefix => tailNumber.startsWith(prefix));

  let category = 'Unknown';
  if (isPrivate) {
    category = 'Private';
  } else if (isCommercial) {
    category = 'Commercial';
  } else if (isMilitary) {
    category = 'Military';
  } else {
    category = 'Possibly Private or Non-U.S.';
  }

  return category;
}

// Fetch flights near Gunnison from OpenSky API and insert into PostgreSQL
app.get('/planes-near-gunnison', async (req, res) => {
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
    console.log('Fetched Flight Data:', states);  // This will show the data in your terminal

    const planes = states.filter(plane => {
      const latitude = plane[6];
      const longitude = plane[5];

      // Filter only flights above Gunnison Airport (latitude 38-39 and longitude -107.4 to -106.4)
      return latitude >= 38 && latitude <= 39 && longitude >= -107.4 && longitude <= -106.4;
    }).map(plane => {
      const callsign = plane[1]?.trim();
      const altitude = plane[7];
      const verticalRate = plane[11];
      const onGround = plane[8];

      // Determine the category (Private, Commercial, Military, etc.)
      const category = categorizeFlight(callsign);

      // Determine landing status
      const landingStatus = onGround
        ? '🟢 On Ground'
        : verticalRate < 0 && altitude < 10000
          ? '🔻 Likely Landing Soon'
          : '🟠 In Air';

      const ownerLookup = category === "Private" && callsign
        ? `https://registry.faa.gov/aircraftinquiry/Search/NNumberResult?nNumberTxt=${callsign.replace(/^N/, '')}`
        : null;

      return {
        icao24: plane[0],
        callsign: callsign || 'Unknown',
        originCountry: plane[2],
        longitude: plane[5],
        latitude: plane[6],
        altitude,
        onGround,
        velocity: plane[9],
        label: category,
        landingStatus,
        ownerLookup,
        timestamp: plane[4] ? plane[4] * 1000 : Date.now()
      };
    });

    // Insert into database if not a commercial flight
    for (let plane of planes) {
      if (plane.label !== 'Commercial') {
        const query = {
          text: 'INSERT INTO flights(icao24, callsign, origin_country, latitude, longitude, altitude, velocity, on_ground, category, landing_status) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (icao24) DO NOTHING', // Prevents duplicate entries
          values: [plane.icao24, plane.callsign, plane.originCountry, plane.latitude, plane.longitude, plane.altitude, plane.velocity, plane.onGround, plane.label, plane.landingStatus],
        };
        await client.query(query);
      }
    }

    // Send the flight data as a JSON response to the frontend
    res.status(200).json(planes);
  } catch (error) {
    console.error('Error fetching or inserting flight data:', error);
    res.status(500).send('Error fetching or inserting flight data.');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
