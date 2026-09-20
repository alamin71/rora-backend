import { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import processError from "./processError";
import config from "../config";
import { errorLogger } from "../shared/logger";

const globalErrorHandler: ErrorRequestHandler = (
  error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const { statusCode, message, errorMessages } = processError(error);

  // Every error that reaches here — a failed call transition, a validation
  // error, an unhandled exception — used to only ever go back to the client,
  // never into the server's own logs. Without this, diagnosing "why did this
  // call get cut" meant reproducing the request by hand.
  errorLogger.error(
    `${req.method} ${req.originalUrl} — [${statusCode}] ${message}` +
      (error?.stack ? `\n${error.stack}` : "")
  );

  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    error: errorMessages,
    stack: config.node_env === "development" ? error?.stack : undefined,
  });
};

export default globalErrorHandler;
