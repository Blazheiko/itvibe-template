import type { CanonicalErrorResponse } from "./error-response.js";

export interface AdminOnlineUserListItem {
  id: string;
  name: string;
  email: string;
  appType: "web" | "pwa";
  userAgent: string;
  connectionsCount: number;
}

export interface AdminOnlineUserConnection {
  uuid: string;
  ip: string;
  userAgent: string;
  appType: "web" | "pwa";
}

export interface AdminOnlineUserDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  isOnline: boolean;
  appType: "web" | "pwa" | null;
  userAgent: string | null;
  connections: AdminOnlineUserConnection[];
}

export type AdminOnlineUserListResponse =
  | { status: "success"; items: AdminOnlineUserListItem[]; total: number }
  | CanonicalErrorResponse;

export type AdminOnlineUserDetailResponse =
  | {
      status: "success";
      user: AdminOnlineUserDetail;
    }
  | CanonicalErrorResponse;

export type AdminOnlineUsersWsResponse =
  | { status: "success" }
  | CanonicalErrorResponse;
