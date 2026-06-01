export interface AdminOnlineHistoryListItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  appType: "web" | "pwa" | null;
  connectedAt: string;
  disconnectedAt: string | null;
  connectionDurationMs: number | null;
  closeCode: number | null;
  isFirstConnection: boolean;
  isLastConnection: boolean | null;
  userAgent: string | null;
  ipAddress: string | null;
}

export type AdminOnlineHistoryListResponse =
  | {
      status: "success";
      items: AdminOnlineHistoryListItem[];
      total: number;
      limit: number;
      nextCursor: string | null;
      hasMore: boolean;
    }
  | { status: "error"; message: string };
