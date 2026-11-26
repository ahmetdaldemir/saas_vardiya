import { Injectable } from '@nestjs/common';

export type AssignmentScoreInput = {
  seniorityScore: number;
  preferenceMatchScore: number;
  overworkPenalty: number;
  fairnessBalanceScore: number;
  conflictPenalty: number;
  hardConflictDetected?: boolean;
};

@Injectable()
export class SchedulingScoringService {
  scoreAssignment(input: AssignmentScoreInput) {
    if (input.hardConflictDetected) {
      return {
        eligible: false,
        score: Number.NEGATIVE_INFINITY,
        breakdown: input,
      };
    }

    const score =
      input.seniorityScore * 0.25 +
      input.preferenceMatchScore * 0.3 -
      input.overworkPenalty * 0.2 +
      input.fairnessBalanceScore * 0.2 -
      input.conflictPenalty;

    return {
      eligible: true,
      score: Number(score.toFixed(2)),
      breakdown: input,
    };
  }
}
