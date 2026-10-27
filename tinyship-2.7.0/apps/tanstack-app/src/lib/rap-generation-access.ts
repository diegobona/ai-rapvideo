// UI continuation only. Generation and credit ownership remain server-validated.
const intentKey = 'ai-rapvideo:generate-after-signin'
const dismissedPrefix = 'ai-rapvideo:preview-dismissed:'

export function rememberRapAccessIntent() {
  try { sessionStorage.setItem(intentKey, String(Date.now())) } catch { /* In-page continuation still works. */ }
}

export function hasRapAccessIntent() {
  try {
    const time = Number(sessionStorage.getItem(intentKey))
    return time > 0 && time <= Date.now() && Date.now() - time < 10 * 60 * 1000
  } catch { return false }
}

export function forgetRapAccessIntent() {
  try { sessionStorage.removeItem(intentKey) } catch { /* Optional continuation. */ }
}

export function dismissRapPreview(owner: string) {
  try { localStorage.setItem(dismissedPrefix + owner, String(Date.now())) } catch { /* Current page still hides the preview. */ }
}

export function wasRapPreviewDismissed(owner: string) {
  try {
    const key = dismissedPrefix + owner
    const time = Number(localStorage.getItem(key))
    if (time > 0 && time <= Date.now() && Date.now() - time < 24 * 60 * 60 * 1000) return true
    localStorage.removeItem(key)
  } catch { /* Optional display preference, never an entitlement. */ }
  return false
}
