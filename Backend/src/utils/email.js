import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { logger } from './logger.js';

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;
    const { emailHost, emailPort, emailUser, emailPass } = config;
    if (!emailHost || !emailUser || !emailPass) {
        logger.warn('Email not configured: EMAIL_HOST, EMAIL_USER, EMAIL_PASS required');
        return null;
    }
    transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort || 587,
        secure: emailPort === 465,
        auth: {
            user: emailUser,
            pass: emailPass
        }
    });
    return transporter;
}

/**
 * Send OTP email for admin forgot password.
 * @param {string} to - Recipient email
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<boolean>} true if sent, false if skipped/failed
 */
export async function sendAdminResetOtpEmail(to, otp) {
    const trans = getTransporter();
    if (!trans) {
        logger.warn('Admin OTP email skipped: SMTP not configured');
        return false;
    }
    const from = config.emailFrom || config.emailUser;
    const subject = 'Your password reset code – Ozayra Admin';
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 480px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111;">Password reset code</h2>
  <p>Use the code below to reset your admin password. It is valid for 10 minutes.</p>
  <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; background: #f5f5f5; padding: 12px 16px; border-radius: 8px;">${otp}</p>
  <p style="color: #666; font-size: 14px;">If you did not request this, you can ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #999; font-size: 12px;">Ozayra Admin</p>
</body>
</html>`;
    const text = `Your password reset code is: ${otp}. It is valid for 10 minutes. If you did not request this, ignore this email.`;

    try {
        await trans.sendMail({
            from: typeof from === 'string' && from.includes('<') ? from : `Ozayra <${from}>`,
            to,
            subject,
            text,
            html
        });
        logger.info(`Admin reset OTP email sent to ${to}`);
        return true;
    } catch (err) {
        logger.error(`Failed to send admin OTP email to ${to}:`, err.message);
        return false;
    }
}

/**
 * Send approval confirmation email to driver.
 * @param {string} to - Recipient email
 * @param {string} name - Driver's name
 * @returns {Promise<boolean>} true if sent, false if skipped/failed
 */
export async function sendDriverApprovalEmail(to, name) {
    const trans = getTransporter();
    if (!trans) {
        logger.warn('Driver approval email skipped: SMTP not configured');
        return false;
    }
    const from = config.emailFrom || config.emailUser;
    const subject = 'Your Driver Account is Approved! – Ozayra';
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 480px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #111;">Account Approved</h2>
  <p>Hi ${name},</p>
  <p>Great news! Your driver account on Ozayra has been approved by the administration.</p>
  <p>You can now log in to the driver app and start accepting rides.</p>
  <br/>
  <p>Safe driving!</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #999; font-size: 12px;">Ozayra Team</p>
</body>
</html>`;
    const text = `Hi ${name},\n\nGreat news! Your driver account on Ozayra has been approved by the administration. You can now log in to the driver app and start accepting rides.\n\nSafe driving!\nOzayra Team`;

    try {
        await trans.sendMail({
            from: typeof from === 'string' && from.includes('<') ? from : `Ozayra <${from}>`,
            to,
            subject,
            text,
            html
        });
        logger.info(`Driver approval email sent to ${to}`);
        return true;
    } catch (err) {
        logger.error(`Failed to send driver approval email to ${to}:`, err.message);
        return false;
    }
}
