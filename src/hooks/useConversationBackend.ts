import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceKey } from "@/lib/deviceKey";

export function useConversationBackend() {
  const uploadAndTranscribe = React.useCallback(async (file: Blob, metadata: {
    title: string;
    durationMs: number;
    mimeType: string;
    sizeBytes: number;
  }) => {
    const deviceKey = getDeviceKey();

    // Create conversation record in DB
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({
        device_key: deviceKey,
        title: metadata.title,
        duration_ms: metadata.durationMs,
        mime_type: metadata.mimeType,
        size_bytes: metadata.sizeBytes,
        status: "uploading",
      })
      .select()
      .single();

    if (convError || !conv) {
      throw new Error("Failed to create conversation record");
    }

    const conversationId = conv.id;

    // Upload audio to storage
    const path = `${deviceKey}/${conversationId}.${metadata.mimeType.split("/")[1] || "webm"}`;
    const { error: uploadError } = await supabase.storage
      .from("conversation-audio")
      .upload(path, file);

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Trigger transcription
    const formData = new FormData();
    formData.append("conversationId", conversationId);
    formData.append("audio", file);

    const transcribeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe`;
    const transcribeResponse = await fetch(transcribeUrl, {
      method: "POST",
      headers: {
        "x-device-key": deviceKey,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: formData,
    });

    if (!transcribeResponse.ok) {
      throw new Error("Transcription failed");
    }

    // Trigger summarization
    const summarizeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize`;
    await fetch(summarizeUrl, {
      method: "POST",
      headers: {
        "x-device-key": deviceKey,
        "content-type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ conversationId }),
    });

    return conversationId;
  }, []);

  const askQuestion = React.useCallback(async (conversationId: string, question: string) => {
    const deviceKey = getDeviceKey();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-device-key": deviceKey,
        "content-type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ conversationId, question }),
    });

    if (!response.ok) {
      throw new Error("Question failed");
    }

    const data = await response.json();
    return data as { answer: string; citations: Array<{ text: string; timestamp_ms: number }> };
  }, []);

  return { uploadAndTranscribe, askQuestion };
}
