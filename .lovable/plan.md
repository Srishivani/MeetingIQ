
# Enhanced Real-Time Meeting Intelligence System

## Overview

This plan transforms the meeting recording experience into an intelligent, real-time meeting assistant that actively listens for key phrases, categorizes them instantly, and provides "top-tier" AI-enhanced feedback for meeting minutes - all during the live session.

---

## Current State

The system already has:
- Real-time transcription via ElevenLabs Scribe (`useRealtimeTranscription.ts`)
- Basic phrase detection patterns (`phraseDetection.ts`) for 4 categories:
  - **Deferred** - "table this", "revisit later", "postpone"
  - **Action Items** - "we'll look into", "I'll follow up", "assigned to"
  - **Decisions** - "let's go with", "agreed", "final decision"
  - **Questions** - "what about", "how will we", "open question"
- Live detection panel (`LiveMeetingPanel.tsx`) showing items during recording
- Post-meeting AI summarization (`summarize/index.ts`)

---

## Proposed Enhancements

### 1. Expanded Phrase Detection Library

Add 50+ new trigger phrases covering natural business speech patterns:

| Category | New Phrases |
|----------|-------------|
| **Deferred** | "circle back", "not now", "another time", "next meeting", "backlog this", "hold off", "put a pin in it", "save for later" |
| **Action Items** | "make sure to", "don't forget to", "reach out to", "get back to [name]", "send over", "draft a", "loop in", "set up a call", "book time with" |
| **Decisions** | "we're committing to", "moving forward with", "that's settled", "finalized", "locked in", "our answer is", "the verdict is" |
| **Questions** | "I'm curious about", "can someone explain", "what's the blocker", "any concerns", "thoughts on", "does anyone know" |
| **NEW: Risks/Concerns** | "I'm worried about", "potential issue", "red flag", "be careful with", "heads up on" |
| **NEW: Follow-ups** | "let's reconnect on", "check back next week", "status update needed" |

### 2. Real-Time AI Enhancement (During Recording)

Create a lightweight AI enrichment pipeline that runs in real-time:

```text
+------------------+     +-------------------+     +------------------+
| Phrase Detected  | --> | Debounce (2 sec)  | --> | AI Enrich Call   |
| "we'll look into |     | Batch similar     |     | (Gemini Flash)   |
|  the vendor API" |     | detections        |     |                  |
+------------------+     +-------------------+     +------------------+
                                                          |
                                                          v
                                              +------------------------+
                                              | Enhanced Item:         |
                                              | - Clear task title     |
                                              | - Extracted owner      |
                                              | - Suggested deadline   |
                                              | - Priority level       |
                                              +------------------------+
```

- **New Edge Function**: `enhance-item` - Takes raw detected phrase + context, returns structured enhancement
- **Runs in background** while recording continues
- **Updates UI** with sparkle indicator when AI enhancement completes

### 3. Enhanced Live Detection UI

Redesign the `LiveMeetingPanel` with:

- **Category Tabs** - Quick filter by type (All | Actions | Decisions | Questions | Deferred)
- **Priority Indicators** - High/Medium/Low based on urgency keywords
- **Owner Extraction** - Auto-detect names mentioned before/after trigger phrase
- **Suggested Due Dates** - Parse phrases like "by Friday", "end of week", "ASAP"
- **Audio Waveform Preview** - Visual indicator of when each item was detected
- **Quick Edit** - Inline editing to refine detected content before saving
- **Dismiss/Confirm** - Swipe or click to confirm accuracy or dismiss false positives

### 4. Audio Feedback & Notifications

Optional audio/visual cues when items are detected:

- Subtle chime sound when an action item is detected
- Screen flash for high-priority items
- Badge counter on tablet corner showing running totals

### 5. Post-Meeting Intelligence Report

Enhance the final summary with "top-tier" meeting minutes:

- **Executive Summary** - 2-3 sentence overview
- **Categorized Items** - Organized by type with full context
- **Ownership Matrix** - Who owns what action items
- **Risk Register** - Extracted concerns/blockers
- **Timeline Recommendations** - Suggested follow-up dates
- **Next Meeting Agenda** - Auto-generated from deferred items + open questions

---

## Implementation Steps

### Phase 1: Enhanced Phrase Detection

**File: `src/lib/phraseDetection.ts`**
- Add new `risk` and `followup` categories
- Expand trigger patterns to 100+ phrases
- Add priority detection (ASAP, urgent, by EOD, etc.)
- Add name extraction patterns (before/after trigger)
- Add date/deadline extraction patterns

### Phase 2: Real-Time AI Enhancement

**File: `supabase/functions/enhance-item/index.ts`** (New)
- Accept: raw phrase, context, timestamp
- Call Lovable AI Gateway (Gemini Flash for speed)
- Return: structured enhancement (title, owner, priority, deadline)

**File: `src/hooks/useRealtimeEnhancement.ts`** (New)
- Debounce detected phrases (2-3 second window)
- Call enhance-item edge function
- Update item in state with AI enhancement
- Handle optimistic updates

### Phase 3: Enhanced Live UI

**File: `src/components/conversations/LiveMeetingPanel.tsx`**
- Add tabbed filtering by category
- Add priority badges and owner display
- Add quick inline edit capability
- Add confirm/dismiss actions
- Add empty state with example phrases

**File: `src/components/instant/InstantRecorder.tsx`**
- Integrate enhanced panel
- Show AI enhancement in progress indicator
- Add optional audio notification toggle

### Phase 4: Database Schema Update

**Migration: Add columns to `meeting_items` table**
- `priority` (text: high/medium/low)
- `due_date` (timestamp, nullable)
- `status` (text: pending/confirmed/dismissed)
- `raw_phrase` (text) - original detected text before enhancement

### Phase 5: Enhanced Summary Generation

**File: `supabase/functions/summarize/index.ts`**
- Generate executive summary
- Create ownership matrix
- Extract risk register
- Generate suggested follow-up timeline
- Auto-create next meeting agenda from deferred items

---

## Technical Details

### New Edge Function: `enhance-item`

```typescript
// Request
{
  phrase: "we'll look into the vendor API integration",
  context: "John mentioned we'll look into the vendor API integration before the launch",
  timestampMs: 45000,
  conversationId: "uuid"
}

// Response
{
  enhancedContent: "Research vendor API integration options",
  owner: "John",
  priority: "high",
  suggestedDueDate: null,
  confidence: 0.85
}
```

### Updated Phrase Detection Schema

```typescript
interface DetectedPhrase {
  type: MeetingItemType;
  content: string;
  triggerPhrase: string;
  context: string;
  timestampMs: number;
  // New fields:
  extractedOwner: string | null;
  extractedDeadline: string | null;
  priority: "high" | "medium" | "low";
  confidence: number;
}
```

### Real-Time Enhancement Flow

1. User speaks: "Sarah, can you follow up with the vendor by Friday?"
2. Phrase detection triggers on "follow up"
3. System extracts: Owner="Sarah", Deadline="Friday", Priority=Medium
4. Optional AI enhancement call for richer context
5. UI updates instantly with structured item
6. User can confirm, edit, or dismiss

---

## Summary

This enhancement transforms the meeting recorder from a passive transcription tool into an active meeting assistant that:

- Detects 100+ business phrases in real-time
- Auto-extracts owners, deadlines, and priorities
- Provides optional AI enhancement for clearer task descriptions
- Generates top-tier meeting minutes with executive summaries
- Creates automatic follow-up agendas from deferred items

The tablet-in-meeting experience will feel like having a dedicated scribe who understands business context and can organize everything automatically.
