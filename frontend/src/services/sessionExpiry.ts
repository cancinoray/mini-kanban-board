/**
 * How the HTTP layer reports that the session is gone.
 *
 * A 401 on a call that only happens *while signed in* means the backend no
 * longer recognises us: the cookie expired, or the server forgot the session.
 * The client that sees it is in no position to change app state, so it just
 * announces the fact here, and `App` decides what it means.
 */
type SessionExpiredListener = () => void

let listener: SessionExpiredListener | null = null

/** Subscribes to session expiries; call the returned function to unsubscribe. */
export function onSessionExpired(next: SessionExpiredListener): () => void {
  listener = next
  return () => {
    if (listener === next) listener = null
  }
}

/** Announces that the backend dropped the session. */
export function notifySessionExpired(): void {
  listener?.()
}
