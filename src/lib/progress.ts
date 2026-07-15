import { prisma } from '@/lib/prisma';
import { ProgressStatus } from '@/generated/prisma/client';
import type { Language, QuestionStatus } from '@/lib/types';

const STATUS_MAP: Record<ProgressStatus, QuestionStatus> = {
  NOT_STARTED: 'not_started',
  ATTEMPTED: 'attempted',
  SOLVED: 'solved',
  SKIPPED: 'skipped',
};

export function prismaStatusToClient(status: ProgressStatus): QuestionStatus {
  return STATUS_MAP[status];
}

export async function getServerProgress(
  userId: string,
  language: Language,
): Promise<{ statuses: Record<string, QuestionStatus>; attemptCounts: Record<string, number> }> {
  const progress = await prisma.progress.findMany({
    where: { userId, language },
    select: { questionId: true, status: true, attempts: true },
  });
  return {
    statuses: Object.fromEntries(progress.map((p) => [p.questionId, prismaStatusToClient(p.status)])),
    // Only unsolved questions carry an attempt counter into the assist
    // ladder — solved ones start fresh if revisited.
    attemptCounts: Object.fromEntries(
      progress.filter((p) => p.status === 'ATTEMPTED').map((p) => [p.questionId, p.attempts]),
    ),
  };
}
