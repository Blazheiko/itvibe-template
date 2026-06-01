import { type } from "@arktype/type";
import {
  NonEmptyStringSchema,
  NonNegativeIntSchema,
  PositiveIntSchema,
  TimestampSchema,
} from "../../brands/index.js";

// Схема для валидации даты (строка в формате YYYY-MM-DD)
const DateStringSchema = type(/^\d{4}-\d{2}-\d{2}$/);

// Полная схема User Activity (для типов и валидации полных объектов)
export const UserActivitySchema = type({
  id: PositiveIntSchema,
  token: NonEmptyStringSchema,
  userAgent: NonEmptyStringSchema,
  ip: NonEmptyStringSchema,
  countClick: NonNegativeIntSchema,
  clickBooking: NonNegativeIntSchema,
  date: DateStringSchema,
  "referer?": "string",
  path: NonEmptyStringSchema,
  "deviceType?": "string",
  "browser?": "string",
  "os?": "string",
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type UserActivity = typeof UserActivitySchema.infer;

// Схема для входных данных при создании User Activity
export const CreateUserActivityInputSchema = type({
  token: NonEmptyStringSchema,
  userAgent: NonEmptyStringSchema,
  ip: NonEmptyStringSchema,
  "countClick?": NonNegativeIntSchema,
  "clickBooking?": NonNegativeIntSchema,
  date: DateStringSchema,
  "referer?": "string",
  path: NonEmptyStringSchema,
  "deviceType?": "string",
  "browser?": "string",
  "os?": "string",
  "+": "reject",
});

export type CreateUserActivityInput =
  typeof CreateUserActivityInputSchema.infer;

// Схема для обновления User Activity (все поля опциональны, кроме id)
export const UpdateUserActivityInputSchema = type({
  "token?": NonEmptyStringSchema,
  "userAgent?": NonEmptyStringSchema,
  "ip?": NonEmptyStringSchema,
  "countClick?": NonNegativeIntSchema,
  "clickBooking?": NonNegativeIntSchema,
  "date?": DateStringSchema,
  "referer?": "string",
  "path?": NonEmptyStringSchema,
  "deviceType?": "string",
  "browser?": "string",
  "os?": "string",
  "+": "reject",
});

export type UpdateUserActivityInput =
  typeof UpdateUserActivityInputSchema.infer;
