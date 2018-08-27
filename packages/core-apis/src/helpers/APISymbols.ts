export const APISymbols = {
  api                  : Symbol.for('rise.api.api'),
  applyLimitsMiddleware: Symbol.for('rise.api.applyLimitsMiddleware'),
  errorHandler         : Symbol.for('rise.api.errorHandler'),
  privateApiGuard      : Symbol.for('rise.api.forgingApisWatchGuard'),
  socketIOAPI          : Symbol.for('rise.api.socketIOAPI' +
    ''),
  successInterceptor   : Symbol.for('rise.api.successInterceptor'),
};
