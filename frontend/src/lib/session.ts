/**
 * Everything this app keeps in the browser, and the one call that clears it.
 *
 * The storage itself is deliberate, not an oversight. The auth token is what
 * keeps a mother signed in across page loads, and the screening token is her
 * participant identity — lose it mid-questionnaire and her consent record is
 * orphaned while she silently enrols again as a second participant, which
 * would quietly corrupt the pilot's data. So the fix for "I keep having to
 * clear storage to test again" is a reset that takes one click, not dropping
 * the persistence.
 */

/** Documentation of what we store. Kept in one place so it stays honest. */
export const APP_STORAGE_KEYS = [
  'auth_token',                  // session token for a signed-in account
  'auth_user',                   // cached account, including the email address
  'sile_inat_screening_token',   // screening participant identity
  'sile_inat_lang',              // chosen language (i18next detector)
  'anonymous_client_id',         // anonymous id behind forum + chat authorship
  'sile_inat_chat_v1',           // AI companion history, this device only
  'sile_joined_circles',         // optimistic mirror of circle membership
  'rsvped_event_ids',            // event RSVPs
  'event_reminder_emails',       // reminder address entered per event
] as const

/**
 * Forgets every trace of this visitor held in the browser.
 *
 * Clears the whole origin rather than walking APP_STORAGE_KEYS, so a key
 * added later and forgotten here cannot survive a reset. Nothing on the
 * server changes: a withdrawn participant stays withdrawn, and any account
 * still exists to be signed into again.
 */
export function clearAppStorage(): void {
  try {
    localStorage.clear()
  } catch {
    /* private mode or blocked storage — nothing to clear */
  }
  try {
    sessionStorage.clear()
  } catch {
    /* as above */
  }
}
