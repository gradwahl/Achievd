import type { AppRepository } from "@/lib/repositories/app-repository";
import { prismaRepository } from "@/lib/repositories/prisma-repository";

export function getRepository(): AppRepository {
  return prismaRepository;
}
