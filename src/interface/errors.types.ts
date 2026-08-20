// src/interface/errors.types.ts

export type IErrorMessage = {
  path: string | number;
  message: string;
};

export type TErrorSources = IErrorMessage[];

export type TGenericErrorResponse = {
  statusCode: number;
  message: string;
  errorMessages: TErrorSources;
};
