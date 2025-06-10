"use client"

import { useRef, useState } from "react"
import { useSocket } from "./context/socket";


export default function Home() {
const [caption, setCaption] = useState<string>(""); 
const [isRecording, setIsRecording] = useState<boolean>(false);
const mediaRecorderRef = useRef<MediaRecorder | null>(null);

const socket = useSocket();

const startRecording = async () => {
    setCaption("");
    setIsRecording(true);
    
    if(socket) {
        socket.emit("start");

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: "audio/webm"
            });

            mediaRecorderRef.current = mediaRecorder;

            console.log("Recording started");

            mediaRecorder.start(250);

            mediaRecorder.ondataavailable = (event) => {
                if(event.data.size > 0 && socket.connected) {
                    socket.emit("audio", event.data);
                }
            }

            socket.on('caption', (caption) => {
                setCaption((prevCaption) => prevCaption + caption);
            })

            mediaRecorder.onstop = () => {
                socket.emit("stop");
                setIsRecording(false)
            }

        } catch (error) {
            console.error("Error accessing microphone", error);
            setIsRecording(false);
        }
    }
};

const stopRecording = () => {
    if(mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }
}

return (
    <div className="grid place-items-center h-screen">
        <div className="flex flex-col gap-4">   
            <button className="p-2 bg-blue-500 text-white rounded w-fit mx-auto px-4" onClick={isRecording ? stopRecording : startRecording}>{isRecording ? "Stop" : "Start"} transcript</button>
            <p className="text-center">{caption || "Press 'Start Recording' and begin speaking..."}</p>
        </div>
    </div>
)
}