import OpenAI from 'openai';
import type { ParsedEmail } from '@/lib/gmail';

const SUMMARY_SECTIONS = `## Overview
## Key Threads
## Action Items
## Newsletters / Noise`;

const EMPTY_SUMMARY = `# Daily Email Summary

## Overview

No emails received today.

## Key Threads

_None._

## Action Items

_None._

## Newsletters / Noise

_None._`;

function formatEmailsForPrompt(emails: ParsedEmail[]): string {
  return emails
    .map(
      (email, index) =>
        `[${index + 1}]
From: ${email.from}
Subject: ${email.subject}
Date: ${email.date}
Snippet: ${email.snippet}
Preview: ${email.bodyPreview}`,
    )
    .join('\n\n');
}

export async function summarizeEmails(emails: ParsedEmail[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (emails.length === 0) {
    return EMPTY_SUMMARY;
  }

  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content: `You summarize a user's daily inbox into structured markdown.
Use exactly these sections in this order:
${SUMMARY_SECTIONS}

Guidelines:
- Overview: 2-3 sentences on the day's email themes.
- Key Threads: bullet list of important conversations; include sender and subject when helpful.
- Action Items: checkbox list (- [ ] item) for replies, deadlines, or follow-ups.
- Newsletters / Noise: bullet list of promos, newsletters, and low-priority mail; group similar senders.
Be concise and factual. Do not invent emails or tasks not supported by the input.`,
      },
      {
        role: 'user',
        content: `Summarize these ${emails.length} emails from today:\n\n${formatEmailsForPrompt(emails)}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('OpenAI returned an empty summary');
  }

  return content;
}
