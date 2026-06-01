class AppError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(code, message, details) {
    return new AppError(400, code, message, details);
  }

  static notFound(code, message, details) {
    return new AppError(404, code, message, details);
  }

  static conflict(code, message, details) {
    return new AppError(409, code, message, details);
  }

  static unprocessableEntity(code, message, details) {
    return new AppError(422, code, message, details);
  }

  static tooManyRequests(code, message, details) {
    return new AppError(429, code, message, details);
  }

  static badGateway(code, message, details) {
    return new AppError(502, code, message, details);
  }
}

module.exports = {
  AppError,
};
