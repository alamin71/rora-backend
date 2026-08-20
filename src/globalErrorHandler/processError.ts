// import { ZodError } from "zod";
// import handleZodError from "../errors/handleZodError";
// import handleValidationError from "../errors/handleValidationError";
// import handleCastError from "../errors/handleCastError";
// import handleDuplicateError from "../errors/handleDuplicateError";
// import AppError from "../errors/AppError";
// import { StatusCodes } from "http-status-codes";
// const processError = (err: any) => {
//   if (err instanceof ZodError) return handleZodError(err);
//   if (err?.name === "validationError") return handleValidationError(err);
//   if (err?.name === "CastError") return handleCastError(err);
//   if (err?.code === 11000) return handleDuplicateError(err);
//   if (err instanceof AppError) {
//     return {
//       statusCode: err?.statusCode,
//       message: err?.message,
//       errorSources: err?.message ? [{ path: "", message: err?.message }] : [],
//     };
//   }
//   if (err.name === "TokenExpiredError") {
//     return {
//       statusCode: StatusCodes.UNAUTHORIZED,
//       message: "Session Expired",
//       errorSources: err?.message
//         ? [
//             {
//               path: "",
//               message:
//                 "Your session has expired. Please log in again to continue.",
//             },
//           ]
//         : [],
//     };
//   }

//   if (err instanceof Error) {
//     return {
//       statusCode: StatusCodes.BAD_REQUEST,
//       message: err?.message,
//       errorSources: err.message ? [{ path: "", message: err?.message }] : [],
//     };
//   }
//   return {
//     statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
//     message: "Something went wrong!",
//     errorSources: [],
//   };
// };

// export default processError;
import { ZodError } from "zod";
import handleZodError from "../errors/handleZodError";
import handleValidationError from "../errors/handleValidationError";
import handleCastError from "../errors/handleCastError";
import handleDuplicateError from "../errors/handleDuplicateError";
import AppError from "../errors/AppError";
import { StatusCodes } from "http-status-codes";

const processError = (err: any) => {
  if (err instanceof ZodError) return handleZodError(err);
  if (err?.name === "validationError") return handleValidationError(err);
  if (err?.name === "CastError") return handleCastError(err);
  if (err?.code === 11000) return handleDuplicateError(err);

  if (err instanceof AppError) {
    return {
      statusCode: err?.statusCode,
      message: err?.message,
      errorMessages: err?.message ? [{ path: "", message: err?.message }] : [],
    };
  }

  if (err.name === "TokenExpiredError") {
    return {
      statusCode: StatusCodes.UNAUTHORIZED,
      message: "Session Expired",
      errorMessages: [
        {
          path: "",
          message: "Your session has expired. Please log in again to continue.",
        },
      ],
    };
  }

  if (err instanceof Error) {
    return {
      statusCode: StatusCodes.BAD_REQUEST,
      message: err?.message,
      errorMessages: err.message ? [{ path: "", message: err?.message }] : [],
    };
  }

  return {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    message: "Something went wrong!",
    errorMessages: [],
  };
};

export default processError;
