import { Server } from "socket.io";
import { decrypt } from "./modules/lib.js";

const io = new Server(3010, {
  cors: {
    origin: "*",
  },
});

let connectedUsers = [];

io.on("connection", (socket) => {
  console.log("A new socket connected.");

  socket.on("authenticate", async (payload) => {
    console.log("Authentication request received: ", payload, "\n");

    const { token } = payload;

    const jwtPayload = await decrypt(token);
    if (!jwtPayload) {
      return socket.emit("authenticationStatus", { status: false });
    }

    connectedUsers.push({
      socket: socket,
      token: token,
      userId: jwtPayload.user.id,
    });

    socket.emit("authenticationStatus", { status: true });
  });

  socket.on("sendMessage", async (payload) => {
    console.log("Message received: ", payload);

    const userEntry = connectedUsers.find((user) => user.socket === socket);
    const { token, userId } = userEntry;
    const { message } = payload;

    const result = await fetch("http://localhost:3000/api/v1/messages/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${token}`,
      },
      body: JSON.stringify({ message }),
    });

    if (!result.ok) {
      return;
    }

    connectedUsers.forEach((user) => {
      user.socket.emit("broadcastMessage", { userId, message });
    });
  });

  socket.on("disconnect", () => {
    console.log("A socket disconnected.");

    connectedUsers = connectedUsers.filter((user) => user.socket !== socket);
  });
});
