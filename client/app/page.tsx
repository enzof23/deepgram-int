"use client"

import { useEffect, useRef, useState } from "react"
import { useSocket } from "./context/socket";


export default function Home() {
const [caption, setCaption] = useState<string>("");
const [recording, setRecording] = useState<boolean>(false);
const mediaRecorderRef = useRef<MediaRecorder | null>(null);

const socket = useSocket();

const startRecording = async () => {
  if(!socket) return;

  setCaption("");
  setRecording(true);
  
  socket.emit("start_lesson");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(250);
    
    
    console.log("Recording started");

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && socket.connected) {
        socket.emit("send_audio", event.data);
      }
    };

    mediaRecorder.onstop = () => {
      socket.emit("stop_lesson");
      console.log("Recording stopped");
    };
  } catch (error) {
    console.error("Error starting recording:", error);
    setRecording(false);
  }
};

const stopRecording = () => {
  if(mediaRecorderRef.current) {
    mediaRecorderRef.current.stop();
    setRecording(false);
  }
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
            <button className="p-2 bg-blue-500 text-white rounded w-fit mx-auto px-4" onClick={recording ? stopRecording : startRecording}>{recording ? "Stop" : "Start"} transcript</button>
            <p className="text-center">{caption || "Press 'Start Recording' and begin speaking..."}</p>
        </div>
    </div>
)
}