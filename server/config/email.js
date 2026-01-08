import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

export const sendEmail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Logistics App" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });
        console.log('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email error:', error);
        return { success: false, error: error.message };
    }
};

export const sendCheckpointNotification = async (email, checkpoint, shipmentId) => {
    const subject = `Checkpoint Update - Shipment #${shipmentId}`;
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">📦 Checkpoint Update</h1>
      </div>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Your shipment has reached a new checkpoint!</p>
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>Shipment ID:</strong> ${shipmentId}</p>
          <p><strong>Location:</strong> ${checkpoint.location}</p>
          <p><strong>Status:</strong> ${checkpoint.status}</p>
          <p><strong>Time:</strong> ${new Date(checkpoint.timestamp).toLocaleString()}</p>
          <p><strong>Transporter:</strong> ${checkpoint.transporterName || 'N/A'}</p>
        </div>
        <p style="color: #666; font-size: 14px;">Track your shipment in real-time on our platform.</p>
      </div>
    </div>
  `;
    return sendEmail(email, subject, html);
};

export default transporter;
