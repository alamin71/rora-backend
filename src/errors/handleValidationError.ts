import mongoose from "mongoose";
import {
  TErrorSources,
  TGenericErrorResponse,
} from "../interface/errors.types";

const handleValidationError = (
  err: mongoose.Error.ValidationError
): TGenericErrorResponse => {
  const errorSources: TErrorSources = Object.values(err.errors).map((ele) => {
    return {
      path: ele?.path,
      message: ele?.message,
    };
  });

  return {
    statusCode: 400,
    message: "Validation Error",
    errorMessages: errorSources,
  };
};

export default handleValidationError;
