import { Result } from "better-result";
import { afterEach, describe, expect, it, vi } from "vitest";

const contactListRepositoryMock = {
  findByUserId: vi.fn(),
  update: vi.fn(),
};

const messageRepositoryMock = {
  findByVideoCallIdWithVideoCall: vi.fn(),
  createVideoCallMessage: vi.fn(),
  findByIdWithVideoCall: vi.fn(),
  findByVideoCallId: vi.fn(),
};

const videoCallRepositoryMock = {
  create: vi.fn(),
  findById: vi.fn(),
  finish: vi.fn(),
};

const broadcastServiceMock = {
  broadcastMessageToUser: vi.fn(),
};

const messageTransformerMock = {
  serialize: vi.fn((message: { id: bigint; content: string }) => ({
    id: String(message.id),
    content: message.content,
  })),
};

const loggerMock = {
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

vi.mock("#app/repositories/index.js", () => ({
  contactListRepository: contactListRepositoryMock,
  messageRepository: messageRepositoryMock,
  videoCallRepository: videoCallRepositoryMock,
}));

vi.mock("#app/services/broadcast-service.js", () => ({
  broadcastService: broadcastServiceMock,
}));

vi.mock("#app/transformers/index.js", () => ({
  messageTransformer: messageTransformerMock,
}));

vi.mock("#logger", () => ({
  default: loggerMock,
}));

async function loadVideoCallMessageService() {
  return import("./video-call-message-service.js");
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("videoCallMessageService", () => {
  it("returns existing video call message when active call already exists", async () => {
    messageRepositoryMock.findByVideoCallIdWithVideoCall.mockResolvedValue({
      id: 1n,
      content: "Video call",
      videoCall: { id: 5n },
    });

    const { videoCallMessageService } = await loadVideoCallMessageService();
    const result = await videoCallMessageService.startVideoCallLog(
      "7",
      "9",
      {
        videoCallId: "5",
        videoCallPeerUserId: "9",
      } as never,
    );

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.message).toEqual({
        id: "1",
        content: "Video call",
      });
    }
  });

  it("starts a new video call log", async () => {
    contactListRepositoryMock.findByUserId.mockResolvedValue([
      { id: 11n, contactId: 9n },
    ]);
    videoCallRepositoryMock.create.mockResolvedValue({
      id: 21n,
      callerId: 7n,
      calleeId: 9n,
      startedAt: new Date("2026-05-08T10:00:00.000Z"),
      endedAt: null,
    });
    messageRepositoryMock.createVideoCallMessage.mockResolvedValue({
      id: 31n,
      content: "Video call",
    });
    messageRepositoryMock.findByIdWithVideoCall.mockResolvedValue(undefined);

    const { videoCallMessageService } = await loadVideoCallMessageService();
    const result = await videoCallMessageService.startVideoCallLog("7", "9");

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.message).toEqual({
        id: "31",
        content: "Video call",
      });
    }
    expect(videoCallRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        callerId: 7n,
        calleeId: 9n,
      }),
    );
  });

  it("finishes a video call log", async () => {
    videoCallRepositoryMock.findById.mockResolvedValue({
      id: 21n,
      callerId: 7n,
      calleeId: 9n,
      startedAt: new Date("2026-05-08T10:00:00.000Z"),
      endedAt: null,
    });
    messageRepositoryMock.findByVideoCallId.mockResolvedValue({
      id: 31n,
      content: "Video call",
      videoCallId: 21n,
    });
    videoCallRepositoryMock.finish.mockResolvedValue({
      id: 21n,
      callerId: 7n,
      calleeId: 9n,
      startedAt: new Date("2026-05-08T10:00:00.000Z"),
      endedAt: new Date("2026-05-08T11:00:00.000Z"),
    });
    messageRepositoryMock.findByIdWithVideoCall.mockResolvedValue(undefined);

    const { videoCallMessageService } = await loadVideoCallMessageService();
    const result = await videoCallMessageService.finishVideoCallLog(
      "7",
      "9",
      "21",
    );

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.message).toEqual({
        id: "31",
        content: "Video call",
      });
    }
  });
});
