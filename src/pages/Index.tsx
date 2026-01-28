import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Brain, Calendar, Clock, Plus, Loader2, CalendarDays, History, Radio, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useMeetings } from "@/hooks/useMeetings";
import { CreateMeetingDialog } from "@/components/meetings/CreateMeetingDialog";
import { MeetingCard } from "@/components/meetings/MeetingCard";
import { ConversationRecorder } from "@/components/conversations/ConversationRecorder";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Index = () => {
  const navigate = useNavigate();
  const {
    meetings,
    meetingTypes,
    grouped,
    isLoading,
    error,
    createMeeting,
    deleteMeeting,
    startMeeting,
    completeMeeting,
  } = useMeetings();

  const [recordingMeetingId, setRecordingMeetingId] = React.useState<string | null>(null);
  const [showRecorder, setShowRecorder] = React.useState(false);

  const handleStartMeeting = (meetingId: string) => {
    setRecordingMeetingId(meetingId);
    setShowRecorder(true);
    void startMeeting(meetingId);
  };

  const upcomingCount = grouped.upcoming.length + grouped.inProgress.length;
  const completedCount = grouped.completed.length;

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="border-b bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Brain className="h-6 w-6" />
                <span className="text-sm font-semibold tracking-wide uppercase">MeetingIQ</span>
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Your Meetings Dashboard
              </h1>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Schedule meetings, invite participants, record sessions, and get automatic 
                transcripts with action items and meeting notes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" variant="secondary" className="gap-2">
                <Link to="/quick">
                  <Zap className="h-5 w-5" />
                  Quick Record
                </Link>
              </Button>
              <CreateMeetingDialog 
                meetingTypes={meetingTypes} 
                onCreateMeeting={createMeeting}
                trigger={
                  <Button size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Schedule Meeting
                  </Button>
                }
              />
              <Button asChild variant="outline" size="lg">
                <Link to="/calendar">
                  <CalendarDays className="mr-2 h-5 w-5" />
                  Calendar
                </Link>
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-6 flex gap-4">
            <div className="flex items-center gap-2 rounded-lg border bg-background px-4 py-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{upcomingCount} Upcoming</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-background px-4 py-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{completedCount} Completed</span>
            </div>
            {grouped.inProgress.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border bg-green-500/10 px-4 py-2">
                <Radio className="h-4 w-4 text-green-600 animate-pulse" />
                <span className="text-sm font-medium text-green-600">{grouped.inProgress.length} In Progress</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : meetings.length === 0 ? (
          <Card className="py-12 text-center">
            <CardContent>
              <CalendarDays className="mx-auto h-16 w-16 text-muted-foreground/50" />
              <h2 className="mt-4 text-xl font-semibold">No meetings yet</h2>
              <p className="mt-2 text-muted-foreground">
                Schedule your first meeting to get started with automatic transcription and notes.
              </p>
              <CreateMeetingDialog 
                meetingTypes={meetingTypes} 
                onCreateMeeting={createMeeting}
                trigger={
                  <Button className="mt-6 gap-2">
                    <Plus className="h-4 w-4" />
                    Schedule Your First Meeting
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList>
              <TabsTrigger value="upcoming" className="gap-1.5">
                <Calendar className="h-4 w-4" />
                Upcoming
                {upcomingCount > 0 && (
                  <Badge variant="secondary" className="ml-1">{upcomingCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-1.5">
                <History className="h-4 w-4" />
                Completed
                {completedCount > 0 && (
                  <Badge variant="secondary" className="ml-1">{completedCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {/* In Progress */}
              {grouped.inProgress.length > 0 && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-green-600">
                    <Radio className="h-4 w-4 animate-pulse" />
                    In Progress
                  </h3>
                  {grouped.inProgress.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      onStart={handleStartMeeting}
                      onComplete={completeMeeting}
                      onDelete={deleteMeeting}
                    />
                  ))}
                </div>
              )}

              {/* Upcoming */}
              {grouped.upcoming.length > 0 ? (
                <div className="space-y-3">
                  {grouped.inProgress.length > 0 && (
                    <h3 className="text-sm font-semibold text-muted-foreground">Scheduled</h3>
                  )}
                  {grouped.upcoming.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      onStart={handleStartMeeting}
                      onDelete={deleteMeeting}
                    />
                  ))}
                </div>
              ) : grouped.inProgress.length === 0 ? (
                <Card className="py-8 text-center">
                  <CardContent>
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-3 text-muted-foreground">No upcoming meetings scheduled.</p>
                    <CreateMeetingDialog 
                      meetingTypes={meetingTypes} 
                      onCreateMeeting={createMeeting}
                      trigger={
                        <Button variant="outline" className="mt-4 gap-2">
                          <Plus className="h-4 w-4" />
                          Schedule a Meeting
                        </Button>
                      }
                    />
                  </CardContent>
                </Card>
              ) : null}

              {/* Past (missed) */}
              {grouped.past.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">Past (not recorded)</h3>
                  {grouped.past.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      onStart={handleStartMeeting}
                      onDelete={deleteMeeting}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {grouped.completed.length > 0 ? (
                grouped.completed.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onDelete={deleteMeeting}
                  />
                ))
              ) : (
                <Card className="py-8 text-center">
                  <CardContent>
                    <History className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-3 text-muted-foreground">No completed meetings yet.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </section>

      {/* Recording Dialog */}
      <Dialog open={showRecorder} onOpenChange={setShowRecorder}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Meeting</DialogTitle>
            <DialogDescription>
              Record your meeting audio. When finished, it will be transcribed and analyzed.
            </DialogDescription>
          </DialogHeader>
          <ConversationRecorder />
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t bg-card/50 py-6">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Brain className="h-4 w-4" />
            <span>MeetingIQ — Smart Meeting Intelligence</span>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Index;
