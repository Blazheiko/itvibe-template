import { type } from "@arktype/type";

export const UploadAvatarResponseSchema = type({
  status: "'ok' | 'error'",
  "code?": "string",
  "reason?": "string",
  "details?": "unknown",
  "message?": "string",
  "user?": {
    id: "string",
    name: "string",
    email: "string",
    "avatar?": "string | null",
  },
});
export interface UploadAvatarResponse extends Record<string, unknown> {
  status: "ok" | "error";
  code?: string;
  reason?: string;
  details?: unknown;
  message?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
}

export const DeleteAvatarResponseSchema = type({
  status: "'ok' | 'error'",
  "code?": "string",
  "reason?": "string",
  "details?": "unknown",
  "message?": "string",
  "user?": {
    id: "string",
    name: "string",
    email: "string",
    "avatar?": "string | null",
  },
});
export interface DeleteAvatarResponse extends Record<string, unknown> {
  status: "ok" | "error";
  code?: string;
  reason?: string;
  details?: unknown;
  message?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
}
