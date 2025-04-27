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

// Fetch private plane logs from the database
async function fetchPrivatePlanesLogs() {
  const tableContainer = document.getElementById('private-planes-logs').getElementsByTagName('tbody')[0];
  tableContainer.innerHTML = 'Loading logs...';

  try {
    const res = await fetch('/private-planes-logs');
    const logs = await res.json();

    tableContainer.innerHTML = '';  // Clear existing table

    if (!logs.length) {
      tableContainer.innerHTML = '<tr><td colspan="5">No private plane logs available.</td></tr>';
      return;
    }

    logs.forEach(log => {
      const row = tableContainer.insertRow();
      row.innerHTML = `
        <td>${log.callsign}</td>
        <td>${log.category}</td>
        <td>${log.landing_status}</td>
        <td>${log.altitude}</td>
        <td>${log.velocity}</td>
      `;
    });
  } catch (err) {
    console.error('❌ Error fetching private plane logs:', err);
    tableContainer.innerHTML = '<tr><td colspan="5">Failed to load logs. Please try again later.</td></tr>';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  fetchFlights();  // Fetch flight data
  fetchPrivatePlanesLogs();  // Fetch private plane logs from the database
});
