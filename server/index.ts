import { Server, Socket } from "socket.io";
import { createClient, LiveClient, LiveTranscriptionEvents} from "@deepgram/sdk";
import dotenv from "dotenv";

dotenv.config();

const socketHandler = (socket: Socket, io: Server) => {
  console.log("A user connected:", socket.id);
  let connection: LiveClient;
  let keepAlive: NodeJS.Timeout;

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    if(connection) {
      connection.requestClose();
    }
  });

  socket.on("join", (roomID) => {
    socket.join(roomID);
    console.log(`User ${socket.id} joined room ${roomID}`);
  });
  
  socket.on("start", () => {
    console.log("Starting transcription...");
    
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
  
    connection = deepgram.listen.live({
      smart_format: true,      
      model: "nova-3",
      language: "en-US",
      diarize: true,
    });

    if(keepAlive) clearInterval(keepAlive);
    keepAlive = setInterval(() => {
      console.log("Keep Alive");
      connection.keepAlive();
    }, 8000);


    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log("Deepgram Connection opened");
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log("Deepgram Connection closed");
      clearInterval(keepAlive);
    });

   connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel.alternatives[0].transcript;
      console.log("Deepgram Transcript:", transcript);
      if(transcript) {
        socket.emit("caption", transcript);
      }
    });

    connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error("Deepgram Error:", error);
    });
  })

  socket.on("audio", (audioData) => {
    if(connection && connection.getReadyState() === 1) {
      connection.send(audioData);
    }
  })

  socket.on("stop", () => {
    if(connection) {
      connection.requestClose();
      console.log("Transcription stopped");
    }
  })
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
