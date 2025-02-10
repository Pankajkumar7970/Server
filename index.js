const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");
const _ = require("lodash");
const io = new Server({
  cors: {
    origin: "*",
  },
});

const Room = class {
  noOfPlayers = 0;
  playerInfo = [];
  roomStatus = "waiting";
};

class PlayerInfo {
  constructor(roomId, id, userName) {
    this.roomId = roomId;
    this.playerId = id;
    this.playerUsername = userName;
    this.playerScore = 0;
    this.playerMoves = [];
  }
}

function createRoom(id, userName) {
  const roomId = uuidv4();
  rooms[roomId] = new Room();
  const playerData = new PlayerInfo(roomId, id, userName);
  // console.log(playerData);
  rooms[roomId]["playerInfo"].push(playerData);
  rooms[roomId]["noOfPlayers"] += 1;
}

const rooms = {};

io.on("connection", (socket) => {
  socket.on("join", (userName) => {
    console.log("join request");
    if (_.isEmpty(rooms)) {
      createRoom(socket.id, userName);
    } else {
      for (const roomId in rooms) {
        if (
          rooms[roomId]["noOfPlayers"] === 1 &&
          rooms[roomId]["roomStatus"] === "waiting"
        ) {
          rooms[roomId]["roomStatus"] = "full";
          const playerData = new PlayerInfo(roomId, socket.id, userName);
          rooms[roomId]["playerInfo"].push(playerData);
          rooms[roomId]["noOfPlayers"] += 1;
          setTimeout(() => {
            for (const player of rooms[roomId]["playerInfo"]) {
              io.to(player.playerId).emit(
                "startGame",
                rooms[roomId]["playerInfo"]
              );
            }
          }, 3000);
          // console.log(rooms[roomId]);
        } else {
          createRoom(socket.id, userName);
        }
      }
    }
  });
  socket.on("userMoves", ([roomId, userMoves]) => {
    let playerData, opponentData;
    rooms[roomId]?.playerInfo.forEach((player) => {
      if (player.playerId === socket.id) {
        player.playerMoves = userMoves;
        playerData = player;
      } else opponentData = player;
    });

    // console.log(rooms[roomId].playerInfo);
    socket
      .to(playerData?.playerId)
      .to(opponentData?.playerId)
      .emit("data", rooms[roomId]?.playerInfo);
  });

  socket.on("winner", (roomId, callback) => {
    let playerData, opponentData;
    rooms[roomId]?.playerInfo.forEach((player) => {
      if (player.playerId === socket.id) {
        player.playerScore += 1;
        playerData = player;
      } else opponentData = player;
    });
    socket
      .to(playerData?.playerId)
      .to(opponentData?.playerId)
      .emit("data", rooms[roomId]?.playerInfo);
    callback(rooms[roomId]?.playerInfo);
    rooms[roomId]?.playerInfo.forEach((player) => {
      player.playerMoves = [];
    });
  });

  socket.on("gameOver", (roomId) => {
    delete rooms[roomId];
  });

  socket.on("disconnect", () => {
    console.log("disconnected");
  });
});

io.listen(3000, () => {
  console.log("Server is listening");
});
