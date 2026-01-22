import * as React from "react";
import { supabaseDevice } from "@/integrations/supabase/clientDevice";
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
    const { data: conv, error: convError } = await supabaseDevice
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
    const { error: uploadError } = await supabaseDevice.storage
      .from("conversation-audio")
      .upload(path, file, { contentType: metadata.mimeType });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Trigger transcription
    const formData = new FormData();
    formData.append("conversationId", conversationId);
    formData.append("audio", file);
    const transcribeRes = await supabaseDevice.functions.invoke("transcribe", {
      body: formData,
    });
    if (transcribeRes.error) {
      throw new Error(transcribeRes.error.message || "Transcription failed");
    }

    // Trigger summarization
    const summarizeRes = await supabaseDevice.functions.invoke("summarize", {
      body: { conversationId },
    });
    if (summarizeRes.error) {
      // Keep non-blocking? For now, treat as error because UI expects summary.
      throw new Error(summarizeRes.error.message || "Summarization failed");
    }

    return conversationId;
  }, []);

  const askQuestion = React.useCallback(async (conversationId: string, question: string) => {
    const res = await supabaseDevice.functions.invoke("ask", {
      body: { conversationId, question },
    });
    if (res.error) {
      throw new Error(res.error.message || "Question failed");
    }
    return res.data as { answer: string; citations: Array<{ text: string; timestamp_ms: number }> };
  }, []);

  return { uploadAndTranscribe, askQuestion };
}
