const API = "http://localhost:3001";
const WS = "ws://localhost:3001/api/notifications/ws";
const U = "admin1", P = "admin123";

const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const short = t => t.length > 300 ? t.slice(0, 300) + "…" : t;

const open = (token, label) => new Promise((res, rej) => {
  const s = new WebSocket(WS);
  const got = [];
  const t = setTimeout(() => rej(new Error(label + ": timeout")), 15000);
  s.onmessage = e => {
    got.push(String(e.data));
    if (String(e.data).includes("notifications:snapshot")) { clearTimeout(t); res({ s, got, label }); }
  };
  s.onopen = () => s.send(JSON.stringify({ type: "authenticate", token: `Bearer ${token}` }));
  s.onerror = () => { clearTimeout(t); rej(new Error(label + ": socket error")); };
});

const rest = async (m, p, token) => {
  const r = await fetch(API + p, { method: m, headers: { Authorization: `Bearer ${token}` } });
  return r.status;
};

(async () => {
  const r = await fetch(`${API}/api/users/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: U, password: P })
  });
  const login = await r.json();
  if (!login.access_token) { log("login failed:", login.status, login.message); return; }
  const token = login.access_token;
  log(`logged in as ${login.username} (${login.role}) — token redacted`);
  log(`user_id: ${login.user_id}\n`);

  const A = await open(token, "A");
  log("=== 1 & 4. Valid authentication and initial snapshot ===");
  A.got.forEach(m => log("  " + short(m)));

  log("\n=== 5. Filtered snapshot (unread only) ===");
  let n = A.got.length;
  A.s.send(JSON.stringify({ type: "notifications:subscribe", page: 1, limit: 10, read: false }));
  await wait(2000);
  A.got.slice(n).forEach(m => log("  " + short(m)));

  const B = await open(token, "B");
  log("\n=== 10. Two sockets, same user ===");
  log(`  socket B authenticated, ${B.got.length} message(s) received`);

  const snap = JSON.parse(A.got.find(m => m.includes("notifications:snapshot")));
  const items = snap.data.notifications || [];
  log(`  ${items.length} notification(s) available for this user`);

  let a = A.got.length, b = B.got.length;
  log("\n=== 8. Mark-all-read broadcast ===");
  log("  REST PATCH /read-all →", await rest("PATCH", "/api/notifications/read-all", token));
  await wait(2000);
  log("  socket A:"); A.got.slice(a).forEach(m => log("    " + short(m)));
  log("  socket B:"); B.got.slice(b).forEach(m => log("    " + short(m)));

  if (items.length) {
    const id = items[0].id;

    log("\n=== 7. Mark-read broadcast ===");
    a = A.got.length; b = B.got.length;
    log(`  REST PATCH /${id}/read →`, await rest("PATCH", `/api/notifications/${id}/read`, token));
    await wait(2000);
    log("  socket A:"); A.got.slice(a).forEach(m => log("    " + short(m)));
    log("  socket B:"); B.got.slice(b).forEach(m => log("    " + short(m)));

    log("\n=== 9. Delete broadcast ===");
    a = A.got.length; b = B.got.length;
    log(`  REST DELETE /${id} →`, await rest("DELETE", `/api/notifications/${id}`, token));
    await wait(2000);
    log("  socket A:"); A.got.slice(a).forEach(m => log("    " + short(m)));
    log("  socket B:"); B.got.slice(b).forEach(m => log("    " + short(m)));
  } else {
    log("\n=== 7 & 9 === skipped: no notifications exist for this user");
    log("  Publish a test event first (section 6.1) using the user_id above.");
  }

  log("\n=== 12. Reconnection recovery ===");
  A.s.close(1000, "done"); B.s.close(1000, "done");
  await wait(1000);
  const C = await open(token, "C");
  log("  " + short(C.got.find(m => m.includes("snapshot")) ?? "no snapshot"));
  log("  Snapshot re-read from the database; missed events are not replayed.");
  C.s.close(1000, "done");
  process.exit(0);
})();