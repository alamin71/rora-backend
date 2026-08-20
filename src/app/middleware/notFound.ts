import { Request, Response, RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";

export const notFound: RequestHandler = (req: Request, res: Response) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: "Not found",
    errorMessages: [
      {
        path: req?.originalUrl,
        message: "API DOESN'T EXIST",
      },
    ],
  });
};
