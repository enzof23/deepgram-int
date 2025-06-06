import express from "express"
import http from "http"
import { Server as SocketIOServer, type Socket } from "socket.io"

import { createClient, LiveTranscriptionEvents, type ListenLiveClient } from "@deepgram/sdk";
import dotenv from "dotenv"

dotenv.config()

const app = express()
const server = http.createServer(app)
const io = new SocketIOServer(server, {
  cors: { origin: "http://localhost:3000" }
})

const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);
let keepAlive: NodeJS.Timeout;

const setupDeepgram = (socket: Socket) => {
  const deepgram = deepgramClient.listen.live({
    model: "nova-3",
    smart_format: true,
    language: "en",
    
  })

  if(keepAlive) clearInterval(keepAlive)

  keepAlive = setInterval(() => {
    console.log("deepgram: keepalive")
    deepgram.keepAlive();
  }, 10 * 1000)

deepgram.addListener(LiveTranscriptionEvents.Open, async () => {
  console.log("deepgram: connected");

  deepgram.addListener(LiveTranscriptionEvents.Transcript, (data) => {
    console.log("deepgram: transcript received");
    console.log("socket: transcript sent to client");
    socket.emit("transcript", data)
  });

  deepgram.addListener(LiveTranscriptionEvents.Close, async () => {
    console.log("deepgram: disconnected");
    clearInterval(keepAlive);
    deepgram.requestClose();
  });

  deepgram.addListener(LiveTranscriptionEvents.Error, async (error) => {
    console.log("deepgram: error received");
    console.log(error)
  });

  deepgram.addListener(LiveTranscriptionEvents.Metadata, (data) => {
    console.log("deepgram: metadata received");
    console.log(
      "socket: metadata sent to client"
    );
    socket.emit(JSON.stringify({metadata: data}))
  })
})

return deepgram;
};


io.on("connection", (socket: Socket) => {
  console.log("socket: client connected");

  let deepgram: ListenLiveClient = setupDeepgram(socket);

  socket.on("message", (message) => {
    console.log("socket: client data received");

    if(deepgram.getReadyState() === 1 /* OPEN */) {
      console.log("socket: data sent to deepgram");
      deepgram.send(message);
    } else if(deepgram.getReadyState() >= 2 /* 2 = CLOSING, 3 = CLOSED */) {
      console.log("socket: data couldn't be sent to deepgram");
      console.log(("socket: retrying connection to deepgram"));
      /* Attempt to reopen the Deepgram connection */
      deepgram.requestClose();
      deepgram.removeAllListeners();
      deepgram = setupDeepgram(socket);
    } else {
      console.log("socket: data couldn't be sent to deepgram");
    }
  });

  socket.on("closed", () => {
    console.log("socket: client disconnected");
    deepgram.requestClose();
    deepgram.removeAllListeners();
    // deepgram = null;
  })
});

app.get("/", (req, res) => {
  res.send("backend is running");
});

server.listen(4000, () => {
  console.log("Server started on port 4000");
})