const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.static('public'));


// Homepage
app.get('/', (req, res) => {
 res.sendFile(__dirname + '/public/index.html');
});


// ✈️ Nearby planes near Gunnison Airport with enhanced details
app.get('/planes-near-gunnison', async (req, res) => {
 try {
   const response = await axios.get('https://opensky-network.org/api/states/all', {
     params: {
       lamin: 38,     // min latitude
       lamax: 39,     // max latitude
       lomin: -107.4,   // min longitude
       lomax: -106.4    // max longitude
     }
   });


   const commercialPrefixes = ['UAL', 'AAL', 'SWA', 'SKW', 'DAL', 'ASA', 'FFT', 'JBU', 'NKS', 'ASH', 'ENY', 'RPA', 'QXE'];
   const militaryPrefixes = ['RCH', 'MC', 'VV', 'VM', 'BAF', 'NATO', 'ROF', 'GAF'];


   const states = response.data.states || [];


   const planes = states.map(plane => {
     const callsign = plane[1]?.trim();
     const altitude = plane[7];
     const verticalRate = plane[11];
     const onGround = plane[8];
     const tailNumber = callsign?.replace(/\s/g, '') || '';


     const isPrivate = tailNumber.startsWith('N');
     const isCommercial = commercialPrefixes.some(prefix => tailNumber.startsWith(prefix));
     const isMilitary = militaryPrefixes.some(prefix => tailNumber.startsWith(prefix));


     let label = '❓ Unknown';
     if (isPrivate) {
       label = '🛩️ Private';
     } else if (isCommercial) {
       label = '✈️ Commercial';
     } else if (isMilitary) {
       label = '🪖 Military';
     } else {
       label = '🛩️ Possibly Private or Non-U.S.';
     }


     const ownerLookup = isPrivate && tailNumber
       ? `https://registry.faa.gov/aircraftinquiry/Search/NNumberResult?nNumberTxt=${tailNumber.replace(/^N/, '')}`
       : null;


     const landingStatus = onGround
       ? '🟢 On Ground'
       : verticalRate < 0 && altitude < 10000
         ? '🔻 Likely Landing Soon'
         : '🟠 In Air';


     return {
       icao24: plane[0],
       callsign: callsign || 'Unknown',
       originCountry: plane[2],
       longitude: plane[5],
       latitude: plane[6],
       altitude,
       onGround,
       velocity: plane[9],
       label,
       landingStatus,
       ownerLookup,
       timestamp: plane[4] ? plane[4] * 1000 : Date.now()
     };
   });


   res.json(planes);
 } catch (error) {
   console.error('Failed to fetch planes:', error.message);
   res.status(500).json({ error: 'Error retrieving planes' });
 }
});


app.listen(PORT, () => {
 console.log(`🚀 Server is running at http://localhost:${PORT}`);
});





