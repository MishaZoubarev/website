require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const cron = require("node-cron");
const twilio = require("twilio");

const app = express();
const PORT = process.env.PORT || 5000;


// Twilio Setup
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_PHONE = process.env.TWILIO_PHONE;

// Store user subscriptions
const subscribers = [];

app.use(cors({
    origin: "*", // Allows all origins (for testing)
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true
}));
app.use(bodyParser.json());

const path = require("path");

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// Serve `index.html` when accessing the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// OpenWeather API Key
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

// Subscribe Route
app.post("/subscribe", (req, res) => {
    const { phone, city, time } = req.body;
    
    if (!phone || !city || !time) {
        return res.status(400).json({ message: "All fields are required." });
    }

    subscribers.push({ phone, city, time });
    console.log(`New subscriber: ${phone} for ${city} at ${time}`);

    res.json({ message: "Subscription successful! You will receive daily weather updates." });
});

// Function to Fetch Weather & Send SMS
const sendWeatherUpdates = async () => {
    for (let user of subscribers) {
        try {
            const { phone, city } = user;
            const weatherResponse = await axios.get(
                `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`
            );

            const temp = weatherResponse.data.main.temp;
            const description = weatherResponse.data.weather[0].description;
            const message = `🌤️ Weather Update for ${city}: ${description.toUpperCase()}, Temp: ${temp}°C`;

            try {
                await twilioClient.messages.create({
                    body: message,
                    from: TWILIO_PHONE,
                    to: phone,
                });
                console.log(`✅ SMS sent to ${phone}`);
            } catch (error) {
                console.error(`❌ Twilio Error:`, error);
            }

            console.log(`✅ Sent weather update to ${phone}: ${message}`);
        } catch (error) {
            console.error(`❌ Failed to send weather to ${user.phone}:`, error.message);
        }
    }
};

// Schedule the job every minute for testing (change to hourly for real use)
cron.schedule("* * * * *", () => {
    console.log("⏳ Running weather SMS scheduler...");
    sendWeatherUpdates();
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
