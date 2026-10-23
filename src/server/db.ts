import "server-only";
import { PrismaClient } from "@prisma/client";
import { serverEnv } from "@/env";

serverEnv();

// Singleton global para sobreviver ao hot reload (ADR-001).
const g = globalThis as unknown as { prisma?: PrismaClient };

export const db = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = db;
