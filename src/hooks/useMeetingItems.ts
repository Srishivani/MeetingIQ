import * as React from "react";
import { supabaseDevice } from "@/integrations/supabase/clientDevice";
import { getDeviceKey } from "@/lib/deviceKey";
import type { MeetingItemType, DetectedPhrase } from "@/lib/phraseDetection";

export interface MeetingItem {
  id: string;
  conversationId: string;
  type: MeetingItemType;
  content: string;
  context: string | null;
  owner: string | null;
  timestampMs: number;
  triggerPhrase: string | null;
  isAiEnhanced: boolean;
  createdAt: string;
}

export function useMeetingItems(conversationId: string | null) {
  const [items, setItems] = React.useState<MeetingItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch items from database
  const fetchItems = React.useCallback(async () => {
    if (!conversationId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabaseDevice
        .from("meeting_items")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("timestamp_ms", { ascending: true });

      if (fetchError) throw fetchError;

      setItems(
        (data ?? []).map((row) => ({
          id: row.id,
          conversationId: row.conversation_id,
          type: row.item_type as MeetingItemType,
          content: row.content,
          context: row.context,
          owner: row.owner,
          timestampMs: row.timestamp_ms,
          triggerPhrase: row.trigger_phrase,
          isAiEnhanced: row.is_ai_enhanced,
          createdAt: row.created_at,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load meeting items");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Add a detected phrase as a meeting item (live detection)
  const addItem = React.useCallback(
    async (phrase: DetectedPhrase) => {
      if (!conversationId) return null;

      const deviceKey = getDeviceKey();
      const tempId = crypto.randomUUID();

      // Optimistic update
      const newItem: MeetingItem = {
        id: tempId,
        conversationId,
        type: phrase.type,
        content: phrase.content,
        context: phrase.context,
        owner: null,
        timestampMs: phrase.timestampMs,
        triggerPhrase: phrase.triggerPhrase,
        isAiEnhanced: false,
        createdAt: new Date().toISOString(),
      };

      setItems((prev) => [...prev, newItem]);

      try {
        const { data, error: insertError } = await supabaseDevice
          .from("meeting_items")
          .insert({
            conversation_id: conversationId,
            device_key: deviceKey,
            item_type: phrase.type,
            content: phrase.content,
            context: phrase.context,
            timestamp_ms: phrase.timestampMs,
            trigger_phrase: phrase.triggerPhrase,
            is_ai_enhanced: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Update with real ID
        setItems((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? { ...item, id: data.id, createdAt: data.created_at }
              : item
          )
        );

        return data.id;
      } catch (err) {
        // Rollback
        setItems((prev) => prev.filter((item) => item.id !== tempId));
        console.error("[useMeetingItems] Insert failed:", err);
        return null;
      }
    },
    [conversationId]
  );

  // Remove an item
  const removeItem = React.useCallback(async (itemId: string) => {
    const prev = items;
    setItems((current) => current.filter((i) => i.id !== itemId));

    try {
      const { error: deleteError } = await supabaseDevice
        .from("meeting_items")
        .delete()
        .eq("id", itemId);

      if (deleteError) throw deleteError;
    } catch (err) {
      setItems(prev);
      console.error("[useMeetingItems] Delete failed:", err);
    }
  }, [items]);

  // Update an item
  const updateItem = React.useCallback(
    async (itemId: string, updates: Partial<Pick<MeetingItem, "content" | "owner">>) => {
      const prev = items;
      setItems((current) =>
        current.map((i) => (i.id === itemId ? { ...i, ...updates } : i))
      );

      try {
        const { error: updateError } = await supabaseDevice
          .from("meeting_items")
          .update({
            content: updates.content,
            owner: updates.owner,
          })
          .eq("id", itemId);

        if (updateError) throw updateError;
      } catch (err) {
        setItems(prev);
        console.error("[useMeetingItems] Update failed:", err);
      }
    },
    [items]
  );

  // Clear all items for conversation
  const clearAll = React.useCallback(async () => {
    if (!conversationId) return;
    
    setItems([]);
    
    try {
      await supabaseDevice
        .from("meeting_items")
        .delete()
        .eq("conversation_id", conversationId);
    } catch (err) {
      console.error("[useMeetingItems] Clear failed:", err);
    }
  }, [conversationId]);

  // Initial fetch
  React.useEffect(() => {
    if (conversationId) {
      void fetchItems();
    } else {
      setItems([]);
    }
  }, [conversationId, fetchItems]);

  // Group items by type
  const grouped = React.useMemo(() => {
    const groups: Record<MeetingItemType, MeetingItem[]> = {
      deferred: [],
      action_item: [],
      decision: [],
      question: [],
    };
    for (const item of items) {
      groups[item.type].push(item);
    }
    return groups;
  }, [items]);

  return {
    items,
    grouped,
    isLoading,
    error,
    addItem,
    removeItem,
    updateItem,
    clearAll,
    refetch: fetchItems,
  };
}
