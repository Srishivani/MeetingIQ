export type ConversationStatus = "local";

export type ConversationRecord = {
  id: string;
  title: string;
  createdAt: number;
  durationMs: number;
  mimeType: string;
  sizeBytes: number;
  audioBlob: Blob;
  status: ConversationStatus;
};

export type ConversationMetadata = Omit<ConversationRecord, "audioBlob">;

export const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};
