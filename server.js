const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : {
    rejectUnauthorized: false,
  },
});

// Connect to database with error handling
client.connect().catch(err => {
  console.error('❌ Database connection error:', err.message);
  console.log('💡 Make sure you have a DATABASE_URL environment variable set, or run without database features');
});

const commercialPrefixes = ['UAL', 'AAL', 'SWA', 'SKW', 'DAL', 'ASA', 'FFT', 'JBU', 'ASH', 'ENY', 'RPA', 'QXE']; // removed NKS
const militaryPrefixes = ['RCH', 'MC', 'VV', 'VM', 'BAF', 'NATO', 'ROF', 'GAF'];

function categorizeFlight(callsign) {
  const tailNumber = callsign?.replace(/\s/g, '') || '';
  const isCommercial = commercialPrefixes.some(prefix => tailNumber.startsWith(prefix));
  const isMilitary = militaryPrefixes.some(prefix => tailNumber.startsWith(prefix));
  const isPrivate = tailNumber.startsWith('N');

  if (isCommercial) return 'Commercial';
  if (isMilitary) return 'Military';
  if (isPrivate) return 'Private';
  return 'Possibly Private or Non-U.S.';
}

app.get('/planes-near-gunnison', async (req, res) => {
  try {
    // Use authenticated API if credentials are available, otherwise use public API
    const apiUrl = process.env.OPENSKY_USER && process.env.OPENSKY_PASS
      ? `https://${process.env.OPENSKY_USER}:${process.env.OPENSKY_PASS}@opensky-network.org/api/states/all`
      : 'https://opensky-network.org/api/states/all';
    
    const response = await axios.get(apiUrl, {
      params: {
        lamin: 38,
        lamax: 39,
        lomin: -107.4,
        lomax: -106.4,
      },
      timeout: 20000,
    });

    const states = response.data.states || [];
    console.log('Fetched Flight Data:', states.length);

    const planes = states.filter(plane => {
      const latitude = plane[6];
      const longitude = plane[5];
      return latitude >= 38 && latitude <= 39 && longitude >= -107.4 && longitude <= -106.4;
    }).map(plane => {
      const callsign = plane[1]?.trim();
      const altitude = plane[7];
      const verticalRate = plane[11];
      const onGround = plane[8];
      const category = categorizeFlight(callsign);
      const landingStatus = onGround ? '🟢 On Ground' : verticalRate < 0 && altitude < 10000 ? '🔻 Likely Landing Soon' : '🟠 In Air';
      const ownerLookup = category === "Private" && callsign ? `https://registry.faa.gov/aircraftinquiry/Search/NNumberResult?nNumberTxt=${callsign.replace(/^N/, '')}` : null;

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
        timestamp: plane[4] ? plane[4] * 1000 : Date.now(),
      };
    });

    // Only try to save to database if DATABASE_URL is available
    if (process.env.DATABASE_URL) {
      for (let plane of planes) {
        if (plane.label === 'Private') {
          try {
            const checkQuery = {
              text: 'SELECT COUNT(*) FROM flights WHERE icao24 = $1',
              values: [plane.icao24],
            };

            const result = await client.query(checkQuery);
            const count = parseInt(result.rows[0].count);

            if (count === 0) {
              const query = {
                text: 'INSERT INTO flights(icao24, callsign, origin_country, latitude, longitude, altitude, velocity, on_ground, category, landing_status) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                values: [
                  plane.icao24,
                  plane.callsign,
                  plane.originCountry,
                  plane.latitude,
                  plane.longitude,
                  plane.altitude,
                  plane.velocity,
                  plane.onGround,
                  plane.label,
                  plane.landingStatus,
                ],
              };

              await client.query(query);
            }
          } catch (dbError) {
            console.error('❌ Database error for plane', plane.callsign, ':', dbError.message);
            // Continue processing other planes even if one fails
          }
        }
      }
    }

    res.status(200).json(planes);
  } catch (error) {
    console.error('❌ Error in /planes-near-gunnison:', error);
    res.status(500).send('Error fetching or inserting flight data.');
  }
});

app.get('/private-planes-logs', async (req, res) => {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(200).json([]);
    }
    
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

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});

