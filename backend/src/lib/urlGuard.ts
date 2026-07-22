// This endpoint makes the server fetch whatever URL a client sends it —
// the textbook shape of an SSRF vector (someone could point it at
// http://169.254.169.254/... or an internal-only admin panel). This is a
// deliberately simple allow/deny check, not a complete defense; a
// production deployment should also run the scanner in an isolated
// network namespace with egress restricted to the public internet.

const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^169\.254\./, // link-local / cloud metadata
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^::1$/,
  /^\[?::1\]?$/,
];

export function assertScannableUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http:// and https:// URLs can be scanned.");
  }

  if (BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
    throw new Error("Scanning internal or loopback addresses isn't allowed.");
  }

  return parsed;
}
