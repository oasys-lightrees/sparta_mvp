/**
 * Minimal HTTP error used by the service layer to signal a specific status
 * code + client-facing message. Intentionally a single class (not a hierarchy)
 * per DEVELOPMENT_RULES.md ("avoid complex custom exception hierarchy").
 *
 * Routes catch this and convert it to the standard error envelope.
 */
export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
