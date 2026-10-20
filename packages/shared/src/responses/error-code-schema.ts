import { type } from "@arktype/type";
import { ErrorCodeValues } from "../errors/error-codes.js";

export const ErrorCodeSchema = type.enumerated(...ErrorCodeValues);
