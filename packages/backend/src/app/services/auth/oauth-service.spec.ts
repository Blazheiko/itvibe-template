import { Result } from "better-result";
import { afterEach, describe, expect, it, vi } from "vitest";

const userRepositoryMock = {
  findById: vi.fn(),
  findByEmail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

const oauthAccountRepositoryMock = {
  findByProviderAndProviderId: vi.fn(),
  updateTokens: vi.fn(),
  create: vi.fn(),
};

const authMock = {
  login: vi.fn(),
};

const loggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
};

const googleValidateAuthorizationCodeMock = vi.fn();
const googleCreateAuthorizationUrlMock = vi.fn(
  () => new URL("https://accounts.google.com/o/oauth2/v2/auth"),
);
const facebookValidateAuthorizationCodeMock = vi.fn();
const facebookCreateAuthorizationUrlMock = vi.fn(
  () => new URL("https://www.facebook.com/v19.0/dialog/oauth"),
);
const githubValidateAuthorizationCodeMock = vi.fn();
const githubCreateAuthorizationUrlMock = vi.fn(
  () => new URL("https://github.com/login/oauth/authorize"),
);
const gitlabValidateAuthorizationCodeMock = vi.fn();
const gitlabCreateAuthorizationUrlMock = vi.fn(
  () => new URL("https://gitlab.com/oauth/authorize"),
);

vi.mock("#config/oauth.js", () => ({
  default: {
    google: {
      clientId: "google-client",
      clientSecret: "google-secret",
      redirectUri: "https://app.example.com/oauth/google/callback",
    },
    facebook: {
      clientId: "facebook-client",
      clientSecret: "facebook-secret",
      redirectUri: "https://app.example.com/oauth/facebook/callback",
    },
    github: {
      clientId: "github-client",
      clientSecret: "github-secret",
      redirectUri: "https://app.example.com/oauth/github/callback",
    },
    gitlab: {
      clientId: "gitlab-client",
      clientSecret: "gitlab-secret",
      redirectUri: "https://app.example.com/oauth/gitlab/callback",
    },
    frontendSuccessUrl: "https://app.example.com/oauth/success",
    frontendErrorUrl: "https://app.example.com/oauth/error",
  },
}));

vi.mock("#app/repositories/index.js", () => ({
  userRepository: userRepositoryMock,
  oauthAccountRepository: oauthAccountRepositoryMock,
}));

vi.mock("#vendor/utils/logger.js", () => ({
  default: loggerMock,
}));

vi.mock("arctic", () => ({
  Google: class {
    createAuthorizationURL = googleCreateAuthorizationUrlMock;
    validateAuthorizationCode = googleValidateAuthorizationCodeMock;
  },
  Facebook: class {
    createAuthorizationURL = facebookCreateAuthorizationUrlMock;
    validateAuthorizationCode = facebookValidateAuthorizationCodeMock;
  },
  GitHub: class {
    createAuthorizationURL = githubCreateAuthorizationUrlMock;
    validateAuthorizationCode = githubValidateAuthorizationCodeMock;
  },
  GitLab: class {
    createAuthorizationURL = gitlabCreateAuthorizationUrlMock;
    validateAuthorizationCode = gitlabValidateAuthorizationCodeMock;
  },
  generateState: vi.fn(() => "oauth-state"),
  generateCodeVerifier: vi.fn(() => "code-verifier"),
}));

async function loadOauthService() {
  return import("./oauth-service.js");
}

function stubGitHubUserInfoFetch(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        id: "provider-user-1",
        email: "user@example.com",
        name: "Jane",
        avatar_url: "https://cdn.example.com/avatar.png",
      }),
    }),
  );
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("oauthService", () => {
  it("logs in a returning user linked to an existing OAuth account", async () => {
    githubValidateAuthorizationCodeMock.mockResolvedValue({
      accessToken: () => "github-access-token",
      hasRefreshToken: () => false,
      refreshToken: () => null,
    });
    stubGitHubUserInfoFetch();
    oauthAccountRepositoryMock.findByProviderAndProviderId.mockResolvedValue({
      id: 21n,
      userId: 7n,
    });
    oauthAccountRepositoryMock.updateTokens.mockResolvedValue({
      id: 21n,
    });
    userRepositoryMock.findById.mockResolvedValue({
      id: 7n,
      sessionToken: "session-token",
    });
    authMock.login.mockResolvedValue(true);

    const { oauthService } = await loadOauthService();
    const result = await oauthService.handleCallback(
      "github",
      "oauth-code",
      "oauth-state",
      "oauth-state",
      null,
      authMock as any,
    );

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual({
        redirectUrl: "https://app.example.com/oauth/success",
      });
    }
    expect(
      oauthAccountRepositoryMock.findByProviderAndProviderId,
    ).toHaveBeenCalledWith("github", "provider-user-1");
    expect(oauthAccountRepositoryMock.updateTokens).toHaveBeenCalledWith(
      21n,
      "github-access-token",
      null,
    );
    expect(authMock.login).toHaveBeenCalledWith("7", "session-token");
    expect(userRepositoryMock.create).not.toHaveBeenCalled();
  });

  it("creates a new user and OAuth link for first-time OAuth login", async () => {
    githubValidateAuthorizationCodeMock.mockResolvedValue({
      accessToken: () => "github-access-token",
      hasRefreshToken: () => false,
      refreshToken: () => null,
    });
    stubGitHubUserInfoFetch();
    oauthAccountRepositoryMock.findByProviderAndProviderId.mockResolvedValue(
      undefined,
    );
    userRepositoryMock.findByEmail.mockResolvedValue(undefined);
    userRepositoryMock.create.mockResolvedValue({
      id: 8n,
      sessionToken: "new-session-token",
    });
    oauthAccountRepositoryMock.create.mockResolvedValue({
      id: 22n,
      userId: 8n,
    });
    authMock.login.mockResolvedValue(true);

    const { oauthService } = await loadOauthService();
    const result = await oauthService.handleCallback(
      "github",
      "oauth-code",
      "oauth-state",
      "oauth-state",
      null,
      authMock as any,
    );

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual({
        redirectUrl: "https://app.example.com/oauth/success",
      });
    }
    expect(userRepositoryMock.create).toHaveBeenCalledWith({
      name: "Jane",
      email: "user@example.com",
      password: null,
      avatar: "https://cdn.example.com/avatar.png",
    });
    expect(oauthAccountRepositoryMock.create).toHaveBeenCalledWith({
      userId: 8n,
      provider: "github",
      providerUserId: "provider-user-1",
      providerEmail: "user@example.com",
      providerName: "Jane",
      providerAvatar: "https://cdn.example.com/avatar.png",
      accessToken: "github-access-token",
      refreshToken: null,
    });
    expect(authMock.login).toHaveBeenCalledWith("8", "new-session-token");
  });
});
