
# Plan: Enhance Dashboard Recording with Real-Time Transcription

## Overview
Upgrade the "Record Meeting" dialog on the dashboard to match the landing page's instant recorder experience, featuring ElevenLabs real-time transcription and a live transcript panel.

## Current Situation
| Feature | Landing Page (InstantRecorder) | Dashboard (ConversationRecorder) |
|---------|-------------------------------|----------------------------------|
| Transcription Engine | ElevenLabs Scribe (via `useRealtimeTranscription`) | Browser Web Speech API |
| Live Transcript Panel | Yes - scrollable with partial text | No |
| UI Style | Large centered buttons, modern card | Traditional form layout |
| Naming Dialog | Yes - after recording stops | No - auto-generates title |

## Implementation Steps

### Step 1: Update ConversationRecorder to Use ElevenLabs Transcription
Replace the Web Speech API hook with the existing `useRealtimeTranscription` hook that powers the landing page.

**Changes to `src/components/conversations/ConversationRecorder.tsx`:**
- Remove the `useSpeechRecognition` hook (lines 48-134)
- Import and use `useRealtimeTranscription` from `@/hooks/useRealtimeTranscription`
- Start both recording and transcription together (like InstantRecorder does)
- Stop both when the user stops recording

### Step 2: Add Live Transcript Panel
Add the same live transcript display panel that shows real-time transcription during recording.

**Add to ConversationRecorder:**
- Display a scrollable transcript area showing committed transcripts and partial text
- Show a "Transcribing" status indicator when connected
- Include the pulsing green dot for active transcription

### Step 3: Update Recording Controls UI
Modernize the recording controls to match the landing page experience.

**UI Improvements:**
- Add visual transcription status badge alongside recording status
- Show transcript preview in the save dialog (before processing)
- Display detected item counts in the save confirmation

### Step 4: Add Post-Recording Title Dialog
Add the same naming dialog that appears after recording stops.

**Features:**
- Auto-generated meeting title with timestamp
- Editable title input
- Preview of transcript and detected items
- Save & Process or Discard options

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `src/components/conversations/ConversationRecorder.tsx` | Replace Web Speech API with ElevenLabs, add transcript panel, add naming dialog |

### Key Code Changes

```text
1. Remove useSpeechRecognition hook (local Web Speech API implementation)
2. Import useRealtimeTranscription hook
3. Add state for naming dialog (showNameDialog, meetingTitle, pendingBlob)
4. Create handleStart() that calls both startRecording() and startTranscription()
5. Create handleStop() that calls both stopRecording() and stopTranscription()
6. Add Live Transcript panel (Card with ScrollArea showing transcripts)
7. Add Dialog for naming the meeting before processing
```

### Component Structure After Changes

```text
ConversationRecorder
+-- Recording Card (existing, updated controls)
|   +-- Status Badge with Transcription Indicator
|   +-- Recording Duration Timer
|   +-- Control Buttons (Start/Pause/Stop)
|
+-- Live Transcript Panel (NEW)
|   +-- Connection Status Indicator
|   +-- ScrollArea with transcript text
|   +-- Partial text (italic, in progress)
|
+-- Live Detection Panel (existing)
|
+-- Naming Dialog (NEW)
    +-- Title Input
    +-- Transcript Preview
    +-- Detected Items Summary
    +-- Save/Discard Buttons
```

## Benefits
- Consistent experience across dashboard and landing page
- More reliable transcription with ElevenLabs vs browser Web Speech API
- Users can see what's being transcribed in real-time
- Ability to name meetings before processing
- Preview of detected items before saving

## Dependencies
- Uses existing `useRealtimeTranscription` hook (no new dependencies)
- Requires the `scribe-token` edge function (already deployed)
- Uses existing `LiveMeetingPanel` component (no changes needed)
