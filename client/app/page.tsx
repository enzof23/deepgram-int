"use client"

import { useEffect, useState } from "react"
import { useSocket } from "./context/socket";
import { useMicrophone } from "./hook/use-mic";


export default function Home() {
const [caption, setCaption] = useState<string>("");

const socket = useSocket();
const { openMic, closeMic, micStatus} = useMicrophone();

const startRecording = async () => {
    setCaption("");
    
    if(socket) {
       const recorder = await openMic();
       socket.emit("start_lesson");

      if(recorder) {
        console.log("hello")
        recorder.ondataavailable = (event) => {
          if(event.data.size > 0 && socket.connected) {
            console.log("Sending audio to backend")
            socket.emit("send_audio", event.data);
          }
        };

        recorder.onstop = () => {
          socket.emit("stop_lesson");
          console.log("Lesson stopped")
        }
      }

        // socket.on('caption', (caption) => {
        //     setCaption((prevCaption) => `${prevCaption} ${caption}`);
        // })
    }
};

const stopRecording = () => {
   closeMic();
}

useEffect(() => {
    if (!socket) return;

    const handleCaption = (newCaption: string) => {
      setCaption((prevCaption) => `${prevCaption} ${newCaption}`);
    };

    socket.on('caption', handleCaption);

    // Cleanup function to remove the listener when the component unmounts
    return () => {
      socket.off('caption', handleCaption);
    };
  }, [socket]);

return (
    <div className="grid place-items-center h-screen">
        <div className="flex flex-col gap-4">   
            <button className="p-2 bg-blue-500 text-white rounded w-fit mx-auto px-4" onClick={micStatus === "recording" ? stopRecording : startRecording}>{micStatus === "recording" ? "Stop" : "Start"} transcript</button>
            <p className="text-center">{caption || "Press 'Start Recording' and begin speaking..."}</p>
        </div>
    </div>
)
}