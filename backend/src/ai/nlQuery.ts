/**
 * Natural-language dashboard queries.
 * The AI generates a SELECT; we validate it strictly before running it
 * on a read-only DB connection.
 */
import { callClaude, AI_UNAVAILABLE } from "./client";
import { logger } from "../services/logger";
import { prisma } from "../lib/prisma";

const ALLOWED_TABLES = ["tickets","users","status_history","comments","notifications"];

const SYSTEM = `You are a PostgreSQL query generator for an IT helpdesk database.
Tables available: tickets, users, status_history, comments, notifications.
IMPORTANT: Return ONLY valid SQL — no markdown, no explanation, no code fences.
The query MUST be a single SELECT statement. Include LIMIT 100 unless the user asks for aggregates.`;

function validateSql(sql: string): string | null {
  const s = sql.trim().toUpperCase();
  if (!s.startsWith("SELECT")) return "Only SELECT queries are allowed";
  if (/;\s*\w/.test(sql)) return "Only a single statement is allowed";
  if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/i.test(sql))
    return "DML/DDL statements are not allowed";

  const tableMatches = sql.match(/\bFROM\s+(\w+)|\bJOIN\s+(\w+)/gi) ?? [];
  for (const m of tableMatches) {
    const tbl = m.replace(/\b(FROM|JOIN)\s+/i,"").toLowerCase();
    if (!ALLOWED_TABLES.includes(tbl)) return `Table '${tbl}' is not allowed`;
  }
  return null; // valid
}

function injectLimit(sql: string): string {
  if (/\bLIMIT\b/i.test(sql)) return sql;
  return sql.trimEnd().replace(/;?\s*$/, "") + " LIMIT 100";
}

export async function runNlQuery(question: string) {
  const raw = await callClaude(question, SYSTEM);
  if (raw === AI_UNAVAILABLE) return { aiUnavailable: true as const };

  const sql = raw.trim().replace(/^```sql?\s*/i,"").replace(/```$/,"").trim();
  const err = validateSql(sql);
  if (err) {
    logger.warn({ sql, err }, "NL query validation failed");
    return { error: err, sql } as const;
  }

  const safeSql = injectLimit(sql);
  try {
    const rows = await prisma.$queryRawUnsafe(safeSql);
    return { answer: rows, sql: safeSql };
  } catch (e: unknown) {
    logger.error({ e, sql: safeSql }, "NL query execution failed");
    return { error: "Query execution failed", sql: safeSql } as const;
  }
}
