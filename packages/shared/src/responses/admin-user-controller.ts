export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  registeredAt: string;
}

export type AdminUserListResponse =
  | { status: "success"; items: AdminUserListItem[]; total: number }
  | { status: "error"; message: string };
