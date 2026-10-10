import {Request, Response, NextFunction } from "express";
import { AppError, NotFoundErrorClass } from "./utils/errors/app.error";

export const errorcheckingcontroller =async (req : Request, res: Response , next : NextFunction ) => { 
    next(new NotFoundErrorClass("Not found mess"))
}