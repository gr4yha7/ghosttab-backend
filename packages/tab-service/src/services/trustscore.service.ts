import { logger, NotFoundError, supabase } from "@ghosttab/common";

export class TrustScoreService {
  // Calculate trust score based on settlement behavior
  async calculateTrustScore(userId: string): Promise<number> {
    const { data: user, error } = await supabase
      .from('users')
      .select('settlements_on_time, settlements_late, total_settlements')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new NotFoundError('User');
    }
    
    if (user.total_settlements === 0) return 100;
    
    const onTimeRate = (user.settlements_on_time ?? 0) / (user.total_settlements ?? 0);
    
    // Base score: 100
    // Lose 10 points for each late settlement
    // Gain 5 points for every 10 on-time settlements (capped)
    const baseScore = 100;
    const latePenalty = user.settlements_late ?? 0 * 10;
    const onTimeBonus = Math.min(
      Math.floor(user.settlements_on_time ?? 0 / 10) * 5,
      50 // Max bonus
    );
    
    const score = Math.max(
      0,
      Math.min(150, baseScore - latePenalty + onTimeBonus)
    );
    
    return score;
  }
  
  async updateTrustScore(
    userId: string,
    onTime: boolean,
    daysLate: number
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
    const updates = {
      total_settlements: user.total_settlements ?? 0 + 1,
      settlements_on_time: user.settlements_on_time ?? 0 + (onTime ? 1 : 0),
      settlements_late: user.settlements_late ?? 0 + (onTime ? 0 : 1),
    };
    
    // Calculate new score
    const scoreAfter = await this.calculateTrustScore(userId);
    
    await supabase
      .from('users')
      .update({
        ...updates,
        trust_score: scoreAfter,
      })
      .eq('id', userId);
    
    logger.info('Trust score updated', {
      userId,
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