/**
 * Auth and role enforcement tests.
 * Uses Vitest mocking to avoid needing a live database.
 * JWTs are signed directly (bypassing bcrypt) for role tests.
 */
import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../index";

// ── Mock Prisma ───────────────────────────────────────────────────────────────
vi.mock("../lib/prisma", () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(({ where }) => {
          if (where?.username === "priya.nair") return Promise.resolve({
            id: "emp-001",
            username: "priya.nair",
            full_name: "Priya Nair",
            email: "priya@example.com",
            // bcrypt hash of "Demo1234!" cost 10
            password_hash: "$2b$10$dSKKJEeyCbWSYhupLtXw8uwSw4gQYZYyeDzGwn9LKsRm.i0GK4lde",
            role: "employee",
            created_at: new Date(),
          });
          if (where?.username === "arjun.mehta") return Promise.resolve({
            id: "tech-001",
            username: "arjun.mehta",
            full_name: "Arjun Mehta",
            email: "arjun@example.com",
            password_hash: "$2b$10$dSKKJEeyCbWSYhupLtXw8uwSw4gQYZYyeDzGwn9LKsRm.i0GK4lde",
            role: "technician",
            created_at: new Date(),
          });
          return Promise.resolve(null);
        }),
        findMany: vi.fn(() => Promise.resolve([])),
      },
      ticket: {
        findUnique: vi.fn(() => Promise.resolve(null)),
        findMany: vi.fn(() => Promise.resolve([])),
        count: vi.fn(() => Promise.resolve(0)),
        create: vi.fn(),
        update: vi.fn(),
      },
      statusHistory: { create: vi.fn() },
      comment: { create: vi.fn() },
      $transaction: vi.fn(async (arg: unknown) => {
        if (typeof arg === "function") return (arg as (tx: unknown) => Promise<unknown>)({});
        return Promise.all(arg as Promise<unknown>[]);
      }),
    },
  };
});

// ── JWT helpers — sign directly without going through bcrypt ──────────────────
const SECRET = "test_jwt_secret_at_least_32_characters_long"; // matches setup.ts

function makeToken(payload: object) {
  return jwt.sign(payload, SECRET, { expiresIn: "1h" });
}

function employeeCookie() {
  const token = makeToken({ id: "emp-001", username: "priya.nair", role: "employee", email: "priya@example.com", full_name: "Priya Nair" });
  return `token=${token}`;
}

function technicianCookie() {
  const token = makeToken({ id: "tech-001", username: "arjun.mehta", role: "technician", email: "arjun@example.com", full_name: "Arjun Mehta" });
  return `token=${token}`;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("returns 200 and sets cookie for correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "priya.nair", password: "Demo1234!" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: "priya.nair", role: "employee" });
    const cookies = (res.headers["set-cookie"] as unknown) as string[] | undefined;
    expect(cookies?.some((c: string) => c.startsWith("token="))).toBe(true);
  });

  it("returns 401 for unknown username", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "nobody", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  it("returns 401 for wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "priya.nair", password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing username", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "Demo1234!" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "priya.nair" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty body", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 when no cookie is set", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 for a malformed token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", "token=not-a-valid-jwt");
    expect(res.status).toBe(401);
  });

  it("returns 200 with user data for a valid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", employeeCookie());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: "priya.nair", role: "employee" });
  });
});

describe("GET /api/tickets — auth enforcement", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/tickets/:id/status — role enforcement", () => {
  it("returns 403 when called by an employee", async () => {
    const res = await request(app)
      .patch("/api/tickets/00000000-0000-0000-0000-000000000099/status")
      .set("Cookie", employeeCookie())
      .send({ status: "in-progress" });
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("message");
  });

  it("allows a technician to reach the route (gets 404 as ticket doesn't exist)", async () => {
    const res = await request(app)
      .patch("/api/tickets/00000000-0000-0000-0000-000000000099/status")
      .set("Cookie", technicianCookie())
      .send({ status: "in-progress" });
    // 404 means auth/role passed; ticket just doesn't exist in mock
    expect([404, 400]).toContain(res.status);
  });
});

describe("PATCH /api/tickets/:id/assign — role enforcement", () => {
  it("returns 403 when called by an employee", async () => {
    const res = await request(app)
      .patch("/api/tickets/00000000-0000-0000-0000-000000000099/assign")
      .set("Cookie", employeeCookie())
      .send({ assigned_to: "00000000-0000-0000-0000-000000000002" });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/users — role enforcement", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app).get("/api/users?role=technician");
    expect(res.status).toBe(401);
  });

  it("returns 403 when called by an employee", async () => {
    const res = await request(app)
      .get("/api/users?role=technician")
      .set("Cookie", employeeCookie());
    expect(res.status).toBe(403);
  });

  it("returns 200 for a technician", async () => {
    const res = await request(app)
      .get("/api/users?role=technician")
      .set("Cookie", technicianCookie());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /api/auth/logout", () => {
  it("returns 200 and clears the cookie", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", employeeCookie());
    expect(res.status).toBe(200);
    const setCookie = (res.headers["set-cookie"] as unknown) as string[] | undefined;
    const tokenCookie = setCookie?.find((c: string) => c.startsWith("token="));
    expect(tokenCookie).toBeDefined();
    // Cookie should be cleared: value is empty or Expires is in the past
    expect(tokenCookie).toMatch(/token=;|token=$/);
  });
});

describe("Malformed JSON", () => {
  it("returns 400 for malformed JSON body on POST /api/auth/login", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{ bad json }");
    expect(res.status).toBe(400);
  });
});
