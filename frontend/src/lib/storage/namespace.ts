/**
 * Every localStorage key this app writes is prefixed with this. Derive keys
 * from it rather than writing the literal, so a port changes one line — see
 * AI103-Game-Spec.md §15.1. The one unavoidable exception is the FOUC-free
 * theme script inlined in index.html, which runs before any bundle parses.
 */
export const NAMESPACE = 'ai103game';
export const SCHEMA_VERSION = 1 as const;
export const STATE_KEY = `${NAMESPACE}.v1.state` as const;
export const PROBE_KEY = `${NAMESPACE}.probe` as const;
