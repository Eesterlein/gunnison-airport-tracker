const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Commercial and Military Prefixes
const commercialPrefixes = ['UAL', 'AAL', 'SWA', 'SKW', 'DAL', 'ASA', 'FFT', 'JBU', 'NKS', 'ASH', 'ENY', 'RPA', 'QXE'];
const militaryPrefixes = ['RCH', 'MC', 'VV', 'VM', 'BAF', 'NATO', 'ROF', 'GAF'];

// Categorize Flights
function categorizeFlight(callsign) {
  const tailNumber = callsign?.replace(/\s/g, '') || '';

  const isCommercial = commercialPrefixes.some(prefix => tailNumber.startsWith(prefix));
  const isMilitary = militaryPrefixes.some(prefix => tailNumber.startsWith(prefix));
  const isPrivate = tailNumber.startsWith('N');

  let category = 'Unknown';
  if (isCommercial) {
    category = 'Commercial';
  } else if (isMilitary) {
    category = 'Military';
  } else if (isPrivate) {
    category = 'Private';
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
      },
      timeout: 20000,  // Set timeout to 20 seconds
    });

    const states = response.data.states || [];
    console.log('Fetched Flight Data:', states);  // This will show the data in your terminal

    if (states.length === 0) {
      console.log('No flights found.');
    }

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

    // Insert into database if not a commercial flight (and prevent duplicates)
    for (let plane of planes) {
      if (plane.label === 'Private') {
        const checkQuery = {
          text: 'SELECT COUNT(*) FROM flights WHERE icao24 = $1',
          values: [plane.icao24],
        };

        const res = await client.query(checkQuery);
        const count = res.rows[0].count;

        // Only log if the plane hasn't been seen before
        if (parseInt(count) === 0) {
          const query = {
            text: 'INSERT INTO flights(icao24, callsign, origin_country, latitude, longitude, altitude, velocity, on_ground, category, landing_status) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            values: [plane.icao24, plane.callsign, plane.originCountry, plane.latitude, plane.longitude, plane.altitude, plane.velocity, plane.onGround, plane.label, plane.landingStatus],
          };
          
          const insertResult = await client.query(query);
          console.log('Inserted Plane Data:', insertResult.rows);
        }
      }
    }

    // Send the flight data as a JSON response to the frontend
    res.status(200).json(planes);
  } catch (error) {
    console.error('Error fetching or inserting flight data:', error);
    res.status(500).send('Error fetching or inserting flight data.');
  }
});

// Fetch private planes from PostgreSQL database (includes owner_name)
app.get('/private-planes-logs', async (req, res) => {
  try {
    const result = await client.query(
      'SELECT callsign, category, landing_status, altitude, velocity, owner_name FROM flights WHERE category = $1',
      ['Private']
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching private plane logs:', error);
    res.status(500).send('Error fetching private plane logs.');
  }
});
// Periodic refresh (every hour) - you might not need this if fetchFlights is not defined
// setInterval(async () => {
//   console.log('Refreshing flight data...');
//   // await fetchFlights();  // You can call fetchFlights from here to refresh data periodically
// }, 60 * 60 * 1000); // Refresh every hour

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
