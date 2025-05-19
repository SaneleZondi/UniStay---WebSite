document.addEventListener("DOMContentLoaded", () => {
  const messagesList = document.getElementById("messagesList");
  const sendBtn = document.getElementById("sendBtn");
  const messageInput = document.getElementById("messageInput");
  const logoutBtn = document.getElementById("logoutBtn");

  const loggedInEmail = sessionStorage.getItem("LoggedInUser");

  if (!loggedInEmail) {
    alert("You must be logged in to view messages.");
    window.location.href = "login.html";
    return;
  }

  const mockMessages = [
    { from: "Admin", text: "Your booking at Campus View Room is confirmed." },
    { from: "Owner – City Center Flat", text: "Let me know if you have any questions about your stay." }
  ];

  mockMessages.forEach(msg => {
    const div = document.createElement("div");
    div.className = "message";
    div.innerHTML = `<strong>${msg.from}:</strong> <p>${msg.text}</p>`;
    messagesList.appendChild(div);
  });

  sendBtn.addEventListener("click", () => {
    const message = messageInput.value.trim();
    if (message === "") {
      alert("Please type a message.");
      return;
    }

    const div = document.createElement("div");
    div.className = "message";
    div.innerHTML = `<strong>You:</strong> <p>${message}</p>`;
    messagesList.appendChild(div);
    messageInput.value = "";
  });

  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("LoggedInUser");
    alert("You have been logged out.");
    window.location.href = "index.html";
  });
});
