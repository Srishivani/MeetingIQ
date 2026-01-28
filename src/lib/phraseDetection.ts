// Enhanced phrase detection patterns for real-time meeting intelligence
export type MeetingItemType = "deferred" | "action_item" | "decision" | "question" | "risk" | "followup";

export type Priority = "high" | "medium" | "low";

export interface DetectedPhrase {
  type: MeetingItemType;
  content: string;
  triggerPhrase: string;
  context: string;
  timestampMs: number;
  // Enhanced fields
  extractedOwner: string | null;
  extractedDeadline: string | null;
  priority: Priority;
  confidence: number;
}

// Pattern definitions with trigger phrases
const PATTERNS: Array<{
  type: MeetingItemType;
  triggers: RegExp[];
  label: string;
}> = [
  {
    type: "deferred",
    label: "Deferred",
    triggers: [
      // Original patterns
      /\b(table\s+(this|that|it))\b/i,
      /\b(defer\s+(this|that|it)?)\b/i,
      /\b(revisit\s+(this|that|it)?\s*(later)?)\b/i,
      /\b(park\s+(this|that|it))\b/i,
      /\b(put\s+(this|that|it)\s*(on\s*hold|aside))\b/i,
      /\b(come\s+back\s+to\s+(this|that|it))\b/i,
      /\b(table\s+for\s+(future|later|now))\b/i,
      /\b(shelve\s+(this|that|it))\b/i,
      /\b(postpone)\b/i,
      // New enhanced patterns
      /\b(circle\s+back)\b/i,
      /\b(not\s+now)\b/i,
      /\b(another\s+time)\b/i,
      /\b(next\s+meeting)\b/i,
      /\b(backlog\s+(this|that|it))\b/i,
      /\b(hold\s+off)\b/i,
      /\b(put\s+a\s+pin\s+in\s+(this|that|it))\b/i,
      /\b(save\s+(this|that|it)?\s*for\s+later)\b/i,
      /\b(push\s+(this|that|it)?\s*(back|out))\b/i,
      /\b(later\s+discussion)\b/i,
      /\b(offline\s+(this|that|conversation))\b/i,
      /\b(take\s+(this|that|it)\s+offline)\b/i,
      /\b(parking\s+lot)\b/i,
      /\b(add\s+to\s+(the\s+)?parking\s+lot)\b/i,
      /\b(future\s+agenda)\b/i,
      /\b(let('s)?\s+revisit)\b/i,
    ],
  },
  {
    type: "action_item",
    label: "Action Item",
    triggers: [
      // Original patterns
      /\b(we('ll|'re going to| will| should)\s+(look\s+into|follow\s+up|check|investigate|review|handle|take\s+care\s+of))\b/i,
      /\b(i('ll| will)\s+(look\s+into|follow\s+up|check|handle|take\s+care\s+of|send|prepare|draft|set\s+up))\b/i,
      /\b(someone\s+(should|needs\s+to|has\s+to))\b/i,
      /\b(action\s+item)\b/i,
      /\b(let('s|'s)\s+(schedule|set\s+up|arrange))\b/i,
      /\b(need\s+to\s+(do|complete|finish|send|prepare))\b/i,
      /\b(to\s*-?\s*do)\b/i,
      /\b(assign(ed)?\s+to)\b/i,
      /\b(take\s+the\s+lead\s+on)\b/i,
      /\b(responsible\s+for)\b/i,
      /\b((can|could)\s+you\s+(please\s+)?(handle|take\s+care\s+of|check))\b/i,
      // New enhanced patterns
      /\b(make\s+sure\s+to)\b/i,
      /\b(don('t|'t)\s+forget\s+to)\b/i,
      /\b(reach\s+out\s+to)\b/i,
      /\b(get\s+back\s+to\s+\w+)\b/i,
      /\b(send\s+(over|out|along))\b/i,
      /\b(draft\s+a)\b/i,
      /\b(loop\s+in)\b/i,
      /\b(set\s+up\s+a\s+(call|meeting))\b/i,
      /\b(book\s+time\s+with)\b/i,
      /\b(schedule\s+a)\b/i,
      /\b(create\s+a\s+(ticket|task|issue))\b/i,
      /\b(file\s+a\s+(bug|ticket|issue))\b/i,
      /\b(update\s+the\s+(doc|document|wiki|spreadsheet))\b/i,
      /\b(add\s+(this|that|it)\s+to\s+(the\s+)?(backlog|board|list))\b/i,
      /\b(write\s+up)\b/i,
      /\b(prepare\s+(the|a))\b/i,
      /\b(coordinate\s+with)\b/i,
      /\b(sync\s+with)\b/i,
      /\b(touch\s+base\s+with)\b/i,
      /\b(circle\s+up\s+with)\b/i,
      /\b(get\s+(in\s+touch|a\s+hold\s+of))\b/i,
      /\b(ping\s+\w+)\b/i,
      /\b(share\s+(with|the))\b/i,
      /\b(distribute\s+(the|to))\b/i,
      /\b(run\s+(the\s+)?numbers)\b/i,
      /\b(pull\s+(the\s+)?data)\b/i,
      /\b(research\s+(this|that|the))\b/i,
      /\b(investigate\s+(this|that|the))\b/i,
      /\b(\w+\s+(will|can|should)\s+own\s+(this|that))\b/i,
      /\b(take\s+point\s+on)\b/i,
      /\b(drive\s+(this|that|the))\b/i,
      /\b(own\s+(this|that|the))\b/i,
    ],
  },
  {
    type: "decision",
    label: "Decision",
    triggers: [
      // Original patterns
      /\b(let('s| us)\s+go\s+with)\b/i,
      /\b(agreed)\b/i,
      /\b(decision\s+(is|made))\b/i,
      /\b(we('ve|'re)\s+(decided|going\s+with|choosing))\b/i,
      /\b(final\s+(call|decision))\b/i,
      /\b(we('ll| will)\s+(proceed|move\s+forward)\s+with)\b/i,
      /\b(that('s|'s)\s+(the\s+)?plan)\b/i,
      /\b(settled\s+on)\b/i,
      /\b(consensus\s+is)\b/i,
      /\b(approved)\b/i,
      // New enhanced patterns
      /\b(we('re|'re)\s+committing\s+to)\b/i,
      /\b(moving\s+forward\s+with)\b/i,
      /\b(that('s|'s)\s+settled)\b/i,
      /\b(finalized)\b/i,
      /\b(locked\s+in)\b/i,
      /\b(our\s+answer\s+is)\b/i,
      /\b(the\s+verdict\s+is)\b/i,
      /\b(we('re|'re)\s+going\s+(to|with))\b/i,
      /\b(official(ly)?)\b/i,
      /\b(confirmed)\b/i,
      /\b(signing\s+off\s+on)\b/i,
      /\b(green\s+light)\b/i,
      /\b(giving?\s+(the\s+)?green\s+light)\b/i,
      /\b(thumbs\s+up)\b/i,
      /\b(go\s+ahead\s+with)\b/i,
      /\b(blessing\s+to)\b/i,
      /\b(authorize)\b/i,
      /\b(sign\s+off)\b/i,
      /\b(let('s|'s)\s+do\s+(it|that|this))\b/i,
      /\b(that('s|'s)\s+our\s+(decision|call))\b/i,
      /\b(we('ll|'ll)\s+go\s+that\s+route)\b/i,
    ],
  },
  {
    type: "question",
    label: "Open Question",
    triggers: [
      // Original patterns
      /\b(what\s+about)\b/i,
      /\b(how\s+(will|do|can|should)\s+we)\b/i,
      /\b(who\s+(handles|is\s+responsible|will|should))\b/i,
      /\b(when\s+(will|can|should)\s+we)\b/i,
      /\b(do\s+we\s+(know|have))\b/i,
      /\b(is\s+there\s+a\s+(way|plan))\b/i,
      /\b(have\s+we\s+(considered|thought\s+about))\b/i,
      /\b(what('s|'s)\s+the\s+(status|timeline|plan))\b/i,
      /\b(open\s+question)\b/i,
      /\b(still\s+(need\s+to|unclear))\b/i,
      // New enhanced patterns
      /\b(i('m|'m)\s+curious\s+about)\b/i,
      /\b(can\s+someone\s+explain)\b/i,
      /\b(what('s|'s)\s+the\s+blocker)\b/i,
      /\b(any\s+concerns)\b/i,
      /\b(thoughts\s+on)\b/i,
      /\b(does\s+anyone\s+know)\b/i,
      /\b(has\s+anyone\s+(looked\s+into|considered))\b/i,
      /\b(what\s+if)\b/i,
      /\b(any\s+(ideas|suggestions))\b/i,
      /\b(how\s+would\s+(we|you))\b/i,
      /\b(where\s+do\s+we\s+stand)\b/i,
      /\b(what('s|'s)\s+our\s+(approach|strategy))\b/i,
      /\b(do\s+we\s+need)\b/i,
      /\b(should\s+we)\b/i,
      /\b(is\s+(this|that)\s+feasible)\b/i,
      /\b(what\s+are\s+the\s+(options|alternatives))\b/i,
      /\b(can\s+we\s+(do|achieve|handle))\b/i,
      /\b(is\s+(it|that)\s+possible)\b/i,
      /\b(open\s+item)\b/i,
      /\b(outstanding\s+question)\b/i,
      /\b(tbd|TBD)\b/i,
      /\b(to\s+be\s+(determined|decided))\b/i,
      /\b(need\s+(more\s+)?clarity)\b/i,
      /\b(unclear\s+(on|about))\b/i,
    ],
  },
  {
    type: "risk",
    label: "Risk/Concern",
    triggers: [
      /\b(i('m|'m)\s+(worried|concerned)\s+about)\b/i,
      /\b(potential\s+issue)\b/i,
      /\b(red\s+flag)\b/i,
      /\b(be\s+careful\s+with)\b/i,
      /\b(heads\s+up\s+on)\b/i,
      /\b(risk\s+(is|here|of))\b/i,
      /\b(danger\s+(of|zone))\b/i,
      /\b(watch\s+out\s+for)\b/i,
      /\b(might\s+(cause|create)\s+(a\s+)?problem)\b/i,
      /\b(could\s+(be\s+)?problematic)\b/i,
      /\b(blocker)\b/i,
      /\b(blocking\s+issue)\b/i,
      /\b(dependency\s+(on|risk))\b/i,
      /\b(critical\s+(path|dependency))\b/i,
      /\b(single\s+point\s+of\s+failure)\b/i,
      /\b(bottleneck)\b/i,
      /\b(concern\s+(is|here))\b/i,
      /\b(caveat)\b/i,
      /\b(gotcha)\b/i,
      /\b(be\s+aware\s+that)\b/i,
      /\b(keep\s+in\s+mind)\b/i,
      /\b(careful\s+(with|about))\b/i,
      /\b(tricky\s+(part|thing))\b/i,
      /\b(risky)\b/i,
      /\b(uncertain(ty)?)\b/i,
      /\b(unknown)\b/i,
      /\b(we\s+don('t|'t)\s+know)\b/i,
      /\b(gap\s+(in|here))\b/i,
      /\b(missing\s+(piece|info))\b/i,
      /\b(issue\s+(is|here))\b/i,
      /\b(problem\s+(is|with))\b/i,
    ],
  },
  {
    type: "followup",
    label: "Follow-up",
    triggers: [
      /\b(let('s|'s)\s+reconnect\s+on)\b/i,
      /\b(check\s+back\s+next\s+week)\b/i,
      /\b(status\s+update\s+needed)\b/i,
      /\b(follow\s+up\s+(on|with|next))\b/i,
      /\b(check\s+in\s+(on|with|next))\b/i,
      /\b(revisit\s+next)\b/i,
      /\b(sync\s+up\s+(on|about|next))\b/i,
      /\b(touch\s+base\s+again)\b/i,
      /\b(regroup\s+on)\b/i,
      /\b(review\s+(progress|status)\s+(on|next))\b/i,
      /\b(track\s+progress)\b/i,
      /\b(monitor\s+(this|that))\b/i,
      /\b(keep\s+(me|us)\s+(posted|updated))\b/i,
      /\b(let\s+(me|us)\s+know\s+(how|if))\b/i,
      /\b(report\s+back)\b/i,
      /\b(update\s+(me|us|the\s+team))\b/i,
      /\b(bring\s+back\s+to\s+the\s+group)\b/i,
      /\b(share\s+(an\s+)?update)\b/i,
      /\b(weekly\s+check)\b/i,
      /\b(recurring\s+(check|meeting))\b/i,
      /\b(standing\s+agenda\s+item)\b/i,
    ],
  },
];

// Priority detection patterns
const PRIORITY_PATTERNS: Array<{ priority: Priority; patterns: RegExp[] }> = [
  {
    priority: "high",
    patterns: [
      /\b(asap|a\.s\.a\.p\.)\b/i,
      /\b(urgent(ly)?)\b/i,
      /\b(critical(ly)?)\b/i,
      /\b(immediately)\b/i,
      /\b(right\s+away)\b/i,
      /\b(top\s+priority)\b/i,
      /\b(high\s+priority)\b/i,
      /\b(p0|p1)\b/i,
      /\b(blocker)\b/i,
      /\b(blocking)\b/i,
      /\b(by\s+(today|tonight|eod|EOD|end\s+of\s+day))\b/i,
      /\b(before\s+(the\s+)?deadline)\b/i,
      /\b(time\s+sensitive)\b/i,
      /\b(mission\s+critical)\b/i,
      /\b(must\s+have)\b/i,
      /\b(showstopper)\b/i,
      /\b(drop\s+everything)\b/i,
    ],
  },
  {
    priority: "low",
    patterns: [
      /\b(when\s+you\s+(get\s+a\s+chance|can|have\s+time))\b/i,
      /\b(no\s+rush)\b/i,
      /\b(low\s+priority)\b/i,
      /\b(nice\s+to\s+have)\b/i,
      /\b(if\s+(you\s+)?have\s+time)\b/i,
      /\b(eventually)\b/i,
      /\b(p3|p4)\b/i,
      /\b(backlog)\b/i,
      /\b(whenever)\b/i,
      /\b(not\s+urgent)\b/i,
      /\b(can\s+wait)\b/i,
    ],
  },
];

// Common name patterns (simplified - just looks for capitalized words before/after triggers)
const NAME_PATTERN = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;

// Deadline patterns
const DEADLINE_PATTERNS: RegExp[] = [
  /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\bby\s+(tomorrow|today|tonight)\b/i,
  /\bby\s+(next\s+week|end\s+of\s+week|eow|EOW)\b/i,
  /\bby\s+(end\s+of\s+day|eod|EOD)\b/i,
  /\bby\s+(end\s+of\s+month|eom|EOM)\b/i,
  /\bby\s+(\d{1,2}\/\d{1,2})\b/i,
  /\bby\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}\b/i,
  /\bwithin\s+(\d+\s+(days?|weeks?|hours?))\b/i,
  /\bin\s+(\d+\s+(days?|weeks?))\b/i,
  /\b(this\s+week)\b/i,
  /\b(next\s+week)\b/i,
  /\b(this\s+month)\b/i,
  /\b(next\s+month)\b/i,
];

// Extract context around a match (surrounding words)
function extractContext(text: string, matchIndex: number, matchLength: number, contextWords = 8): string {
  const before = text.slice(0, matchIndex);
  const after = text.slice(matchIndex + matchLength);
  
  const beforeWords = before.trim().split(/\s+/).slice(-contextWords);
  const afterWords = after.trim().split(/\s+/).slice(0, contextWords);
  const matchText = text.slice(matchIndex, matchIndex + matchLength);
  
  return [...beforeWords, matchText, ...afterWords].join(" ");
}

// Extract potential owner from text
function extractOwner(text: string, matchIndex: number): string | null {
  // Look for names in the vicinity of the match (before and after)
  const searchRadius = 50;
  const start = Math.max(0, matchIndex - searchRadius);
  const end = Math.min(text.length, matchIndex + searchRadius);
  const vicinity = text.slice(start, end);
  
  const names = vicinity.match(NAME_PATTERN);
  if (names && names.length > 0) {
    // Filter out common non-name capitalized words
    const excluded = new Set(["I", "We", "The", "This", "That", "What", "When", "Where", "Why", "How", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);
    const filtered = names.filter((n) => !excluded.has(n));
    return filtered[0] || null;
  }
  return null;
}

// Extract deadline from text
function extractDeadline(text: string): string | null {
  for (const pattern of DEADLINE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return null;
}

// Detect priority from text
function detectPriority(text: string): Priority {
  for (const { priority, patterns } of PRIORITY_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return priority;
      }
    }
  }
  return "medium";
}

// Detect phrases in text
export function detectPhrases(text: string, timestampMs: number): DetectedPhrase[] {
  const detected: DetectedPhrase[] = [];
  
  for (const pattern of PATTERNS) {
    for (const trigger of pattern.triggers) {
      const match = text.match(trigger);
      if (match && match.index !== undefined) {
        const triggerPhrase = match[0];
        const content = extractContext(text, match.index, triggerPhrase.length);
        const extractedOwner = extractOwner(text, match.index);
        const extractedDeadline = extractDeadline(text);
        const priority = detectPriority(text);
        
        detected.push({
          type: pattern.type,
          content,
          triggerPhrase,
          context: text,
          timestampMs,
          extractedOwner,
          extractedDeadline,
          priority,
          confidence: 0.75, // Base confidence for regex detection
        });
        break; // Only one match per pattern type per text segment
      }
    }
  }
  
  return detected;
}

// Get label for item type
export function getItemTypeLabel(type: MeetingItemType): string {
  const pattern = PATTERNS.find((p) => p.type === type);
  return pattern?.label ?? type;
}

// Colors for each type (Tailwind classes)
export function getItemTypeColor(type: MeetingItemType): string {
  switch (type) {
    case "deferred":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "action_item":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "decision":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "question":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "risk":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "followup":
      return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200";
  }
}

// Icon names for each type (Lucide icon names)
export function getItemTypeIcon(type: MeetingItemType): string {
  switch (type) {
    case "deferred":
      return "Clock";
    case "action_item":
      return "CheckSquare";
    case "decision":
      return "Gavel";
    case "question":
      return "HelpCircle";
    case "risk":
      return "AlertTriangle";
    case "followup":
      return "RefreshCw";
  }
}

// Priority colors
export function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "medium":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "low":
      return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
  }
}

// Priority labels
export function getPriorityLabel(priority: Priority): string {
  switch (priority) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
  }
}
