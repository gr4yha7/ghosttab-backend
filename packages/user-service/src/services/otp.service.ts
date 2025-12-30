import { supabase, logger, ValidationError } from '@ghosttab/common';
import { config } from '../config';
import { emailService } from './email.service';

export class OTPService {
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async createAndSendOTP(
    email: string,
    type: 'FRIEND_REQUEST' | 'FRIEND_ACCEPT',
    metadata?: any
  ): Promise<void> {
    const code = this.generateCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + config.otp.expiryMinutes);

    // Store OTP in database
    const { error } = await supabase.from('otp_codes').insert({
      email,
      code,
      type,
      metadata,
      expires_at: expiresAt.toISOString(),
      used: false,
    });

    if (error) {
      logger.error('Failed to store OTP', { email, error });
      throw new Error('Failed to generate verification code');
    }

    // Send email
    await emailService.sendOTP(email, code, type);

    logger.info('OTP created and sent', { email, type });
  }

  async verifyOTP(
    email: string,
    code: string,
    type: string
  ): Promise<{ valid: boolean; metadata?: any }> {
    // Find valid OTP
    const { data: otpRecord, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('type', type)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !otpRecord) {
      logger.warn('Invalid OTP attempt', { email, type });
      return { valid: false };
    }

    // Mark as used
    await supabase
      .from('otp_codes')
      .update({ used: true })
      .eq('id', otpRecord.id);

    logger.info('OTP verified successfully', { email, type });

    return {
      valid: true,
      metadata: otpRecord.metadata,
    };
  }

  async cleanupExpiredOTPs(): Promise<void> {
    try {
      const { error } = await supabase
        .from('otp_codes')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        logger.error('Failed to cleanup expired OTPs', { error });
      } else {
        logger.info('Expired OTPs cleaned up');
      }
    } catch (error) {
      logger.error('Error during OTP cleanup', { error });
    }
  }
}

export const otpService = new OTPService();

// Schedule cleanup every hour
setInterval(() => {
  otpService.cleanupExpiredOTPs();
}, 60 * 60 * 1000);