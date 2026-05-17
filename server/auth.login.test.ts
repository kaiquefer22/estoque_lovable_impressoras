import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import { createHash } from "crypto";

// Mock db functions
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getUserByEmail: vi.fn(),
    createUserWithPassword: vi.fn(),
    logAudit: vi.fn(),
  };
});

// Mock password validator
vi.mock("./_core/passwordValidator", () => ({
  validatePasswordStrength: vi.fn(() => ({ isValid: true, feedback: [] })),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(() => Promise.resolve(true)),
}));

// Mock email service
vi.mock("./_core/emailService", () => ({
  sendPasswordResetEmail: vi.fn(),
  sendEmail: vi.fn(),
}));

import { getUserByEmail } from "./db";

type CookieCall = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

function createPublicContext(): { ctx: TrpcContext; setCookies: CookieCall[] } {
  const setCookies: CookieCall[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, value, options });
      },
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx, setCookies };
}

describe("auth.loginWithPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects login when user not found", async () => {
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.loginWithPassword({ email: "noexist@test.com", password: "TestPass123@" })
    ).rejects.toThrow("Email ou senha inválidos");
  });

  it("rejects login when password is wrong", async () => {
    const correctHash = createHash("sha256").update("CorrectPass1@").digest("hex");
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5,
      openId: "local-test@test.com-123",
      email: "test@test.com",
      name: "Test User",
      passwordHash: correctHash,
      isApproved: true,
      role: "user",
      loginMethod: "password",
    });
    
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.loginWithPassword({ email: "test@test.com", password: "WrongPass1@!" })
    ).rejects.toThrow("Email ou senha inválidos");
  });

  it("rejects login when user is not approved", async () => {
    const passwordHash = createHash("sha256").update("TestPass123@").digest("hex");
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5,
      openId: "local-test@test.com-123",
      email: "test@test.com",
      name: "Test User",
      passwordHash,
      isApproved: false,
      role: "user",
      loginMethod: "password",
    });
    
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.loginWithPassword({ email: "test@test.com", password: "TestPass123@" })
    ).rejects.toThrow("ainda nao foi aprovada");
  });

  it("sets session cookie with userId on successful login", async () => {
    const password = "TestPass123@";
    const passwordHash = createHash("sha256").update(password).digest("hex");
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5,
      openId: "local-test@test.com-123",
      email: "test@test.com",
      name: "Test User",
      passwordHash,
      isApproved: true,
      role: "user",
      loginMethod: "password",
    });
    
    const { ctx, setCookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.loginWithPassword({ email: "test@test.com", password });

    expect(result.success).toBe(true);
    expect(setCookies).toHaveLength(1);
    expect(setCookies[0]?.name).toBe(COOKIE_NAME);
    expect(setCookies[0]?.value).toBeTruthy();
    
    // Verify the JWT contains userId (not openId as the user's numeric id)
    // Decode the JWT payload (base64url)
    const token = setCookies[0]?.value;
    const payloadBase64 = token.split(".")[1];
    const payloadJson = JSON.parse(Buffer.from(payloadBase64, "base64url").toString());
    
    expect(payloadJson.userId).toBe("5");
    expect(payloadJson.openId).toBeUndefined();
    expect(payloadJson.name).toBe("Test User");
  });

  it("rejects OAuth-only users trying password login", async () => {
    (getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 3,
      openId: "oauth-user-123",
      email: "oauth@test.com",
      name: "OAuth User",
      passwordHash: null,
      isApproved: true,
      role: "user",
      loginMethod: "manus",
    });
    
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.loginWithPassword({ email: "oauth@test.com", password: "TestPass123@" })
    ).rejects.toThrow("cadastrado via Google");
  });
});
