document.addEventListener("DOMContentLoaded", () => {
  const dashboardNav = document.getElementById('dashboardNav');
  const loginNav = document.getElementById('loginNav');

  const user = sessionStorage.getItem('LoggedInUser');
  if (user) {
    loginNav.style.display = 'none';
    dashboardNav.style.display = 'inline-block';
  }

  loadProperties(); // Load properties when page loads
});

const properties = [
  {
    title: "Sunny Side Apartment",
    city: "Durban",
    price: "R2,800",
    image: "assets/property1.jpg"
  },
  {
    title: "Campus View Room",
    city: "Cape Town",
    price: "R3,000",
    image: "assets/property2.jpg"
  },
  {
    title: "City Center Flat",
    city: "Johannesburg",
    price: "R3,500",
    image: "assets/property3.jpg"
  },
];

async function loadProperties() {
    try {
        const response = await fetch('../api/properties.php');
        const properties = await response.json();
        displayProperties(properties);
    } catch (error) {
        console.error('Error loading properties:', error);
    }
};



