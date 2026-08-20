import mongoose from "mongoose";
import {
  TErrorSources,
  TGenericErrorResponse,
} from "../interface/errors.types";

const handleCastError = (
  err: mongoose.Error.CastError
): TGenericErrorResponse => {
  const errorMessages: TErrorSources = [
    {
      path: err?.path,
      message: err?.message,
    },
  ];
  return {
    statusCode: 400,
    message: "Invalid value",
    errorMessages,
  };
};

export default handleCastError;
