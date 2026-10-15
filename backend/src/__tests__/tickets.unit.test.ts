/**
 * Unit tests for ticket validation and state machine logic.
 * These don't need a live database — they test the service layer logic in isolation.
 */
import { describe, it, expect } from "vitest";
import { ALLOWED_TRANSITIONS, toApiStatus, toDbStatus, toApiCategory, toDbCategory } from "../lib/enums";
import { computeSla } from "../lib/sla";

describe("Status state machine", () => {
  it("allows open → in_progress", () => {
    expect(ALLOWED_TRANSITIONS["open"]).toContain("in_progress");
  });

  it("allows in_progress → resolved", () => {
    expect(ALLOWED_TRANSITIONS["in_progress"]).toContain("resolved");
  });

  it("allows resolved → closed", () => {
    expect(ALLOWED_TRANSITIONS["resolved"]).toContain("closed");
  });

  it("allows resolved → in_progress (reopen)", () => {
    expect(ALLOWED_TRANSITIONS["resolved"]).toContain("in_progress");
  });

  it("disallows open → resolved", () => {
    expect(ALLOWED_TRANSITIONS["open"]).not.toContain("resolved");
  });

  it("disallows open → closed", () => {
    expect(ALLOWED_TRANSITIONS["open"]).not.toContain("closed");
  });

  it("disallows in_progress → open", () => {
    expect(ALLOWED_TRANSITIONS["in_progress"]).not.toContain("open");
  });

  it("disallows closed → any transition", () => {
    expect(ALLOWED_TRANSITIONS["closed"]).toHaveLength(0);
  });
});

describe("Enum converters", () => {
  it("converts account_access → account-access for API", () => {
    expect(toApiCategory("account_access")).toBe("account-access");
  });

  it("converts account-access → account_access for DB", () => {
    expect(toDbCategory("account-access")).toBe("account_access");
  });

  it("converts in_progress → in-progress for API", () => {
    expect(toApiStatus("in_progress")).toBe("in-progress");
  });

  it("converts in-progress → in_progress for DB", () => {
    expect(toDbStatus("in-progress")).toBe("in_progress");
  });

  it("passes through non-hyphenated values unchanged", () => {
    expect(toApiCategory("hardware")).toBe("hardware");
    expect(toApiStatus("open")).toBe("open");
    expect(toApiStatus("resolved")).toBe("resolved");
  });
});

describe("SLA computation", () => {
  it("labels a fresh ticket as ok", () => {
    const sla = computeSla("medium", "open", new Date());
    expect(sla.label).toBe("ok");
    expect(sla.target_hours).toBe(24);
    expect(sla.percent).toBeLessThan(1);
  });

  it("labels a ticket past 75% of SLA as at-risk", () => {
    const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
    // medium SLA = 24h; 20h elapsed = 83%
    const sla = computeSla("medium", "open", hoursAgo(20));
    expect(sla.label).toBe("at-risk");
    expect(sla.percent).toBeGreaterThan(75);
  });

  it("labels a ticket past 100% of SLA as breached", () => {
    const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
    // medium SLA = 24h; 30h elapsed = 125%
    const sla = computeSla("medium", "open", hoursAgo(30));
    expect(sla.label).toBe("breached");
    expect(sla.percent).toBeGreaterThan(100);
  });

  it("returns ok label for resolved tickets regardless of age", () => {
    const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
    const sla = computeSla("urgent", "resolved", hoursAgo(100));
    expect(sla.label).toBe("ok");
  });

  it("uses env-configurable SLA hours", () => {
    // Default from setup.ts: SLA_MEDIUM_HOURS=24
    const sla = computeSla("medium", "open", new Date());
    expect(sla.target_hours).toBe(24);
  });
});
