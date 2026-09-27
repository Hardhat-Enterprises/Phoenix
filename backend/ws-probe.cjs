(async () => {
  const r = await fetch("http://localhost:3001/api/users/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin1", password: "admin123" })
  });
  const login = await r.json();
  console.log("user_id:", login.user_id);

  const s = new WebSocket("ws://localhost:3001/api/notifications/ws");
  s.onopen = () => {
    console.log("open — sending authenticate");
    s.send(JSON.stringify({ type: "authenticate", token: `Bearer ${login.access_token}` }));
  };
  s.onmessage = e => console.log("received:", String(e.data).slice(0, 500));
  s.onclose = e => { console.log(`closed: ${e.code} "${e.reason}"`); process.exit(0); };
  setTimeout(() => { console.log("done"); process.exit(0); }, 15000);
})();