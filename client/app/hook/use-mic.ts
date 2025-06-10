import { useState, useRef, useCallback } from "react";

export type MicrophoneState = "idle" | "recording" | "error" | "stopped";

export const useMicrophone = () => {
  const [micStatus, setMicStatus] = useState<MicrophoneState>("idle");
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const openMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.start(250);
      setMicStatus("recording");

      return recorder;

    } catch (error) {
      console.error("Error accessing microphone", error);
      setMicStatus("error");
      return null;
    }
  }, []);

  const closeMic = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setMicStatus("stopped");
    }
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
  }, []);

  return {
    micStatus,
    openMic,
    closeMic,
    mediaRecorderRef,
  };
};