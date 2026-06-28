import { google, gmail_v1 } from 'googleapis';
import { createOAuth2Client } from './google-auth';

export interface ParsedEmail {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  bodyPreview: string;
}

type MessagePart = gmail_v1.Schema$MessagePart;

function getTodayQuery(): string {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const afterSeconds = Math.floor(startOfDay.getTime() / 1000);
  return `after:${afterSeconds}`;
}

function createGmailClient(accessToken: string) {
  const client = createOAuth2Client({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth: client });
}

export async function listTodayEmails(accessToken: string): Promise<string[]> {
  const gmail = createGmailClient(accessToken);
  const messageIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: getTodayQuery(),
      maxResults: 100,
      pageToken,
    });

    for (const message of response.data.messages ?? []) {
      if (message.id) {
        messageIds.push(message.id);
      }
    }

    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return messageIds;
}

export async function getEmailDetails(
  accessToken: string,
  messageId: string,
): Promise<ParsedEmail> {
  const gmail = createGmailClient(accessToken);
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  return parseEmail(response.data);
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf-8');
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractBodyPreview(payload?: MessagePart | null): string {
  if (!payload) {
    return '';
  }

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data).trim().slice(0, 500);
  }

  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return stripHtml(decodeBase64Url(payload.body.data)).slice(0, 500);
  }

  for (const part of payload.parts ?? []) {
    const preview = extractBodyPreview(part);
    if (preview) {
      return preview;
    }
  }

  if (payload.body?.data) {
    const raw = decodeBase64Url(payload.body.data);
    return (payload.mimeType?.includes('html') ? stripHtml(raw) : raw)
      .trim()
      .slice(0, 500);
  }

  return '';
}

export function parseEmail(message: gmail_v1.Schema$Message): ParsedEmail {
  const headers = message.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())
      ?.value ?? '';

  const date = message.internalDate
    ? new Date(Number(message.internalDate)).toISOString()
    : getHeader('Date') || new Date().toISOString();

  return {
    id: message.id ?? '',
    subject: getHeader('Subject'),
    from: getHeader('From'),
    snippet: message.snippet ?? '',
    date,
    bodyPreview: extractBodyPreview(message.payload),
  };
}
