import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabaseDevice } from "@/integrations/supabase/clientDevice";
import { formatDuration } from "@/lib/conversations";
import { User, Clock } from "lucide-react";

interface TranscriptChunk {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  speaker: string | null;
}

interface LiveTranscriptProps {
  conversationId: string;
  currentTimeMs?: number;
  onSeek?: (timeMs: number) => void;
}

export function LiveTranscript({ conversationId, currentTimeMs = 0, onSeek }: LiveTranscriptProps) {
  const [chunks, setChunks] = React.useState<TranscriptChunk[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const fetchTranscript = async () => {
      setIsLoading(true);
      const { data, error } = await supabaseDevice
        .from("transcript_chunks")
        .select("id, text, start_ms, end_ms, speaker")
        .eq("conversation_id", conversationId)
        .order("start_ms", { ascending: true });

      if (!error && data) {
        setChunks(data.map((c) => ({
          id: c.id,
          text: c.text,
          startMs: c.start_ms,
          endMs: c.end_ms,
          speaker: c.speaker,
        })));
      }
      setIsLoading(false);
    };

    void fetchTranscript();
  }, [conversationId]);

  // Group chunks by speaker for better visualization
  const groupedChunks = React.useMemo(() => {
    const groups: Array<{
      speaker: string | null;
      chunks: TranscriptChunk[];
      startMs: number;
      endMs: number;
    }> = [];

    let currentGroup: typeof groups[0] | null = null;

    for (const chunk of chunks) {
      if (!currentGroup || currentGroup.speaker !== chunk.speaker) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = {
          speaker: chunk.speaker,
          chunks: [chunk],
          startMs: chunk.startMs,
          endMs: chunk.endMs,
        };
      } else {
        currentGroup.chunks.push(chunk);
        currentGroup.endMs = chunk.endMs;
      }
    }

    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, [chunks]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (chunks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 font-medium text-muted-foreground">No transcript available</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Transcript will appear here once processing is complete.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]" ref={scrollRef}>
      <div className="space-y-4 pr-4">
        {groupedChunks.map((group, idx) => {
          const isActive = currentTimeMs >= group.startMs && currentTimeMs <= group.endMs;
          
          return (
            <div
              key={idx}
              className={`rounded-lg border p-3 transition-all ${
                isActive ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              {/* Speaker header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium">
                    {group.speaker || "Speaker"}
                  </span>
                </div>
                <button
                  onClick={() => onSeek?.(group.startMs)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
                >
                  {formatDuration(group.startMs)}
                </button>
              </div>

              {/* Text content */}
              <p className="text-sm leading-relaxed">
                {group.chunks.map((chunk) => chunk.text).join(" ")}
              </p>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
