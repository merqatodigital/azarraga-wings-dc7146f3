const OPENROUTER_KEY_PATTERN = /sk-or-v1-[A-Za-z0-9_-]+/;
const HTTP_HEADER_SAFE = /^[\x21-\x7e]+$/;

export function normalizeOpenRouterApiKey(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // Accept a key pasted from surrounding instructions, but never pass Unicode or
  // whitespace through to an HTTP Authorization header.
  const key = raw.match(OPENROUTER_KEY_PATTERN)?.[0] || raw;
  if (!HTTP_HEADER_SAFE.test(key)) {
    throw new Error(
      "OpenRouter API key contains unsupported characters. Paste only the key beginning sk-or-v1-.",
    );
  }
  return key;
}

export function openRouterAuthorization(value?: string | null) {
  const key = normalizeOpenRouterApiKey(value);
  if (!key) throw new Error("Paste your OpenRouter API key in Agent Settings first");
  return `Bearer ${key}`;
}
