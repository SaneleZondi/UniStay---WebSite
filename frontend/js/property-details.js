document.addEventListener("DOMContentLoaded", () => {
  const user = sessionStorage.getItem("LoggedInUser");
  const loginLink = document.getElementById("loginLink");
  const dashboardLink = document.getElementById("dashboardLink");

  if (user) {
    loginLink.style.display = "none";
    dashboardLink.style.display = "inline-block";
  }

  const properties = [
    {
      title: "Sunny Side Apartment",
      city: "Durban",
      price: "R2,800",
      description: "A bright and spacious apartment located 5 minutes from campus.",
      image: "assets/property1.jpg"
    },
    {
      title: "Campus View Room",
      city: "Cape Town",
      price: "R3,000",
      description: "Cozy room with balcony and campus views. Ideal for students.",
      image: "assets/property2.jpg"
    },
    {
      title: "City Center Flat",
      city: "Johannesburg",
      price: "R3,500",
      description: "Modern flat in the city center, close to amenities and public transport.",
      image: "assets/property3.jpg"
    }
  ];
  const query = new URLSearchParams(window.location.search);
  const propertyId = query.get("id") || 0;
  const prop = properties[propertyId];

  const container = document.getElementById("propertyDetail");
  container.innerHTML = `
    <img src="${prop.image}" alt="${prop.title}" />
    <h2>${prop.title}</h2>
    <p><strong>Location:</strong> ${prop.city}</p>
    <p><strong>Monthly Price:</strong> ${prop.price}</p>
    <p>${prop.description}</p>
    <button class="btn-book" onclick="bookNow()">Book Now</button>
  `;
});

function bookNow() {
  const user = sessionStorage.getItem("LoggedInUser");
  if (!user) {
    alert("Please log in to book this property.");
    window.location.href = "login.html";
  } else {
    window.location.href = "booking.html";
  }
}