const accessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNmIwNjAxOTMtMTQwMi00NjgyLTliZGUtMDNkZjAwZjdhMDdmIiwidXNlcm5hbWUiOiJhbmFseXN0X3Rlc3QxIiwicm9sZSI6ImFuYWx5c3QiLCJpYXQiOjE3ODk4OTUzMzYsImV4cCI6MTc4OTg5NjIzNn0.M62xD7cAsItdoi3qYCWly2AmCekPcEOYLrjPdX37c6I";

const socket = new WebSocket("ws://localhost:3000/api/notifications/ws");

socket.addEventListener("open", () => {
  console.log("WebSocket connected");

  socket.send(
    JSON.stringify({
      type: "authenticate",
      token: `Bearer ${accessToken}`,
    }),
  );
});

socket.addEventListener("message", ({ data }) => {
  console.log("notification socket:", JSON.parse(data));
});

socket.addEventListener("close", (event) => {
  console.log("socket closed:", event.code, event.reason);
});

socket.addEventListener("error", (event) => {
  console.error("socket error:", event);
});
