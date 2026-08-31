
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";


const app = express();
app.use(cors());          //Web compatibility, allows frontend to call backend without CORS issues
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());

app.post("/alert", (req, res) => {
  const alert = req.body;
  console.log("Broadcasting alert:", alert);
  io.emit("alert", alert);
  res.json({ status: "ok" });
});

server.listen(3000, "0.0.0.0", () => {
  console.log("Backend running on http://0.0.0.0:3000");
});
