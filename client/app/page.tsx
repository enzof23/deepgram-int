"use client"

import { useState } from "react"
import { useSocket } from "./context/socket";
import { useMicrophone } from "./hook/use-mic";


export default function Home() {
const [caption, setCaption] = useState<string>("");

const socket = useSocket();
const { openMic, closeMic, micStatus, mediaRecorder} = useMicrophone();

const startRecording = async () => {
    setCaption("");
    
    if(socket) {
        await openMic();

        socket.emit("start_lesson");

        console.log("Recording started");

        if(mediaRecorder) {
            mediaRecorder.ondataavailable = (event) => {
                if(event.data.size > 0 && socket.connected) {
                    socket.emit("send_audio", event.data);
                }
            };

            mediaRecorder.onstop = () => {
                socket.emit("stop_lesson");
            }
        }

        socket.on('caption', (caption) => {
            setCaption((prevCaption) => `${prevCaption} ${caption}`);
        })
    }
};

const stopRecording = () => {
   closeMic();
}

return (
    <div className="grid place-items-center h-screen">
        <div className="flex flex-col gap-4">   
            <button className="p-2 bg-blue-500 text-white rounded w-fit mx-auto px-4" onClick={micStatus === "recording" ? stopRecording : startRecording}>{micStatus === "recording" ? "Stop" : "Start"} transcript</button>
            <p className="text-center">{caption || "Press 'Start Recording' and begin speaking..."}</p>
        </div>
    </div>
)
}