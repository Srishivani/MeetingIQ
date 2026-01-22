import * as React from "react";
import { supabaseDevice } from "@/integrations/supabase/clientDevice";
import type { ConversationStatus } from "@/lib/conversations";

export type BackendConversation = {
  id: string;
  title: string;
  createdAt: number;
  durationMs: number;
  mimeType: string;
  sizeBytes: number;
  status: ConversationStatus | string;
};

export function useBackendConversations() {
  const [items, setItems] = React.useState<BackendConversation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error: err } = await supabaseDevice
      .from("conversations")
      .select("id, title, created_at, duration_ms, mime_type, size_bytes, status")
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
      setItems([]);
      setIsLoading(false);
      return;
    }

    setItems(
      (data ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: new Date(c.created_at).getTime(),
        durationMs: c.duration_ms,
        mimeType: c.mime_type,
        sizeBytes: c.size_bytes,
        status: c.status,
      })),
    );
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = React.useCallback(
    async (id: string) => {
      const { error: err } = await supabaseDevice.from("conversations").delete().eq("id", id);
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh],
  );

  return { items, isLoading, error, refresh, remove };
}
