

# Plan: Replace Manual Email Input with Participant Selection Dropdown

## Summary
Replace the text input field in the task nudge email dialog with a dropdown selector that lets you pick from existing meeting participants' emails instead of typing manually.

## What Changes

### Current Behavior
When sending a task nudge email for an assignee without a matched email, you see a text input where you must type an email address manually.

### New Behavior
Instead of typing, you'll see a dropdown showing all participants who have email addresses. Select one and the email will be auto-filled.

## Implementation Details

### File: `src/components/conversations/FollowUpAutomation.tsx`

**1. Add Select component imports**
- Import `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from the UI components

**2. Update the email dialog "To" field**
- Replace the manual `Input` field (lines 631-641) with a `Select` dropdown
- Populate options from `participants` array (those with valid emails)
- Show participant name and email in each option for easy identification
- When a participant is selected, set `emailRecipient` to their email address

**3. Handle edge cases**
- If no participants have emails, show a message directing users to add emails in the Participants panel
- Keep the current "from meeting" display when an email was auto-matched successfully

### Visual Layout
```
┌─────────────────────────────────────────────────┐
│ To                                              │
│ ┌─────────────────────────────────────────────┐ │
│ │ Select a participant...              ▼      │ │
│ └─────────────────────────────────────────────┘ │
│   ┌───────────────────────────────────────────┐ │
│   │ John Smith (john@example.com)             │ │
│   │ Jane Doe (jane@example.com)               │ │
│   │ Mike Wilson (mike@example.com)            │ │
│   └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Technical Notes

- Uses existing `participants` prop already passed to `FollowUpAutomation`
- Filters to only show participants with valid email addresses
- The `Select` component from Radix UI is already available in the project
- No database changes required
- No new dependencies needed

