import * as React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, Calendar, Mic, Zap, FileText, Users, BarChart3, ArrowRight } from "lucide-react";
import { InstantRecorder } from "@/components/instant/InstantRecorder";

const QuickMeeting = () => {
  return (
    <main className="min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Brain className="h-5 w-5" />
              <span className="text-sm font-bold tracking-wide">MeetingIQ</span>
            </div>

            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">
                <Calendar className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-8">
        <div className="mx-auto w-full max-w-4xl px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Zap className="h-4 w-4" />
              Instant Capture
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              Capture Every
              <br />
              <span className="text-primary">Important Moment</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Start recording instantly. Our AI detects action items, decisions, and 
              questions in real-time. Transcription and summaries generated automatically.
            </p>
          </div>

          {/* Main Recorder */}
          <InstantRecorder />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 border-t bg-muted/30">
        <div className="mx-auto w-full max-w-5xl px-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Mic className="h-5 w-5" />}
              title="One-Click Record"
              description="No setup needed. Just click and start capturing."
            />
            <FeatureCard
              icon={<Brain className="h-5 w-5" />}
              title="AI Detection"
              description="Real-time identification of action items and decisions."
            />
            <FeatureCard
              icon={<FileText className="h-5 w-5" />}
              title="Auto Transcripts"
              description="Full transcription with speaker identification."
            />
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Smart Summary"
              description="Key points, quotes, and follow-ups extracted."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 border-t">
        <div className="mx-auto w-full max-w-4xl px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-card border">
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-semibold">Need scheduled meetings?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Manage participants, agendas, and recurring meetings with our full dashboard.
              </p>
            </div>
            <Button asChild>
              <Link to="/dashboard">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t">
        <div className="mx-auto w-full max-w-4xl px-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Brain className="h-4 w-4" />
            <span>MeetingIQ — Smart Meeting Intelligence</span>
          </div>
        </div>
      </footer>
    </main>
  );
};

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-5 rounded-xl bg-background border transition-colors hover:border-primary/30">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default QuickMeeting;
