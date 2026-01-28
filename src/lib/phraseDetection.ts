// Phrase detection patterns for real-time meeting intelligence
export type MeetingItemType = "deferred" | "action_item" | "decision" | "question";

export interface DetectedPhrase {
  type: MeetingItemType;
  content: string;
  triggerPhrase: string;
  context: string;
  timestampMs: number;
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
      /\b(table\s+(this|that|it))\b/i,
      /\b(defer\s+(this|that|it)?)\b/i,
      /\b(revisit\s+(this|that|it)?\s*(later)?)\b/i,
      /\b(park\s+(this|that|it))\b/i,
      /\b(put\s+(this|that|it)\s*(on\s*hold|aside))\b/i,
      /\b(come\s+back\s+to\s+(this|that|it))\b/i,
      /\b(table\s+for\s+(future|later|now))\b/i,
      /\b(shelve\s+(this|that|it))\b/i,
      /\b(postpone)\b/i,
    ],
  },
  {
    type: "action_item",
    label: "Action Item",
    triggers: [
      /\b(we('ll|'re going to| will| should)\s+(look\s+into|follow\s+up|check|investigate|review|handle|take\s+care\s+of))\b/i,
      /\b(i('ll| will)\s+(look\s+into|follow\s+up|check|handle|take\s+care\s+of))\b/i,
      /\b(someone\s+(should|needs\s+to|has\s+to))\b/i,
      /\b(action\s+item)\b/i,
      /\b(let('s|'s)\s+(schedule|set\s+up|arrange))\b/i,
      /\b(need\s+to\s+(do|complete|finish|send|prepare))\b/i,
      /\b(to\s*-?\s*do)\b/i,
      /\b(assign(ed)?\s+to)\b/i,
      /\b(take\s+the\s+lead\s+on)\b/i,
      /\b(responsible\s+for)\b/i,
      /\b((can|could)\s+you\s+(please\s+)?(handle|take\s+care\s+of|check))\b/i,
    ],
  },
  {
    type: "decision",
    label: "Decision",
    triggers: [
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
    ],
  },
  {
    type: "question",
    label: "Open Question",
    triggers: [
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
    ],
  },
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

// Detect phrases in text
export function detectPhrases(text: string, timestampMs: number): DetectedPhrase[] {
  const detected: DetectedPhrase[] = [];
  
  for (const pattern of PATTERNS) {
    for (const trigger of pattern.triggers) {
      const match = text.match(trigger);
      if (match && match.index !== undefined) {
        const triggerPhrase = match[0];
        const context = extractContext(text, match.index, triggerPhrase.length);
        
        detected.push({
          type: pattern.type,
          content: context,
          triggerPhrase,
          context: text,
          timestampMs,
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
  }
}
