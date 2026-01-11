import { logger, NotFoundError, supabase } from "@ghosttab/common";

export class TrustScoreService {
  // Calculate trust score based on settlement behavior
  private calculateScoreFromStats(stats: {
    settlements_on_time: number;
    settlements_late: number;
    total_settlements: number;
  }): number {
    if (stats.total_settlements === 0) return 100;

    // Base score: 100
    // Lose 10 points for each late settlement
    // Gain 5 points for every 10 on-time settlements (capped)
    const baseScore = 100;
    const latePenalty = (stats.settlements_late || 0) * 10;
    const onTimeBonus = Math.min(
      Math.floor((stats.settlements_on_time || 0) / 10) * 5,
      50 // Max bonus
    );

    const score = Math.max(
      0,
      Math.min(150, baseScore - latePenalty + onTimeBonus)
    );

    return score;
  }

  async calculateTrustScore(userId: string): Promise<number> {
    const { data: user, error } = await supabase
      .from('users')
      .select('settlements_on_time, settlements_late, total_settlements')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new NotFoundError('User');
    }

    return this.calculateScoreFromStats({
      settlements_on_time: user.settlements_on_time || 0,
      settlements_late: user.settlements_late || 0,
      total_settlements: user.total_settlements || 0,
    });
  }

  async updateTrustScore(
    userId: string,
    onTime: boolean,
    daysLate: number,
    tabId?: string,
    penaltyAmount?: number
  ): Promise<void> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new NotFoundError('User');
    }

    const scoreBefore = user.trust_score;

    // Update counters
    const stats = {
      total_settlements: (user.total_settlements || 0) + 1,
      settlements_on_time: (user.settlements_on_time || 0) + (onTime ? 1 : 0),
      settlements_late: (user.settlements_late || 0) + (onTime ? 0 : 1),
    };

    // Calculate new score using UPDATED stats
    const scoreAfter = this.calculateScoreFromStats(stats);

    // 1. Update user profile
    await supabase
      .from('users')
      .update({
        ...stats,
        trust_score: scoreAfter,
      })
      .eq('id', userId);

    // 2. Record in settlement history
    await supabase
      .from('settlement_history')
      .insert({
        user_id: userId,
        tab_id: tabId,
        settled_on_time: onTime,
        days_late: daysLate,
        penalty_amount: penaltyAmount || 0,
        trust_score_before: scoreBefore,
        trust_score_after: scoreAfter,
      });

    logger.info('Trust score updated and history recorded', {
      userId,
      tabId,
      scoreBefore,
      scoreAfter,
      onTime,
      daysLate,
    });
  }

  // Get trust score tier
  getTrustTier(score: number): {
    tier: string;
    color: string;
    benefits: string[];
  } {
    if (score >= 120) {
      return {
        tier: 'Excellent',
        color: '#10b981',
        benefits: [
          'Lower penalty rates',
          'Priority support',
          'Extended deadlines',
        ],
      };
    } else if (score >= 100) {
      return {
        tier: 'Good',
        color: '#3b82f6',
        benefits: ['Standard rates', 'Normal deadlines'],
      };
    } else if (score >= 70) {
      return {
        tier: 'Fair',
        color: '#f59e0b',
        benefits: ['Standard rates', 'Payment reminders'],
      };
    } else {
      return {
        tier: 'Poor',
        color: '#ef4444',
        benefits: ['Higher penalty rates', 'Stricter deadlines'],
      };
    }
  }
}

export const trustScoreService = new TrustScoreService();