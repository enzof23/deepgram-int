import { z } from "zod";

export const captionSchema = z.string().min(1);
export const roomIDSchema = z.string().min(1);
export const audioDataSchema = z.instanceof(Blob);

export type Caption = z.infer<typeof captionSchema>;
export type RoomID = z.infer<typeof roomIDSchema>;