# gunnison-airport-tracker

# Gunnison Airport Flight Tracker

## Overview

This project tracks flights near Gunnison Airport (KGUC) in real-time, providing up-to-date information on nearby planes. It categorizes flights as **Private**, **Commercial**, or **Military**, displays their current status (whether they are in the air, grounded, or landing soon), and logs **Private** flights seen more than once into a PostgreSQL database.

The app fetches live data from the OpenSky API, categorizes flights, and displays them in a user-friendly web interface. The database is updated with only **Private** flights.
---

## Live Demo

You can view the live version of the project here:

[Live Demo](https://gunnison-airport-tracker-28d8dfff50df.herokuapp.com/)


## Features

- **Real-Time Flight Tracking**: Displays live data on flights near Gunnison Airport, including their altitude, velocity, location, and origin.
- **Flight Categorization**: Categorizes flights as **Private**, **Commercial**, or **Military** based on their callsign prefix.
- **Landing Status**: Displays the landing status of each flight (e.g., "In Air", "On Ground", "Likely Landing Soon").
- **Database Logging**: Logs **Private** flights seen more than once into a PostgreSQL database.
- **FAA Lookup**: Provides a link to lookup **Private** planes on the FAA registry for more detailed information.
- **API Integration**: Fetches data from the OpenSky API and PostgreSQL to display relevant flight data in real time.

---

## Technologies Used

- **Backend**: Node.js, Express.js, PostgreSQL
- **Frontend**: HTML, CSS, JavaScript
- **Database**: PostgreSQL for storing flight data
- **External API**: OpenSky Network API for flight data
- **Environment Variables**: `.env` file to securely manage database credentials

---

## How It Works

1. **Fetch Flight Data**: The server fetches real-time flight data from the OpenSky API, which provides information about flights in the vicinity of Gunnison Airport.
2. **Categorize Flights**: Based on the flight's callsign, it determines whether the flight is **Private**, **Commercial**, or **Military**.
3. **Determine Landing Status**: The flight’s landing status is determined based on its altitude and vertical rate. It categorizes flights as:
   - **🟠 In Air**
   - **🟢 On Ground**
   - **🔻 Likely Landing Soon**
4. **Log Data to PostgreSQL**: Only **Private** flights seen more than once are logged into the PostgreSQL database. This avoids duplicate entries and ensures that the data logged is meaningful.
5. **Web Interface**: The web interface displays the live data, including links to **FAA Lookup** for private planes, and it categorizes the flights along with their landing status.

---

## Setup and Installation

### Prerequisites

- **Node.js** (v14 or higher)
- **PostgreSQL** (local or cloud setup)
- **npm** (Node Package Manager)

### Installation

1. Clone this repository to your local machine:

    ```bash
    git clone https://github.com/eesterlein/gunnison-airport-tracker.git
    cd gunnison-airport-flight-tracker
    ```

2. Install the required dependencies:

    ```bash
    npm install
    ```

3. Create a `.env` file in the root directory and add the following configuration:

    ```bash
    DB_USER=your_db_user
    DB_HOST=localhost
    DB_NAME=flight_tracker
    DB_PASSWORD=your_db_password
    DB_PORT=5432
    ```

4. Create a PostgreSQL database:

    ```bash
    psql -U postgres
    CREATE DATABASE flight_tracker;
    ```

5. Run the application:

    ```bash
    node server.js
    ```

6. Open your browser and visit:

    ```
    http://localhost:3000
    ```

    You should see the **Gunnison Airport Flight Tracker** page displaying real-time flight data.

---

## Database Setup

To create the `flights` table, run the following SQL script in your PostgreSQL database:

```sql
CREATE TABLE flights (
  id SERIAL PRIMARY KEY,
  icao24 VARCHAR(255) NOT NULL,
  callsign VARCHAR(255) NOT NULL,
  origin_country VARCHAR(255),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  altitude DOUBLE PRECISION,
  velocity DOUBLE PRECISION,
  on_ground BOOLEAN,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  category VARCHAR(255),
  landing_status VARCHAR(255)
);
