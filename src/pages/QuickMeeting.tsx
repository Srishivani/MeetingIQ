import * as React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, Calendar, Zap, ArrowRight } from "lucide-react";
import { InstantRecorder } from "@/components/instant/InstantRecorder";

const QuickMeeting = () => {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto w-full max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
              <Brain className="h-5 w-5" />
              <span className="text-sm font-semibold tracking-wide uppercase">MeetingIQ</span>
            </Link>

            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="sm">
                <Link to="/">
                  <Calendar className="mr-2 h-4 w-4" />
                  Scheduled Meetings
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto w-full max-w-4xl px-4 py-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
            <Zap className="h-4 w-4" />
            Instant Mode
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Quick Meeting Capture
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-xl mx-auto">
            Record spontaneous meetings instantly. AI will detect action items, decisions, 
            and questions in real-time. Name it later.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <InstantRecorder />
      </div>

      {/* Footer CTA */}
      <div className="border-t bg-muted/30">
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <h3 className="font-semibold">Need to schedule meetings with participants?</h3>
              <p className="text-sm text-muted-foreground">
                Use our full meeting management dashboard with agendas, invites, and calendar view.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default QuickMeeting;
