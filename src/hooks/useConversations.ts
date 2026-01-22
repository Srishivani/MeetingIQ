import * as React from "react";
import type { ConversationRecord } from "@/lib/conversations";
import { idbDeleteConversation, idbGetConversation, idbListConversations, idbPutConversation } from "@/lib/idb";

export function useConversations() {
  const [items, setItems] = React.useState<Omit<ConversationRecord, "audioBlob">[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      setError(null);
      const list = await idbListConversations();
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = React.useCallback(async (record: ConversationRecord) => {
    await idbPutConversation(record);
    await refresh();
  }, [refresh]);

  const remove = React.useCallback(async (id: string) => {
    await idbDeleteConversation(id);
    await refresh();
  }, [refresh]);

  const get = React.useCallback(async (id: string) => {
    return await idbGetConversation(id);
  }, []);

  return { items, isLoading, error, refresh, create, remove, get };
}
