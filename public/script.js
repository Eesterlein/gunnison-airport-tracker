async function fetchFlights() {
    const list = document.getElementById('plane-list');
    list.innerHTML = '<li>Loading flight data...</li>';

    try {
        const res = await fetch('/planes-near-gunnison');
        const data = await res.json();
        list.innerHTML = '';

        if (!data.length) {
            list.innerHTML = '<li>No flights near Gunnison Airport right now.</li>';
            return;
        }

        data.forEach(flight => {
            const li = document.createElement('li');
            
            // Build buttons conditionally
            let links = `<a href="https://globe.adsbexchange.com/?icao=${flight.icao24}" target="_blank">🔎 View on ADS-B Exchange</a>`;
            if (flight.ownerLookup) {
                links += ` | <a href="${flight.ownerLookup}" target="_blank">🔍 FAA Lookup</a>`;
            }

            li.innerHTML = `
                <strong>${flight.callsign}</strong> – ${flight.label} – ${flight.landingStatus}<br>
                Origin: ${flight.originCountry}<br>
                Altitude: ${flight.altitude} m<br>
                Velocity: ${flight.velocity} m/s<br>
                Location: [${flight.latitude}, ${flight.longitude}]<br>
                ${links}<br><hr>
            `;
            list.appendChild(li);
        });
    } catch (err) {
        console.error('❌ Error fetching flight data:', err);
        list.innerHTML = '<li>Failed to load flights. Please try again later.</li>';
    }
}

async function fetchLoggedFlights() {
    const table = document.getElementById('flight-table').getElementsByTagName('tbody')[0];
    table.innerHTML = '';

    try {
        const res = await fetch('/api/flights');
        const data = await res.json();

        data.forEach(flight => {
            const row = table.insertRow();
            row.insertCell(0).textContent = flight.callsign;
            row.insertCell(1).textContent = flight.category;
            row.insertCell(2).textContent = flight.landing_status;
            row.insertCell(3).textContent = flight.altitude;
            row.insertCell(4).textContent = flight.velocity;
        });
    } catch (err) {
        console.error('❌ Error fetching logged flight data:', err);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    fetchFlights();
    fetchLoggedFlights();
});
