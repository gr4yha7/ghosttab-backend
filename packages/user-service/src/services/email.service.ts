import { Resend } from 'resend';
import { logger } from '@ghosttab/common';
import { config } from '../config';

const resend = new Resend(config.resend.apiKey);

export class EmailService {
  async sendOTP(email: string, code: string, type: 'FRIEND_REQUEST' | 'FRIEND_ACCEPT'): Promise<void> {
    try {
      const subject = type === 'FRIEND_REQUEST' 
        ? 'GhostTab - Friend Request' 
        : 'GhostTab - Accept Friend Request';
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">GhostTab</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px;">
            ${code}
          </div>
          <p style="margin-top: 20px; color: #6b7280;">This code will expire in ${config.otp.expiryMinutes} minutes.</p>
          <p style="color: #6b7280;">If you didn't request this code, please ignore this email.</p>
        </div>
      `;

      await resend.emails.send({
        from: 'GhostTab <noreply@ghosttab.app>',
        to: email,
        subject,
        html,
      });

      logger.info('OTP email sent', { email, type });
    } catch (error) {
      logger.error('Failed to send OTP email', { email, type, error });
      throw new Error('Failed to send verification email');
    }
  }

  async sendFriendRequestNotification(
    email: string,
    senderName: string
  ): Promise<void> {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">GhostTab</h2>
          <p><strong>${senderName}</strong> wants to be your friend on GhostTab!</p>
          <p>Open the GhostTab app to accept or decline this request.</p>
          <p style="color: #6b7280;">If you don't have the GhostTab app, download it to get started splitting bills with friends!</p>
        </div>
      `;

      await resend.emails.send({
        from: 'GhostTab <noreply@ghosttab.app>',
        to: email,
        subject: `${senderName} sent you a friend request`,
        html,
      });

      logger.info('Friend request notification sent', { email, senderName });
    } catch (error) {
      logger.error('Failed to send friend request notification', { email, error });
      // Don't throw - notification failure shouldn't break the flow
    }
  }
}

export const emailService = new EmailService();