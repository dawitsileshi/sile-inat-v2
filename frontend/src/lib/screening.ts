/**
 * frontend/src/lib/screening.ts — Screening consent client
 *
 * The screening credential is deliberately NOT the anonymous client id used by
 * the forum and circles. Keying screening off that id would make her screening
 * record and her forum posts the same identity. The server mints a separate
 * opaque token; this module is the only place that stores or sends it.
 *
 * Nothing here decides whether she may be screened. The server does that on
 * every request. This module's job is to show the right screen.
 */

import { API_URL, parseResponse } from './api'
import type { SupportedLang } from './i18n'

const TOKEN_KEY = 'sile_inat_screening_token'
export const SCREENING_TOKEN_HEADER = 'X-Screening-Token'

/** Consent text as served by the API. No consent wording is hardcoded here. */
export interface ConsentSection {
  id: string
  heading: string
  body: string
}

export interface ConsentBundle {
  title: string
  intro: string
  sections: ConsentSection[]
  checkbox_label: string
  agree_label: string
  decline_label: string
  checkbox_required_message: string
  decline: {
    title: string
    body: string
    primary_label: string
    secondary_label: string
  }
  withdraw: {
    trigger_label: string
    title: string
    body: string
    confirm_label: string
    cancel_label: string
    confirmed_title: string
    confirmed_body: string
  }
}

export interface ConsentContentResponse {
  consent_version: string
  language: SupportedLang
  content_version_id: number
  checksum: string
  review_required: boolean
  content: ConsentBundle
}

export type ConsentStatus = 'none' | 'accepted' | 'declined' | 'withdrawn'

export interface ConsentState {
  status: ConsentStatus
  can_screen: boolean
  consent_version: string | null
  language: string | null
  recorded_at?: string
  withdrawn_at?: string | null
}

export function getScreeningToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

function setScreeningToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearScreeningToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

function headers(extra: HeadersInit = {}): HeadersInit {
  const token = getScreeningToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { [SCREENING_TOKEN_HEADER]: token } : {}),
    ...extra,
  }
}

/**
 * Fetches the consent text for one language.
 *
 * There is no fallback. A 409 means we have no consent text in that language,
 * and the caller must offer the languages we do have rather than quietly
 * showing her another one.
 */
export async function fetchConsentContent(
  language: SupportedLang,
): Promise<ConsentContentResponse> {
  const res = await fetch(`${API_URL}/screening/consent/content?language=${language}`)
  return parseResponse<ConsentContentResponse>(res)
}

/**
 * Ensures this browser has a participant token, minting one if needed.
 *
 * Called lazily, at the moment she makes a decision, rather than when she opens
 * the page. Reading the consent text should not enrol anyone — otherwise every
 * mother who merely looked would appear in the pilot as a participant who
 * never answered.
 */
export async function ensureScreeningToken(language: SupportedLang): Promise<string> {
  const existing = getScreeningToken()
  if (existing) return existing

  const res = await fetch(`${API_URL}/screening/participants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language }),
  })
  const data = await parseResponse<{ screening_token: string }>(res)
  setScreeningToken(data.screening_token)
  return data.screening_token
}

export async function submitConsent(opts: {
  decision: 'accepted' | 'declined'
  language: SupportedLang
  agreed: boolean
  consentVersion: string
}): Promise<{ consent: ConsentState; next: 'stage1' | 'declined' }> {
  await ensureScreeningToken(opts.language)
  const res = await fetch(`${API_URL}/screening/consent`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      decision: opts.decision,
      language: opts.language,
      agreed: opts.agreed,
      consent_version: opts.consentVersion,
    }),
  })
  return parseResponse(res)
}

/** Current state for this browser, or null if this browser has no token yet. */
export async function fetchConsentState(): Promise<ConsentState | null> {
  if (!getScreeningToken()) return null
  const res = await fetch(`${API_URL}/screening/status`, { headers: headers() })
  if (res.status === 401) {
    // Token unknown to this server (wiped database, or a stale token from
    // another environment). Drop it and start clean rather than dead-ending.
    clearScreeningToken()
    return null
  }
  const data = await parseResponse<{ consent: ConsentState }>(res)
  return data.consent
}

export async function withdrawConsent(reason?: string): Promise<ConsentState> {
  const res = await fetch(`${API_URL}/screening/consent/withdraw`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ reason: reason ?? null }),
  })
  const data = await parseResponse<{ consent: ConsentState }>(res)
  return data.consent
}

/* ── Instruments (Stage 1 and Stage 2 share every shape) ──────────────────── */

export interface InstrumentOption {
  value: number
  label: string
}

export interface InstrumentItem {
  code: string
  index: number
  text: string
  is_safety_item?: boolean
  options: InstrumentOption[]
}

export interface SafetyResponseCopy {
  title: string
  body: string
  action_label: string
}

export interface InstrumentStart {
  session_uid: string
  screening_version: string
  language: SupportedLang
  checksum: string
  review_required: boolean
  content: {
    title: string
    intro: string
    instruction: string
    continue_label: string
    back_label: string
    /** Source citation a validated instrument must display, when it has one. */
    attribution?: string | null
    items: InstrumentItem[]
  }
  progress: {
    session_uid: string
    status: string
    answers: Record<string, number>
    item_count: number
  }
}

export interface InstrumentAnswerResult {
  recorded: boolean
  item_code: string
  safety_triggered: boolean
  progress: InstrumentStart['progress']
  safety_response?: SafetyResponseCopy
}

export interface InstrumentResult {
  session_uid: string
  stage: 1 | 2
  status: string
  total_score: number
  /** Assigned by the server from the bundle's bands. Never computed here. */
  band: string
  /** Stage 1 alias for `band`; null on a Stage 2 result. */
  tier: 'green' | 'amber' | 'orange' | null
  /** Stage 2 alias for `band`; null on a Stage 1 result. */
  epds_status: string | null
  next: 'end' | 'stage2'
  by_safety_override: boolean
  safety_triggered: boolean
  result: { title: string; body: string } | null
  safety_response: SafetyResponseCopy | null
  screening_version: string
  language: string
}

/** Opens or resumes a Stage 1 session. 409 means no published content. */
export async function startStage1(language: SupportedLang): Promise<InstrumentStart> {
  const res = await fetch(`${API_URL}/screening/stage1?language=${language}`, {
    headers: headers(),
  })
  return parseResponse<InstrumentStart>(res)
}

/**
 * Records one answer, immediately.
 *
 * Deliberately not batched. If she closes the tab after disclosing self-harm,
 * that disclosure is already on the server.
 */
export async function answerStage1(
  itemCode: string,
  value: number,
): Promise<InstrumentAnswerResult> {
  const res = await fetch(`${API_URL}/screening/stage1/answer`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ item_code: itemCode, value }),
  })
  return parseResponse<InstrumentAnswerResult>(res)
}

/** Asks the server to score and tier the session. The client never scores. */
export async function completeStage1(): Promise<InstrumentResult> {
  const res = await fetch(`${API_URL}/screening/stage1/complete`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({}),
  })
  return parseResponse<InstrumentResult>(res)
}

/* ── Stage 2 (EPDS) ───────────────────────────────────────────────────────── */

/**
 * Stage 2 start. `completed: true` means she already finished the EPDS for
 * this Stage 1, and the server returned that result rather than starting the
 * same ten questions over.
 */
export type Stage2Start =
  | ({ completed: false; preceded_by: string } & InstrumentStart)
  | { completed: true; result: InstrumentResult }

/**
 * Opens or resumes Stage 2.
 *
 * Throws on 409 with one of two codes the caller should distinguish:
 *   stage1_required      — Stage 1 is not finished
 *   stage2_not_indicated — Stage 1 finished and did not indicate Stage 2
 */
export async function startStage2(language: SupportedLang): Promise<Stage2Start> {
  const res = await fetch(`${API_URL}/screening/stage2?language=${language}`, {
    headers: headers(),
  })
  return parseResponse<Stage2Start>(res)
}

export async function answerStage2(
  itemCode: string,
  value: number,
): Promise<InstrumentAnswerResult> {
  const res = await fetch(`${API_URL}/screening/stage2/answer`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ item_code: itemCode, value }),
  })
  return parseResponse<InstrumentAnswerResult>(res)
}

export async function completeStage2(): Promise<InstrumentResult> {
  const res = await fetch(`${API_URL}/screening/stage2/complete`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({}),
  })
  return parseResponse<InstrumentResult>(res)
}
