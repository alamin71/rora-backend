import { ZodError } from "zod";
import {
  TErrorSources,
  TGenericErrorResponse,
} from "../interface/errors.types";

const handleZodError = (err: ZodError): TGenericErrorResponse => {
  const errorMessages: TErrorSources = err.issues.map((issue) => ({
    path: issue.path.join("."), // make full path if nested
    message: issue.message,
  }));

  return {
    statusCode: 400,
    message: "Validation Error",
    errorMessages,
  };
};

export default handleZodError;
