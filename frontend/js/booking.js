document.addEventListener("DOMContentLoaded", () => {
  const user = sessionStorage.getItem("LoggedInUser");

  if (!user) {
    alert("You must be logged in to book a property.");
    window.location.href = "login.html";
    return;
  }

  const property = {
    title: "Campus View Room",
    pricePerMonth: 3000
  };

  document.getElementById("bookingTitle").textContent = property.title;
  document.getElementById("bookingPrice").textContent = `R${property.pricePerMonth}`;

  const checkinInput = document.getElementById("checkin");
  const checkoutInput = document.getElementById("checkout");

  checkinInput.addEventListener("change", updateTotalCost);
  checkoutInput.addEventListener("change", updateTotalCost);
});