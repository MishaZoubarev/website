// TEMPORARY LOCAL TESTING VERSION of app.js
// Replace your current app.js with this while testing on localhost

const wrapper = document.querySelector('.wrapper');
const loginLink = document.querySelector('.login-link');
const registerLink = document.querySelector('.register-link');
const btnPopup = document.querySelector('.btnLogin-popup');
const iconClose = document.querySelector('.icon-close');

registerLink?.addEventListener('click', () => wrapper.classList.add('active'));
loginLink?.addEventListener('click', () => wrapper.classList.remove('active'));
btnPopup?.addEventListener('click', () => wrapper.classList.add('active-popup'));
iconClose?.addEventListener('click', () => wrapper.classList.remove('active-popup'));

// Weather SMS Submit
const smsForm = document.getElementById("sms-form");
smsForm?.addEventListener("submit", async function (event) {
  event.preventDefault();

  const phone = document.getElementById("sms-phone").value.trim();
  const city = document.getElementById("sms-city").value.trim();
  const time = document.getElementById("sms-time").value.trim();
  const status = document.getElementById("sms-status");

  if (!phone || !city || !time) {
    status.innerText = "Please fill in all fields.";
    return;
  }

  try {
    const response = await fetch("/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, city, time }),
    });

    const data = await response.json();
    status.innerText = data.message;
  } catch (error) {
    console.error("Error subscribing:", error);
    status.innerText = "Subscription failed. Try again.";
  }
});

// Flight Tracker Submit
const flightForm = document.getElementById("flight-form");
flightForm?.addEventListener("submit", async function (e) {
  e.preventDefault();

  const flightNumber = document.getElementById("flight-number").value.trim();
  const flightPhone = document.getElementById("flight-phone").value.trim();
  const flightTime = document.getElementById("flight-time").value.trim();
  const flightStatusDiv = document.getElementById("flight-status");

  if (!flightNumber) {
    flightStatusDiv.textContent = "Please enter a flight number.";
    return;
  }

  try {
    const res = await fetch(`/api/flight-info?flight=${flightNumber}`);

    const data = await res.json();
    if (data.error) {
      flightStatusDiv.textContent = `❌ ${data.error}`;
      document.getElementById("flight-sms-form").style.display = "none";
      return;
    }

    flightStatusDiv.innerHTML = `
    ✈️ Flight: ${data.flight}<br>
    🛫 Departure: ${data.departure}<br>
    🛬 Arrival: ${data.arrival}<br>
    📡 Status: ${data.status}<br>
    🕒 ETA: ${data.estimated_arrival}
  `;
  document.getElementById("flight-sms-form").style.display = "block";


    // Send SMS if info is provided
    if (flightPhone && flightTime) {
      const smsRes = await fetch("/subscribe-flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: flightPhone, flight: flightNumber, time: flightTime }),
      });

      const smsData = await smsRes.json();
      flightStatusDiv.innerHTML += `<br>📩 ${smsData.message}`;
    }
  } catch (err) {
    console.error("Error fetching flight info:", err);
    flightStatusDiv.textContent = "❌ Something went wrong. Please try again.";
  }
});
