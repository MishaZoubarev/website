require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cron = require("node-cron");
const twilio = require("twilio");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_PHONE = process.env.TWILIO_PHONE;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const AVIATIONSTACK_API_KEY = process.env.AVIATIONSTACK_API_KEY;

const weatherSubscribers = [];
const flightSubscribers = [];

app.use(bodyParser.json());

/* ========== API ROUTES FIRST ========== */

// ✅ Weather SMS
app.post("/subscribe", async (req, res) => {
  const { phone, city, time } = req.body;
  if (!phone || !city || !time) return res.status(400).json({ message: "All fields are required." });
  weatherSubscribers.push({ phone, city, time });
  try {
    await sendWeatherUpdates();
    res.json({ message: "Subscription successful! You will receive daily weather updates." });
  } catch (err) {
    console.error("Weather SMS Error:", err);
    res.status(500).json({ message: "Error sending SMS." });
  }
});

const sendWeatherUpdates = async () => {
  for (let user of weatherSubscribers) {
    try {
      const { phone, city } = user;
      const weather = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`);
      const temp = weather.data.main.temp;
      const desc = weather.data.weather[0].description;
      const msg = `🌤️ Weather Update for ${city}: ${desc.toUpperCase()}, Temp: ${temp}°C`;

      await twilioClient.messages.create({ body: msg, from: TWILIO_PHONE, to: phone });
      console.log("✅ Sent to", phone);
    } catch (err) {
      console.error("❌ Weather Error for", user.phone, err.message);
    }
  }
};

// ✅ Flight info lookup
app.get("/api/flight-info", async (req, res) => {
  const { flight } = req.query;
  if (!flight) return res.status(400).json({ message: "Flight number is required." });

  try {
    const response = await axios.get(`http://api.aviationstack.com/v1/flights?access_key=${AVIATIONSTACK_API_KEY}&flight_iata=${flight}`);
    const data = response.data.data[0];
    if (!data) return res.status(404).json({ message: "Flight not found." });

    const result = {
      airline: data.airline.name,
      flight: data.flight.iata,
      departure: data.departure.airport,
      arrival: data.arrival.airport,
      status: data.flight_status,
      estimated_arrival: data.arrival.estimated,
    };
    res.json(result);
  } catch (err) {
    console.error("Flight API Error:", err.message);
    res.status(500).json({ message: "Could not fetch flight data." });
  }
});

// ✅ Flight SMS
app.post("/subscribe-flight", async (req, res) => {
  const { phone, flight, time } = req.body;
  if (!phone || !flight || !time) return res.status(400).json({ message: "All fields are required." });

  try {
    const response = await axios.get(`http://api.aviationstack.com/v1/flights?access_key=${AVIATIONSTACK_API_KEY}&flight_iata=${flight}`);
    const data = response.data.data[0];
    if (!data) return res.status(404).json({ message: "Flight not found." });

    const msg = `✈️ Flight ${flight} (${data.airline.name}): Status - ${data.flight_status}. ETA: ${data.arrival.estimated}`;
    await twilioClient.messages.create({ body: msg, from: TWILIO_PHONE, to: phone });

    res.json({ message: "Flight SMS sent!" });
  } catch (err) {
    console.error("❌ Flight SMS Error:", err.message);
    res.status(500).json({ message: "Failed to send flight SMS." });
  }
});

const sendFlightUpdates = async () => {
  for (let user of flightSubscribers) {
    try {
      const { phone, flight } = user;
      const response = await axios.get(`http://api.aviationstack.com/v1/flights?access_key=${AVIATIONSTACK_API_KEY}&flight_iata=${flight}`);
      const data = response.data.data[0];
      if (!data) continue;

      const msg = `✈️ Flight ${flight} (${data.airline.name}): Status - ${data.flight_status}. ETA: ${data.arrival.estimated}`;
      await twilioClient.messages.create({ body: msg, from: TWILIO_PHONE, to: phone });
      console.log("📡 Flight alert sent to", phone);
    } catch (err) {
      console.error("❌ Flight SMS Error:", err.message);
    }
  }
};

// ✅ NHL Player Stats (by ID, updated to use seasonTotals)
app.get("/api/player-stats", async (req, res) => {
  const playerId = req.query.id;
  if (!playerId) {
    return res.status(400).json({ error: "Player ID is required." });
  }

  try {
    // Get player stats
    const statsUrl = `https://api.nhle.com/stats/rest/en/skater/summary?cayenneExp=playerId=${playerId}`;
    const statsRes = await axios.get(statsUrl);
    const statsData = statsRes.data?.data?.[0];

    if (!statsData) {
      return res.status(404).json({ error: "Player stats not found." });
    }

    // Get player metadata (name, team, position)
    const profileUrl = `https://api-web.nhle.com/v1/player/${playerId}/landing`;
    const profileRes = await axios.get(profileUrl);
    const profile = profileRes.data;

    const summary = {
      name: `${profile.firstName?.default || "Unknown"} ${profile.lastName?.default || ""}`.trim(),
      team: profile.currentTeam?.name?.default || "N/A",
      position: profile.primaryPosition || "N/A",
      stats: {
        goals: statsData.goals || 0,
        assists: statsData.assists || 0,
        points: statsData.points || 0,
        gamesPlayed: statsData.gamesPlayed || 0,
      }
    };

    res.json(summary);
  } catch (err) {
    console.error("NHL API Error:", err.message);
    res.status(500).json({ error: "Could not fetch player stats." });
  }
});



/* ========== STATIC FILES AND INDEX LAST ========== */
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ========== CRON JOBS ========== */
cron.schedule("* * * * *", () => {
  console.log("⏳ Running scheduled jobs...");
  sendWeatherUpdates();
  sendFlightUpdates();
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
