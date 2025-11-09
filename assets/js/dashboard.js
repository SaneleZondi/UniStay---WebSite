document.addEventListener("DOMContentLoaded", () => {
  const usernameEl = document.getElementById("username");
  const bookingList = document.getElementById("bookingList");
  const logoutBtn = document.getElementById("logoutBtn");

  const loggedInEmail = sessionStorage.getItem("LoggedInUser");

  if (!loggedInEmail) {
    alert("You need to be logged in to view your dashboard.");
    window.location.href = "login.html";
    return;
  }

  const userData = JSON.parse(localStorage.getItem(loggedInEmail));
  usernameEl.textContent = userData?.name || "User";

  const mockBookings = [
    {
      title: "Campus View Room",
      city: "Cape Town",
      checkin: "2025-07-01",
      checkout: "2025-09-30"
    },
    {
      title: "City Center Flat",
      city: "Johannesburg",
      checkin: "2025-10-01",
      checkout: "2025-12-31"
    }
  ];

  mockBookings.forEach(booking => {
    const div = document.createElement("div");
    div.className = "booking-item";
    div.innerHTML = `
      <h4>${booking.title} (${booking.city})</h4>
      <p>From: ${booking.checkin}</p>
      <p>To: ${booking.checkout}</p>
    `;
    bookingList.appendChild(div);
  });

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("LoggedInUser");
    alert("You have been logged out.");
    window.location.href = "index.html";
  });
});
