import { Server, Socket } from "socket.io";
import { createClient, LiveClient, LiveTranscriptionEvents} from "@deepgram/sdk";
import { z } from "zod";
import dotenv from "dotenv";

interface ServerToClientEvents {
  caption: (caption: string) => void;
  lesson_started: () => void;
  lesson_ended: () => void;
  error: (error: string) => void;
}

interface ClientToServerEvents {
  join_room: (roomID: string) => void;
  start_lesson: () => void;
  send_audio: (audioData: Blob) => void;
  stop_lesson: () => void;
}

const roomIDSchema = z.string().min(1);

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

dotenv.config();

const socketHandler = (socket: TypedSocket, io: Server) => {
  console.log("A user connected:", socket.id);
  let connection: LiveClient;
  let keepAlive: NodeJS.Timeout;

  socket.on("join_room", (roomID) => {
    try {
      const validatedRoomId = roomIDSchema.parse(roomID);
      socket.join(validatedRoomId);
      console.log(`User ${socket.id} joined room ${validatedRoomId}`);
    } catch (error) {
      console.error("Invalid room ID:", error);
    }
  });

  socket.on("start_lesson", () => {
    console.log("Starting lesson...");
    
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
  
    connection = deepgram.listen.live({
      smart_format: true,      
      model: "nova-3",
      language: "en-AU",
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
      // socket.emit("lesson_started");
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
      // socket.emit("error", "Transcription error occured.");
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log("Deepgram Connection closed");
      clearInterval(keepAlive);
      // socket.emit("lesson_ended");
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
    if(keepAlive) {
      clearInterval(keepAlive);
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

const io = new Server<ClientToServerEvents, ServerToClientEvents>(PORT,{
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  }
});

io.on('connection', (socket) => {
  socketHandler(socket, io)
});


console.log(`Server running on port ${PORT}`);