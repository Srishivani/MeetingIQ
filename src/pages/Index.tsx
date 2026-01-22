// Update this page (the content is just a fallback if you fail to update the page)

import { ConversationList } from "@/components/conversations/ConversationList";
import { ConversationRecorder } from "@/components/conversations/ConversationRecorder";
import { useConversations } from "@/hooks/useConversations";

const Index = () => {
  const { items, isLoading, error, create, remove } = useConversations();

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-10">
          <p className="text-xs text-muted-foreground">ConvoIQ • Frontend-only prototype</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Turn raw conversations into searchable intelligence</h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            This build records or uploads audio and stores it locally in your browser. AI features are stubbed until we enable a secure backend.
          </p>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <ConversationRecorder onCreate={create} />
          <ConversationList items={items} isLoading={isLoading} error={error} onDelete={remove} />
        </div>
      </section>
    </main>
  );
};

export default Index;
