/**
 * fetch avec délai maximal : sur une connexion instable, une requête Supabase
 * échoue proprement au lieu de rester bloquée indéfiniment.
 */
export function fetchWithTimeout(ms: number): typeof fetch {
  return (input, init) => {
    const timeout = AbortSignal.timeout(ms);
    const signal = init?.signal && typeof AbortSignal.any === "function" ? AbortSignal.any([init.signal, timeout]) : (init?.signal ?? timeout);
    return fetch(input, { ...init, signal });
  };
}

/** Message lisible pour une erreur réseau (délai dépassé, connexion coupée…). */
export function isNetworkError(message: string): boolean {
  return /fetch failed|timeout|timed out|aborted|ECONN|ENOTFOUND|EAI_AGAIN|network|socket/i.test(message);
}
