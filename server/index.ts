import { Server, Socket } from "socket.io";
import { createClient, LiveClient, LiveTranscriptionEvents} from "@deepgram/sdk";
import dotenv from "dotenv";

dotenv.config();

const socketHandler = (socket: Socket, io: Server) => {
  console.log("A user connected:", socket.id);
  let connection: LiveClient;
  let keepAlive: NodeJS.Timeout;

  socket.on("join_room", (roomID) => {
    socket.join(roomID);
    console.log(`User ${socket.id} joined room ${roomID}`);
  });

  socket.on("start_lesson", () => {
    console.log("Starting lesson...");
    
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
  
    connection = deepgram.listen.live({
      smart_format: true,      
      model: "nova-3",
      language: "en-US",
      diarize: true,
    });

    if (keepAlive) clearInterval(keepAlive);

    // prevent deepgram from closing the connection after 10sec of silence
    keepAlive = setInterval(() => {
      console.log("Keep Alive");
      connection.keepAlive();
    }, 8000);


    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log("Deepgram Connection opened");
      // send a message to the client that lesson has started
    });

    // audio transcript returns from deepgram and is sent to the client
    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel.alternatives[0].transcript;
      console.log("Deepgram Transcript:", transcript);
      if (transcript) {
        socket.emit("caption", transcript);
      }
    });

    connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error("Deepgram Error:", error);
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log("Deepgram Connection closed");
      clearInterval(keepAlive);
    });
  });

  // audio is received from the client and sent to deepgram
  socket.on("send_audio", (audioData) => {
    if(connection && connection.getReadyState() === 1) {
      connection.send(audioData);
    }
  });

  socket.on("stop_lesson", () => {
    if(connection) {
      connection.requestClose();
      console.log("Lesson stopped");
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    if(connection) {
      connection.requestClose();
    }
  });
}

const PORT = 3005;

const io = new Server(PORT,{
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  }
});

io.on('connection', (socket) => {
  socketHandler(socket, io)
});


console.log(`Server running on port ${PORT}`);
