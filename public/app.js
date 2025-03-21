// Ensure script runs only after the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
    console.log("JavaScript Loaded!"); // Debugging Log

    // Login/Register Popups
    const wrapper = document.querySelector('.wrapper');
    const loginLink = document.querySelector('.login-link');
    const registerLink = document.querySelector('.register-link');
    const btnPopup = document.querySelector('.btnLogin-popup');
    const iconClose = document.querySelector('.icon-close');

    if (wrapper && loginLink && registerLink && btnPopup && iconClose) {
        registerLink.addEventListener('click', () => {
            wrapper.classList.add('active');
        });

        loginLink.addEventListener('click', () => {
            wrapper.classList.remove('active');
        });

        btnPopup.addEventListener('click', () => {
            wrapper.classList.add('active-popup');
        });

        iconClose.addEventListener('click', () => {
            wrapper.classList.remove('active-popup');
        });
    } else {
        console.error("Error: One or more login elements not found.");
    }

    // Weather SMS Subscription Form
    const form = document.getElementById("sms-form");

    if (!form) {
        console.error("Error: Form with ID 'sms-form' not found!");
        return; // Stop execution if form is missing
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault(); // Prevent page refresh
        console.log("Subscribe button clicked!"); // Debugging Log

        const phone = document.getElementById("sms-phone").value.trim();
        const city = document.getElementById("sms-city").value.trim();
        const time = document.getElementById("sms-time").value.trim();

        if (!phone || !city || !time) {
            document.getElementById("sms-status").innerText = "Please fill in all fields.";
            console.error("Missing input fields!");
            return;
        }

        try {
            const response = await fetch("https://website-mauve-three-93.vercel.app/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, city, time }),
            });

            const data = await response.json();
            console.log("Server response:", data);
            document.getElementById("sms-status").innerText = data.message;
        } catch (error) {
            console.error("Error subscribing:", error);
            document.getElementById("sms-status").innerText = "Subscription failed. Try again.";
        }
    });
});
