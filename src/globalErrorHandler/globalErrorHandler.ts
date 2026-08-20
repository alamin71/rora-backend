// import { ErrorRequestHandler, Request, Response, NextFunction } from "express";
// import processError from "./processError";
// import config from "../config";

// const globalErrorHandler: ErrorRequestHandler = (
//   error,
//   req: Request,
//   res: Response,
//   _next: NextFunction
// ) => {
//   const { statusCode, message, errorMessages } = processError(error);

//   res.status(statusCode).json({
//     success: false,
//     message,
//     statusCode,
//     error: errorMessages,
//     stack: config.node_env === "development" ? error?.stack : undefined,
//   });
// };

// export default globalErrorHandler;
import { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import processError from "./processError";
import config from "../config";

const globalErrorHandler: ErrorRequestHandler = (
  error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const { statusCode, message, errorMessages } = processError(error);

  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    error: errorMessages,
    stack: config.node_env === "development" ? error?.stack : undefined,
  });
};

export default globalErrorHandler;
