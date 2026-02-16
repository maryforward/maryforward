import { z } from "zod";

export const createMessageSchema = z.object({
  content: z
    .string()
    .max(10000, "Message is too long")
    .optional()
    .default(""),
});

export const messageAttachmentSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(100),
  fileSize: z.number().int().positive().max(25 * 1024 * 1024), // 25MB max
  storageKey: z.string().min(1),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type MessageAttachmentInput = z.infer<typeof messageAttachmentSchema>;
