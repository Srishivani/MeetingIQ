import { ConversationList } from "@/components/conversations/ConversationList";
import { ConversationRecorder } from "@/components/conversations/ConversationRecorder";
import { useBackendConversations } from "@/hooks/useBackendConversations";
import { Mic, FileAudio, Brain, FileText, CheckSquare, Gavel, HelpCircle, Clock } from "lucide-react";

const Index = () => {
  const { items, isLoading, error, remove } = useBackendConversations();

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="border-b bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-12">
          <div className="flex items-center gap-2 text-primary">
            <Brain className="h-6 w-6" />
            <span className="text-sm font-semibold tracking-wide uppercase">MeetingIQ</span>
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Turn every meeting into<br />
            <span className="text-primary">actionable intelligence</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Record your meetings, get real-time phrase detection for action items and decisions, 
            then generate transcripts, structured summaries, and exportable meeting minutes.
          </p>
          
          {/* Feature highlights */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <CheckSquare className="h-4 w-4 text-primary" />
              </div>
              <span>Action Items</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Gavel className="h-4 w-4 text-primary" />
              </div>
              <span>Decisions</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <HelpCircle className="h-4 w-4 text-primary" />
              </div>
              <span>Open Questions</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <span>Deferred Items</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <ConversationRecorder />
          </div>
          <ConversationList items={items} isLoading={isLoading} error={error} onDelete={remove} />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50 py-6">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="h-4 w-4" />
              <span>MeetingIQ — Smart Meeting Intelligence</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mic className="h-3 w-3" />
                Record
              </span>
              <span>→</span>
              <span className="flex items-center gap-1">
                <FileAudio className="h-3 w-3" />
                Transcribe
              </span>
              <span>→</span>
              <span className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                Analyze
              </span>
              <span>→</span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Export
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Index;
