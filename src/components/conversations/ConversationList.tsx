import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BackendConversation } from "@/hooks/useBackendConversations";
import { formatDuration } from "@/lib/conversations";

export function ConversationList({
  items,
  isLoading,
  error,
  onDelete,
}: {
  items: BackendConversation[];
  isLoading: boolean;
  error: string | null;
  onDelete: (id: string) => Promise<void> | void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversations</CardTitle>
        <CardDescription>Saved to your private backend storage on this device.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
        {!isLoading && items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No conversations yet. Record or upload one.</div>
        ) : null}

        <ul className="space-y-2">
          {items.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{c.title}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(c.createdAt).toLocaleString()} • {formatDuration(c.durationMs)} • {Math.round(c.sizeBytes / 1024)} KB
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link to={`/c/${c.id}`}>Open</Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => void onDelete(c.id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
