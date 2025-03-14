const wrapper = document.querySelector('.wrapper');
const loginLink = document.querySelector('.login-link');
const registerLink = document.querySelector('.register-link');
const btnPopup = document.querySelector('.btnLogin-popup');
const iconClose = document.querySelector('.icon-close');

registerLink.addEventListener('click', ()=> {
    wrapper.classList.add('active');
});

loginLink.addEventListener('click', ()=> {
    wrapper.classList.remove('active');
});

btnPopup.addEventListener('click', ()=> {
    wrapper.classList.add('active-popup');
});

iconClose.addEventListener('click', ()=> {
    wrapper.classList.remove('active-popup');
});

/*const API_KEY = "292903dfab13192da863f606002ed353";*/



document.getElementById("sms-form").addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent page refresh

    const phone = document.getElementById("sms-phone").value.trim();
    const city = document.getElementById("sms-city").value.trim();
    const time = document.getElementById("sms-time").value.trim();

    if (!phone || !city || !time) {
        document.getElementById("sms-status").innerText = "Please fill in all fields.";
        return;
    }

    try {
        const response = await fetch("https://website-mauve-three-93.vercel.app/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, city, time }),
        });

        const data = await response.json();
        document.getElementById("sms-status").innerText = data.message;
    } catch (error) {
        console.error("Error subscribing:", error);
        document.getElementById("sms-status").innerText = "Subscription failed. Try again.";
    }
});
