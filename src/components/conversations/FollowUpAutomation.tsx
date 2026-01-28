import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabaseDevice } from "@/integrations/supabase/clientDevice";
import { 
  Mail, Calendar, Bell, Loader2, Copy, Check, 
  Send, User, Clock, ListChecks, RefreshCw, ExternalLink
} from "lucide-react";
import { toast } from "sonner";

interface TaskNudge {
  recipient: string;
  task: string;
  suggested_date: string;
}

interface FollowUpData {
  follow_up_email: string | null;
  next_meeting_agenda: string[] | null;
  task_nudges: TaskNudge[] | null;
  executive_summary: string | null;
}

interface Participant {
  name: string;
  email?: string | null;
}

interface FollowUpAutomationProps {
  conversationId: string;
  meetingTitle?: string;
  participants?: Participant[];
}

export function FollowUpAutomation({ conversationId, meetingTitle, participants }: FollowUpAutomationProps) {
  const [data, setData] = React.useState<FollowUpData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [copiedEmail, setCopiedEmail] = React.useState(false);
  const [copiedAgenda, setCopiedAgenda] = React.useState(false);

  const fetchFollowUpData = React.useCallback(async () => {
    try {
      // Fetch from the summarize endpoint - it stores this in the response
      // For now, we'll re-call summarize to get the full data
      const res = await supabaseDevice.functions.invoke("summarize", {
        body: { conversationId },
      });

      if (res.error) {
        console.error("[FollowUpAutomation] Error:", res.error);
        return;
      }

      const summary = res.data?.summary;
      if (summary) {
        setData({
          follow_up_email: summary.follow_up_email || null,
          next_meeting_agenda: summary.next_meeting_agenda || null,
          task_nudges: summary.task_nudges || null,
          executive_summary: summary.executive_summary || null,
        });
      }
    } catch (err) {
      console.error("[FollowUpAutomation] Failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  React.useEffect(() => {
    void fetchFollowUpData();
  }, [fetchFollowUpData]);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    await fetchFollowUpData();
    setIsRegenerating(false);
    toast.success("Follow-up content regenerated");
  };

  const handleCopyEmail = () => {
    if (data?.follow_up_email) {
      navigator.clipboard.writeText(data.follow_up_email);
      setCopiedEmail(true);
      toast.success("Email copied to clipboard");
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleCopyAgenda = () => {
    if (data?.next_meeting_agenda) {
      const agendaText = data.next_meeting_agenda.map((item, i) => `${i + 1}. ${item}`).join("\n");
      navigator.clipboard.writeText(agendaText);
      setCopiedAgenda(true);
      toast.success("Agenda copied to clipboard");
      setTimeout(() => setCopiedAgenda(false), 2000);
    }
  };

  const handleSendEmail = () => {
    if (!data?.follow_up_email) return;

    // Build recipient list from participants with emails
    const recipientEmails = participants
      ?.filter((p) => p.email)
      .map((p) => p.email!)
      .join(",") || "";

    const subject = encodeURIComponent(
      `Meeting Recap: ${meetingTitle || "Recent Meeting"}`
    );
    const body = encodeURIComponent(data.follow_up_email);

    const mailtoUrl = `mailto:${recipientEmails}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
    toast.success("Opening email client...");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            <CardTitle>Follow-Up Automation</CardTitle>
          </div>
          <CardDescription className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating follow-up content...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const hasContent = data?.follow_up_email || data?.next_meeting_agenda?.length || data?.task_nudges?.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            <CardTitle>Follow-Up Automation</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-1.5">Regenerate</span>
          </Button>
        </div>
        <CardDescription>
          AI-generated recap email, task nudges, and next meeting agenda.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!hasContent ? (
          <div className="rounded-lg border bg-muted/30 p-8 text-center">
            <Send className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-3 font-medium text-muted-foreground">No follow-up content available</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Click regenerate to generate follow-up automation content.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="email" className="gap-1.5">
                <Mail className="h-4 w-4" />
                Recap Email
              </TabsTrigger>
              <TabsTrigger value="nudges" className="gap-1.5">
                <Bell className="h-4 w-4" />
                Task Nudges
                {data?.task_nudges?.length ? (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {data.task_nudges.length}
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="agenda" className="gap-1.5">
                <Calendar className="h-4 w-4" />
                Next Agenda
              </TabsTrigger>
            </TabsList>

            {/* Recap Email Tab */}
            <TabsContent value="email" className="mt-4">
              {data?.follow_up_email ? (
                <div className="space-y-4">
                  {/* Executive Summary */}
                  {data.executive_summary && (
                    <div className="rounded-lg border-l-4 border-primary/50 bg-primary/5 p-4">
                      <p className="text-sm font-medium text-primary mb-1">Executive Summary</p>
                      <p className="text-sm text-foreground">{data.executive_summary}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>Ready-to-send meeting recap</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleCopyEmail}>
                        {copiedEmail ? (
                          <>
                            <Check className="h-4 w-4 mr-1.5 text-green-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1.5" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button size="sm" onClick={handleSendEmail}>
                        <ExternalLink className="h-4 w-4 mr-1.5" />
                        Send Email
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="h-[300px] rounded-lg border bg-muted/20 p-4">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {data.follow_up_email}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/30 p-6 text-center">
                  <Mail className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No recap email generated</p>
                </div>
              )}
            </TabsContent>

            {/* Task Nudges Tab */}
            <TabsContent value="nudges" className="mt-4">
              {data?.task_nudges && data.task_nudges.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Bell className="h-4 w-4" />
                    <span>Suggested reminder messages for task owners</span>
                  </div>

                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3 pr-4">
                      {data.task_nudges.map((nudge, index) => (
                        <div
                          key={index}
                          className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="gap-1">
                                  <User className="h-3 w-3" />
                                  {nudge.recipient}
                                </Badge>
                                <Badge variant="secondary" className="gap-1">
                                  <Clock className="h-3 w-3" />
                                  {nudge.suggested_date}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium text-foreground">{nudge.task}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `Hi ${nudge.recipient},\n\nJust following up on: ${nudge.task}\n\nCould you provide an update when you get a chance?\n\nThanks!`
                                );
                                toast.success("Nudge message copied");
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/30 p-6 text-center">
                  <Bell className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No task nudges needed</p>
                  <p className="text-xs text-muted-foreground">
                    All tasks have clear owners and timelines
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Next Meeting Agenda Tab */}
            <TabsContent value="agenda" className="mt-4">
              {data?.next_meeting_agenda && data.next_meeting_agenda.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ListChecks className="h-4 w-4" />
                      <span>Auto-generated from deferred items & open questions</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleCopyAgenda}>
                      {copiedAgenda ? (
                        <>
                          <Check className="h-4 w-4 mr-1.5 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1.5" />
                          Copy Agenda
                        </>
                      )}
                    </Button>
                  </div>

                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2 pr-4">
                      {data.next_meeting_agenda.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 rounded-lg border bg-card p-3"
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {index + 1}
                          </div>
                          <p className="text-sm text-foreground pt-0.5">{item}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <Separator />

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      {data.next_meeting_agenda.length} agenda items for next meeting
                    </p>
                    <Button variant="secondary" size="sm" className="gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Create Meeting
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/30 p-6 text-center">
                  <Calendar className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No agenda items generated</p>
                  <p className="text-xs text-muted-foreground">
                    All items were resolved in this meeting
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}