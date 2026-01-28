import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DetectedPhrase, MeetingItemType, Priority } from "@/lib/phraseDetection";

export interface EnhancedItem {
  id: string;
  originalPhrase: DetectedPhrase;
  enhancedContent: string | null;
  owner: string | null;
  priority: Priority;
  dueDate: string | null;
  confidence: number;
  isEnhancing: boolean;
  isEnhanced: boolean;
  status: "pending" | "confirmed" | "dismissed";
}

interface EnhanceResponse {
  enhancedContent: string;
  owner: string | null;
  priority: Priority;
  suggestedDueDate: string | null;
  confidence: number;
}

const DEBOUNCE_MS = 2000;
const MAX_CONCURRENT_REQUESTS = 3;

export function useRealtimeEnhancement() {
  const [items, setItems] = React.useState<EnhancedItem[]>([]);
  const [isEnhancing, setIsEnhancing] = React.useState(false);
  const pendingQueue = React.useRef<DetectedPhrase[]>([]);
  const activeRequests = React.useRef(0);
  const debounceTimer = React.useRef<NodeJS.Timeout | null>(null);

  // Add a detected phrase to the queue
  const addPhrase = React.useCallback((phrase: DetectedPhrase) => {
    const id = crypto.randomUUID();
    
    // Immediately add to items list
    const newItem: EnhancedItem = {
      id,
      originalPhrase: phrase,
      enhancedContent: null,
      owner: phrase.extractedOwner,
      priority: phrase.priority,
      dueDate: phrase.extractedDeadline,
      confidence: phrase.confidence,
      isEnhancing: false,
      isEnhanced: false,
      status: "pending",
    };
    
    setItems((prev) => [...prev, newItem]);
    
    // Add to pending queue for AI enhancement
    pendingQueue.current.push({ ...phrase, timestampMs: phrase.timestampMs });
    
    // Debounce the AI enhancement call
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      processQueue();
    }, DEBOUNCE_MS);

    return id;
  }, []);

  // Process the pending queue
  const processQueue = React.useCallback(async () => {
    if (pendingQueue.current.length === 0) return;
    if (activeRequests.current >= MAX_CONCURRENT_REQUESTS) return;

    const phrasesToProcess = pendingQueue.current.splice(0, MAX_CONCURRENT_REQUESTS - activeRequests.current);
    if (phrasesToProcess.length === 0) return;

    setIsEnhancing(true);

    for (const phrase of phrasesToProcess) {
      activeRequests.current++;
      
      // Mark item as enhancing
      setItems((prev) =>
        prev.map((item) =>
          item.originalPhrase.timestampMs === phrase.timestampMs
            ? { ...item, isEnhancing: true }
            : item
        )
      );

      try {
        const { data, error } = await supabase.functions.invoke<EnhanceResponse>("enhance-item", {
          body: {
            phrase: phrase.content,
            context: phrase.context,
            type: phrase.type,
            extractedOwner: phrase.extractedOwner,
            extractedDeadline: phrase.extractedDeadline,
            priority: phrase.priority,
          },
        });

        if (error) {
          console.error("[useRealtimeEnhancement] Enhancement failed:", error);
        }

        // Update item with enhanced data
        setItems((prev) =>
          prev.map((item) =>
            item.originalPhrase.timestampMs === phrase.timestampMs
              ? {
                  ...item,
                  enhancedContent: data?.enhancedContent || phrase.content,
                  owner: data?.owner || phrase.extractedOwner,
                  priority: data?.priority || phrase.priority,
                  dueDate: data?.suggestedDueDate || phrase.extractedDeadline,
                  confidence: data?.confidence || phrase.confidence,
                  isEnhancing: false,
                  isEnhanced: true,
                }
              : item
          )
        );
      } catch (err) {
        console.error("[useRealtimeEnhancement] Error:", err);
        
        // Mark as not enhancing on error
        setItems((prev) =>
          prev.map((item) =>
            item.originalPhrase.timestampMs === phrase.timestampMs
              ? { ...item, isEnhancing: false }
              : item
          )
        );
      } finally {
        activeRequests.current--;
      }
    }

    setIsEnhancing(activeRequests.current > 0);
    
    // Process remaining queue
    if (pendingQueue.current.length > 0) {
      processQueue();
    }
  }, []);

  // Confirm an item
  const confirmItem = React.useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "confirmed" } : item
      )
    );
  }, []);

  // Dismiss an item
  const dismissItem = React.useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "dismissed" } : item
      )
    );
  }, []);

  // Remove an item
  const removeItem = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Update an item
  const updateItem = React.useCallback((id: string, updates: Partial<Pick<EnhancedItem, "enhancedContent" | "owner" | "priority" | "dueDate">>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  }, []);

  // Get grouped items by type
  const grouped = React.useMemo(() => {
    const groups: Record<MeetingItemType, EnhancedItem[]> = {
      deferred: [],
      action_item: [],
      decision: [],
      question: [],
      risk: [],
      followup: [],
      commitment: [],
      concern: [],
      ambiguity: [],
    };
    
    for (const item of items.filter((i) => i.status !== "dismissed")) {
      groups[item.originalPhrase.type].push(item);
    }
    
    return groups;
  }, [items]);

  // Get items by status
  const pendingItems = React.useMemo(
    () => items.filter((i) => i.status === "pending"),
    [items]
  );

  const confirmedItems = React.useMemo(
    () => items.filter((i) => i.status === "confirmed"),
    [items]
  );

  // Reset all items
  const reset = React.useCallback(() => {
    setItems([]);
    pendingQueue.current = [];
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    items,
    grouped,
    pendingItems,
    confirmedItems,
    isEnhancing,
    addPhrase,
    confirmItem,
    dismissItem,
    removeItem,
    updateItem,
    reset,
  };
}
