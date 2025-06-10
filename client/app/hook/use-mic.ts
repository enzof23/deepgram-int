import { useState, useRef, useCallback } from "react";

export type MicrophoneState = "idle" | "recording" | "error" | "stopped";

export const useMicrophone = () => {
  const [micStatus, setMicStatus] = useState<MicrophoneState>("idle");
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const openMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      setMediaRecorder(recorder);

      recorder.start(250);
      setMicStatus("recording");

    } catch (error) {
      console.error("Error accessing microphone", error);
      setMicStatus("error");
    }
  }, []);

  const closeMic = useCallback(() => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMicStatus("stopped");
    }
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
  }, [mediaRecorder]);

  return {
    micStatus,
    openMic,
    closeMic,
    mediaRecorder,
  };
};