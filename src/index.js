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
      username: jwtPayload.user.username,
      verified: jwtPayload.user.verified,
    });

    socket.emit("authenticationStatus", { status: true });
  });

  socket.on("sendMessage", async (payload) => {
    console.log("Message received: ", payload);

    const userEntry = connectedUsers.find(
      (user) => user.socket === socket
    );
    const { username, verified } = userEntry;
    const { message } = payload;

    connectedUsers.forEach((user) => {
      console.log("Verified: ", verified);
      user.socket.emit("broadcastMessage", { username, message, verified });
    });
  });

  socket.on("disconnect", () => {
    console.log("A socket disconnected.");

    connectedUsers = connectedUsers.filter((user) => user.socket !== socket);
  });
});
