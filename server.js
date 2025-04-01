require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const cron = require("node-cron");
const twilio = require("twilio");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Twilio Setup
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_PHONE = process.env.TWILIO_PHONE;

// OpenWeather API Key
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const AVIATIONSTACK_API_KEY = process.env.AVIATIONSTACK_API_KEY;

// Store user subscriptions
const weatherSubscribers = [];
const flightSubscribers = []; // { phone, flight, time }

//app.use(cors({ origin: "*", methods: ["GET", "POST"], allowedHeaders: ["Content-Type"], credentials: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Weather Subscription
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

// Flight Info Route
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

// Subscribe for flight SMS
app.post("/subscribe-flight", (req, res) => {
  const { phone, flight, time } = req.body;
  if (!phone || !flight || !time) return res.status(400).json({ message: "All fields are required." });
  flightSubscribers.push({ phone, flight, time });
  res.json({ message: "Flight alert scheduled!" });
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

// Cron jobs for both
cron.schedule("* * * * *", () => {
  console.log("⏳ Running scheduled jobs...");
  sendWeatherUpdates();
  sendFlightUpdates();
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
