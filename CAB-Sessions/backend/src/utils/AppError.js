/**
 * Operational error with an HTTP status. Throwing AppError anywhere in a
 * service/controller lets the central error handler translate it into a clean
 * JSON response — no leaking stack traces to clients (security).
 */
export class AppError extends Error {
  /**
   * @param {number} status  HTTP status code
   * @param {string} message Safe, user-facing message
   * @param {object} [details] Optional structured detail (e.g. validation errors)
   */
  constructor(status, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(msg, details) { return new AppError(400, msg, details); }
  static unauthorized(msg = 'Authentication required') { return new AppError(401, msg); }
  static forbidden(msg = 'You do not have permission to do that') { return new AppError(403, msg); }
  static notFound(msg = 'Resource not found') { return new AppError(404, msg); }
  static conflict(msg) { return new AppError(409, msg); }
}
