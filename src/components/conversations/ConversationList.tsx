import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileAudio, Trash2, ExternalLink } from "lucide-react";
import type { BackendConversation } from "@/hooks/useBackendConversations";
import { formatDuration } from "@/lib/conversations";

function getStatusBadge(status: string) {
  switch (status) {
    case "ready":
      return <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">Ready</Badge>;
    case "transcribing":
      return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">Transcribing...</Badge>;
    case "uploading":
      return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">Uploading...</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

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
        <div className="flex items-center gap-2">
          <FileAudio className="h-5 w-5 text-primary" />
          <CardTitle>Recent Meetings</CardTitle>
        </div>
        <CardDescription>Your meeting recordings with transcripts, summaries, and extracted action items.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading meetings…
          </div>
        ) : null}
        {!isLoading && items.length === 0 ? (
          <div className="py-8 text-center">
            <FileAudio className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">No meetings yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Record or upload a meeting to get started.</p>
          </div>
        ) : null}

        <ul className="space-y-3">
          {items.map((c) => (
            <li
              key={c.id}
              className="group rounded-lg border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium text-foreground">{c.title}</h3>
                    {getStatusBadge(c.status)}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(c.createdAt).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(c.durationMs)}
                    </span>
                    <span>{Math.round(c.sizeBytes / 1024)} KB</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button asChild size="sm" variant="default">
                    <Link to={`/c/${c.id}`}>
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      View
                    </Link>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => void onDelete(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
