import { Socket } from "socket.io-client";
import type { Caption, RoomID } from "../schemas/audio";

export interface ServerToClientEvents {
    caption: (caption: Caption) => void;
    lesson_started: () => void;
    lesson_ended: () => void;
    error: (error: string) => void;
}

export interface ClientToServerEvents {
    join_room: (roomID: RoomID) => void;
    start_lesson: () => void;
    send_audio: (audioData: Blob) => void;
    stop_lesson: () => void;
}

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
