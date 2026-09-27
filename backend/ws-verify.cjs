const TARGET = process.env.WS_URL || "ws://localhost:3001/api/notifications/ws";

const runCase = (name, action, timeoutMs = 12000) =>
  new Promise((resolve) => {
    const socket = new WebSocket(TARGET);
    const messages = [];
    let closed = null;
    const finish = () => resolve({ name, messages, closed });
    const timer = setTimeout(() => {
      try { socket.close(); } catch {}
      finish();
    }, timeoutMs);

    socket.onopen = () => action(socket);
    socket.onmessage = (e) => messages.push(String(e.data));
    socket.onerror = () => messages.push("SOCKET ERROR");
    socket.onclose = (e) => {
      closed = { code: e.code, reason: e.reason };
      clearTimeout(timer);
      finish();
    };
  });

(async () => {
  console.log(`Connecting to ${TARGET}\n`);

  const cases = [
    ["Malformed JSON is rejected safely", (s) => s.send("{not json")],
    [
      "Subscribe before authenticating is refused",
      (s) => s.send(JSON.stringify({ type: "notifications:subscribe", page: 1, limit: 10 })),
    ],
    [
      "Invalid authentication is rejected",
      (s) => s.send(JSON.stringify({ type: "authenticate", token: "not-a-real-token" })),
    ],
    ["Authentication timeout after 10s of silence", () => {}],
  ];

  for (const [name, action] of cases) {
    const r = await runCase(name, action);
    console.log(`=== ${r.name} ===`);
    r.messages.forEach((m) => console.log(`  received: ${m}`));
    console.log(
      r.closed
        ? `  closed: code=${r.closed.code} reason="${r.closed.reason}"\n`
        : "  socket still open\n",
    );
  }
  process.exit(0);
})();