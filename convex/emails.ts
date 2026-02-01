"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import nodemailer from "nodemailer";
import { Doc } from "./_generated/dataModel";

function getUserInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Main action to send notification emails with files
export const sendNotificationEmails = action({
  args: { timerId: v.id("timers") },
  handler: async (ctx, args) => {
    console.log("[sendNotificationEmails] Starting for timer:", args.timerId);

    const data = await ctx.runQuery(internal.emailHelpers.getTriggeredUserData, {
      timerId: args.timerId,
    });

    if (!data) {
      console.log("[sendNotificationEmails] No data found for timer:", args.timerId);
      return { success: false, error: "Timer or user not found" };
    }

    const { user, recipients, files } = data;

    console.log("[sendNotificationEmails] Retrieved data:", {
      userName: user.name,
      recipientCount: recipients.length,
      fileCount: files.length,
    });

    if (recipients.length === 0) {
      console.log("[sendNotificationEmails] No recipients for user");
      return { success: false, error: "No recipients configured" };
    }

    // Check SMTP configuration
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("[sendNotificationEmails] SMTP not fully configured");
      return { success: false, error: "SMTP not configured" };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 30000, // 30 second timeout for slow connections
      socketTimeout: 30000, // 30 second socket timeout
    });

    const results: { email: string; success: boolean; error?: string }[] = [];

    // Send email to each recipient
    for (const recipient of recipients) {
      const recipientIdString = recipient._id.toString();
      console.log(`[EMAIL] Recipient ID: ${recipientIdString} (type: ${typeof recipientIdString})`);
      console.log(`[EMAIL] All file recipientIds:`, files.map(f => ({ name: f.name, recipientIds: f.recipientIds })));

      const recipientFiles = files.filter((f: Doc<"files">) => {
        const matches = f.recipientIds.includes(recipientIdString);
        console.log(`[EMAIL] Checking file "${f.name}": recipientIds=${JSON.stringify(f.recipientIds)}, matches=${matches}`);
        return matches;
      });

      console.log(`[EMAIL] Processing ${recipient.name} (ID: ${recipientIdString}) with ${recipientFiles.length} files`);

      // Skip recipients with no files assigned
      if (recipientFiles.length === 0) {
        console.log(`[EMAIL] Skipping ${recipient.name} - no files assigned to this recipient`);
        continue;
      }

      // Collect all file data
      const images: Array<{ name: string; base64: string; mimeType: string; cid: string }> = [];
      const audios: Array<{ name: string; url: string }> = [];
      const documents: Array<{ name: string; url: string }> = [];
      const messages: Array<{ name: string; content: string }> = [];

      // Process each file
      for (const file of recipientFiles) {
        console.log(`[EMAIL] File: ${file.name}, audio=${!!file.audioStorageId}, image=${!!file.imageStorageId}, doc=${!!file.documentStorageId}, content=${!!file.content}`);

        // Images - embed as base64
        if (file.imageStorageId) {
          try {
            const blob = await ctx.storage.get(file.imageStorageId);
            if (blob) {
              const buffer = Buffer.from(await blob.arrayBuffer());
              const base64 = buffer.toString('base64');
              const mimeType = file.type || 'image/jpeg';
              const cid = `image_${file._id}@guardian`;

              images.push({ name: file.name, base64, mimeType, cid });
              console.log(`[EMAIL] Embedded image: ${file.name}`);
            }
          } catch (error: any) {
            console.error(`[EMAIL] Error embedding image: ${error.message}`);
          }
        }

        // Audio - get download URL
        if (file.audioStorageId) {
          try {
            const url = await ctx.storage.getUrl(file.audioStorageId);
            if (url) {
              audios.push({ name: file.name, url });
              console.log(`[EMAIL] Audio URL: ${file.name}`);
            }
          } catch (error: any) {
            console.error(`[EMAIL] Error getting audio URL: ${error.message}`);
          }
        }

        // Documents - get download URL
        if (file.documentStorageId) {
          try {
            const url = await ctx.storage.getUrl(file.documentStorageId);
            if (url) {
              documents.push({ name: file.name, url });
              console.log(`[EMAIL] Document URL: ${file.name}`);
            }
          } catch (error: any) {
            console.error(`[EMAIL] Error getting document URL: ${error.message}`);
          }
        }

        // Text messages - use plaintext for emails, fallback to content
        if (file.plaintext || file.content) {
          const messageContent = (file.plaintext || file.content) as string;
          messages.push({ name: file.name, content: messageContent });
          console.log(`[EMAIL] Text message: ${file.name}`);
        }
      }

      // Build HTML email
      const imagesHtml = images.length > 0 ? `
        <div style="margin: 20px 0; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <h3 style="color: #374151; margin-top: 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Images</h3>
          ${images.map((img) => `
            <div style="margin: 15px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; font-weight: 500; color: #374151; font-size: 14px;">${img.name}</p>
              <img src="data:${img.mimeType};base64,${img.base64}" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #ddd; display: block; margin: 0 auto;">
            </div>
          `).join('')}
        </div>
      ` : '';

      const audiosHtml = audios.length > 0 ? `
        <div style="margin: 20px 0; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <h3 style="color: #374151; margin-top: 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Audio Files</h3>
          ${audios.map((audio) => `
            <div style="margin: 10px 0;">
              <a href="${audio.url}" style="display: inline-block; background-color: #1754cf; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">Download ${audio.name}</a>
            </div>
          `).join('')}
        </div>
      ` : '';

      const documentsHtml = documents.length > 0 ? `
        <div style="margin: 20px 0; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <h3 style="color: #374151; margin-top: 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Documents</h3>
          ${documents.map((doc) => `
            <div style="margin: 10px 0;">
              <a href="${doc.url}" style="display: inline-block; background-color: #1754cf; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">Download ${doc.name}</a>
            </div>
          `).join('')}
        </div>
      ` : '';

      const messagesHtml = messages.length > 0 ? `
        <div style="margin: 20px 0; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <h3 style="color: #374151; margin-top: 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Messages</h3>
          ${messages.map((msg) => `
            <div style="margin: 10px 0; background: #f9fafb; border-left: 3px solid #1754cf; padding: 15px; border-radius: 4px;">
              <p style="margin: 0 0 8px 0; font-weight: bold; color: #374151; font-size: 14px;">${msg.name}</p>
              <p style="margin: 0; color: #4b5563; white-space: pre-wrap; word-wrap: break-word; font-size: 14px;">${msg.content}</p>
            </div>
          `).join('')}
        </div>
      ` : '';

      const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1754cf 0%, #0d3a8f 100%); color: white; padding: 40px 30px; text-align: center;">
      <img src="https://grdnangl.digitalac.app/images/grdnangl-full.png" alt="Guardian Angel DMS" style="max-width: 200px; margin: 0 auto 20px; display: block;">
      <p style="margin: 0; font-size: 18px; font-weight: 600;">Digital Legacy Notification</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 16px; margin-bottom: 20px;">Dear ${recipient.name},</p>

      <!-- User Info Box -->
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
          ${user.avatarUrl ? `
            <img src="${user.avatarUrl}" alt="${user.name}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid #1754cf; flex-shrink: 0;">
          ` : `
            <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #1754cf 0%, #0d3a8f 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; flex-shrink: 0;">${getUserInitials(user.name)}</div>
          `}
          <div>
            <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1f2937;">${user.name}</p>
            <p style="margin: 5px 0 0 0; font-size: 13px; color: #6b7280;">Has entrusted you with digital items</p>
          </div>
        </div>
        <p style="margin: 15px 0 0 0; font-size: 14px; color: #4b5563; border-top: 1px solid #e5e7eb; padding-top: 15px;">
          This message was sent because ${user.name} did not check in within their specified time period in the Guardian Angel DMS application.
        </p>
      </div>

      <!-- Messages -->
      ${messagesHtml}

      <!-- Images -->
      ${imagesHtml}

      <!-- Audio -->
      ${audiosHtml}

      <!-- Documents -->
      ${documentsHtml}

      <!-- Footer text -->
      <p style="margin-top: 30px; font-size: 13px; color: #dc2626; font-weight: bold;">
        This is an automated notification. Please treat this information with care and respect ${user.name}'s wishes.
      </p>
      <p style="font-size: 13px; color: #6b7280; margin-top: 15px;">
        If you believe you received this message in error, or if you need assistance accessing the items, please contact Guardian Angel DMS support.
      </p>
    </div>

    <!-- Bottom Footer -->
    <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 30px; text-align: center; font-size: 12px; color: #6b7280;">
      <p style="margin: 0;">Guardian Angel DMS - Your Digital Legacy</p>
      <p style="margin: 5px 0 0 0;">This is an automated message. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
      `;

      // Build text version
      const textEmail = `Dear ${recipient.name},

${user.name} has entrusted you with important digital items through Guardian Angel DMS.

This message was sent because ${user.name} did not check in within their specified time period in the Guardian Angel DMS application.

${messages.length > 0 ? `MESSAGES:\n${messages.map(m => `--- ${m.name} ---\n${m.content}`).join('\n\n')}\n\n` : ''}${images.length > 0 ? `IMAGES:\n${images.map(i => `- ${i.name}`).join('\n')}\n\n` : ''}${audios.length > 0 ? `AUDIO FILES:\n${audios.map(a => `- ${a.name}: ${a.url}`).join('\n')}\n\n` : ''}${documents.length > 0 ? `DOCUMENTS:\n${documents.map(d => `- ${d.name}: ${d.url}`).join('\n')}\n\n` : ''}This is an automated notification. Please treat this information with care.

- Guardian Angel DMS`;

      // Send email
      let sendSuccess = false;
      let lastError: any = null;
      
      // Retry logic: try up to 3 times with exponential backoff
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[EMAIL] Sending to ${recipient.email} (attempt ${attempt}/3)`);
          await transporter.sendMail({
            from: `"Guardian Angel DMS" <${process.env.SMTP_USER}>`,
            to: recipient.email,
            subject: `Guardian Angel DMS - Message from ${user.name}`,
            html: htmlEmail,
            text: textEmail,
          });

          results.push({ email: recipient.email, success: true });
          console.log(`[EMAIL] SUCCESS: Sent to ${recipient.email}`);
          sendSuccess = true;
          break;
        } catch (error: any) {
          lastError = error;
          const errorMsg = error?.message || error?.toString() || "Unknown error";
          console.error(`[EMAIL] FAILED attempt ${attempt}: ${recipient.email}: ${errorMsg}`);
          
          // If not last attempt, wait before retrying (exponential backoff)
          if (attempt < 3) {
            const waitTime = Math.pow(2, attempt - 1) * 2000; // 2s, 4s, 8s (longer waits)
            console.log(`[EMAIL] Retrying in ${waitTime}ms after delay...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      // If all retries failed, log the failure
      if (!sendSuccess) {
        const errorMsg = lastError?.message || lastError?.toString() || "Unknown error";
        console.error(`[EMAIL] FAILED after 3 attempts: ${recipient.email}: ${errorMsg}`);
        results.push({
          email: recipient.email,
          success: false,
          error: errorMsg || "Failed after 3 retry attempts",
        });
      }
    }

    // Mark emails as sent if at least one succeeded
    const anySuccess = results.some((r) => r.success);
    if (anySuccess) {
      await ctx.runMutation(internal.emailHelpers.markEmailsSent, {
        timerId: args.timerId,
      });
    }

    console.log("[sendNotificationEmails] Complete:", results);
    return { success: anySuccess, results };
  },
});

// Test email action
export const sendTestEmail = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<{ success: boolean; email?: string; error?: string }> => {
    const user: Doc<"users"> | null = await ctx.runQuery(internal.emailHelpers.getUserById, {
      userId: args.userId,
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 30000, // 30 second timeout for slow connections
      socketTimeout: 30000, // 30 second socket timeout
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1754cf 0%, #0d3a8f 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .logo { max-width: 200px; margin: 0 auto 20px; display: block; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; font-size: 14px; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
    .test-badge { background: #22c55e; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 12px; font-weight: bold; margin-bottom: 20px; }
    .message-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://grdnangl.digitalac.app/images/grdnangl-full.png" alt="Guardian Angel DMS" class="logo">
    <p>Email Test</p>
  </div>
  <div class="content">
    <div class="test-badge">TEST EMAIL</div>

    <p>Hi ${user.name},</p>

    <div class="message-box">
      <p>This is a test email from Guardian Angel DMS to confirm that email notifications are working correctly.</p>
      <p>When your timer expires and you haven't checked in, your recipients will receive a similar email with information about the files you've assigned to them.</p>
    </div>

    <p><strong>Email Configuration Status:</strong> Working</p>
    <p>Your recipients will be notified at: <strong>${user.email}</strong></p>
  </div>
  <div class="footer">
    <p>Guardian Angel DMS - Your Digital Legacy</p>
    <p>This is a test message. No action is required.</p>
  </div>
</body>
</html>
    `;

    try {
      await transporter.sendMail({
        from: `"Guardian Angel DMS" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: `Guardian Angel DMS - Test Email`,
        html: emailHtml,
        text: `Hi ${user.name},\n\nThis is a test email from Guardian Angel DMS to confirm that email notifications are working correctly.\n\nWhen your timer expires and you haven't checked in, your recipients will receive a similar email with information about the files you've assigned to them.\n\nEmail Configuration Status: Working\n\n- Guardian Angel DMS`,
      });

      console.log(`Test email sent successfully to ${user.email}`);
      return { success: true, email: user.email };
    } catch (error: any) {
      console.error(`Failed to send test email to ${user.email}:`, error);
      return { success: false, error: error.message };
    }
  },
});

// Remainder email action
const formatTimeRemaining = (seconds: number): string => {
  if (seconds >= 86400) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return hours > 0 ? `${days} day${days > 1 ? 's' : ''} and ${hours} hour${hours > 1 ? 's' : ''}` : `${days} day${days > 1 ? 's' : ''}`;
  } else if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}` : `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
};

export const sendReminderEmail = action({
  args: { timerId: v.id("timers") },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const data = await ctx.runQuery(internal.emailHelpers.getTriggeredUserData, {
      timerId: args.timerId,
    });

    if (!data) {
      console.log("No data found for timer:", args.timerId);
      return { success: false, error: "Timer or user not found" };
    }

    const { timer, user, recipients, files } = data;

    const now = Date.now();
    const elapsed = (now - timer.lastReset) / 1000;
    const remaining = Math.max(0, timer.durationSeconds - elapsed);
    const timeRemainingText = formatTimeRemaining(Math.floor(remaining));

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 30000, // 30 second timeout for slow connections
      socketTimeout: 30000, // 30 second socket timeout
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1754cf 0%, #0d3a8f 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .logo { max-width: 200px; margin: 0 auto 20px; display: block; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; font-size: 14px; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
    .reminder-badge { background: #1754cf; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 12px; font-weight: bold; margin-bottom: 20px; }
    .time-box { background: #dbeafe; border: 2px solid #1754cf; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
    .time-box h2 { color: #0d3a8f; margin: 0 0 5px 0; font-size: 28px; }
    .time-box p { color: #0c2956; margin: 0; font-size: 14px; }
    .message-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .warning { color: #DC2626; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://grdnangl.digitalac.app/images/grdnangl-full.png" alt="Guardian Angel DMS" class="logo">
    <p>Check-in Reminder</p>
  </div>
  <div class="content">
    <div class="reminder-badge">REMINDER</div>

    <p>Hi ${user.name},</p>

    <div class="time-box">
      <h2>${timeRemainingText}</h2>
      <p>remaining until your timer expires</p>
    </div>

    <div class="message-box">
      <p>This is a friendly reminder that your Guardian Angel DMS check-in timer is about to expire.</p>
      <p class="warning">If you don't check in before the timer runs out, your ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''} will be notified and receive access to your ${files.length} saved item${files.length !== 1 ? 's' : ''}.</p>
    </div>

    <p><strong>What to do:</strong></p>
    <ul>
      <li>Open Guardian Angel DMS</li>
      <li>Press the "I AM ALIVE!" button to reset your timer</li>
    </ul>

    <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">If you are unable to check in and want your recipients to be notified, simply ignore this reminder.</p>
  </div>
  <div class="footer">
    <p>Guardian Angel DMS - Your Digital Legacy</p>
    <p>This is an automated reminder. Please do not reply directly to this email.</p>
  </div>
</body>
</html>
    `;

    try {
      await transporter.sendMail({
        from: `"Guardian Angel DMS" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: `Guardian Angel DMS - Check-in Reminder (${timeRemainingText} remaining)`,
        html: emailHtml,
        text: `Hi ${user.name},\n\nThis is a friendly reminder that your Guardian Angel DMS check-in timer is about to expire.\n\nTime Remaining: ${timeRemainingText}\n\nIf you don't check in before the timer runs out, your ${recipients.length} recipient(s) will be notified and receive access to your ${files.length} saved item(s).\n\nWhat to do:\n- Open Guardian Angel DMS\n- Press the "I AM ALIVE!" button to reset your timer\n\nIf you are unable to check in and want your recipients to be notified, simply ignore this reminder.\n\n- Guardian Angel DMS`,
      });

      await ctx.runMutation(internal.emailHelpers.markReminderSent, {
        timerId: args.timerId,
      });

      console.log(`Reminder email sent successfully to ${user.email}`);
      return { success: true };
    } catch (error: any) {
      console.error(`Failed to send reminder email to ${user.email}:`, error);
      return { success: false, error: error.message };
    }
  },
});

type EmailResult = { success: boolean; error?: string };

export const triggerEmergencyEmails = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<EmailResult> => {
    console.log("[triggerEmergencyEmails] Starting for user:", args.userId);

    const timer = await ctx.runQuery(internal.emailHelpers.getUserTimer, {
      userId: args.userId,
    });

    if (!timer) {
      console.log("[triggerEmergencyEmails] No timer found for user:", args.userId);
      return { success: false, error: "No timer found" };
    }

    console.log("[triggerEmergencyEmails] Timer found:", {
      timerId: timer._id,
      emailsSentAt: timer.emailsSentAt,
      status: timer.status,
    });

    if (timer.emailsSentAt) {
      console.log("[triggerEmergencyEmails] Emails already sent for this timer cycle");
      return { success: false, error: "Emails already sent for this timer" };
    }

    const now = Date.now();
    const elapsed = (now - timer.lastReset) / 1000;
    const isExpired = elapsed >= timer.durationSeconds;
    const isTriggeredStatus = timer.status === "triggered";

    console.log("[triggerEmergencyEmails] Timer state:", {
      isExpired,
      isTriggeredStatus,
    });

    if (!isExpired && !isTriggeredStatus) {
      console.log("[triggerEmergencyEmails] Timer has not expired yet");
      return { success: false, error: "Timer has not expired" };
    }

    console.log("[triggerEmergencyEmails] Calling sendNotificationEmails...");
    try {
      const result: EmailResult = await ctx.runAction(api.emails.sendNotificationEmails, {
        timerId: timer._id,
      });
      console.log("[triggerEmergencyEmails] sendNotificationEmails result:", result);
      return result;
    } catch (error: any) {
      console.error("[triggerEmergencyEmails] Error calling sendNotificationEmails:", error);
      return { success: false, error: error.message || "Failed to send emails" };
    }
  },
});

export const checkAndSendReminder = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<{ success: boolean; message?: string; error?: string }> => {
    console.log("[checkAndSendReminder] Checking reminder for user:", args.userId);

    const timer = await ctx.runQuery(internal.emailHelpers.getTimerByUserId, {
      userId: args.userId,
    });

    if (!timer) {
      console.log("[checkAndSendReminder] No timer found for user:", args.userId);
      return { success: false, error: "Timer not found" };
    }

    if (!timer.reminderSeconds) {
      console.log("[checkAndSendReminder] No reminder configured");
      return { success: false, error: "No reminder configured" };
    }

    if (timer.reminderSentAt) {
      console.log("[checkAndSendReminder] Reminder already sent");
      return { success: false, error: "Reminder already sent" };
    }

    const elapsedSeconds = (Date.now() - timer.lastReset) / 1000;
    const remainingSeconds = Math.max(0, timer.durationSeconds - elapsedSeconds);
    const reminderTriggerSeconds = timer.durationSeconds - timer.reminderSeconds;

    console.log("[checkAndSendReminder] Timing:", {
      elapsedSeconds,
      remainingSeconds,
      reminderTriggerSeconds,
      shouldSend: elapsedSeconds >= reminderTriggerSeconds,
    });

    if (elapsedSeconds < reminderTriggerSeconds) {
      console.log("[checkAndSendReminder] Not time to send reminder yet");
      return { success: false, error: "Not time to send reminder yet" };
    }

    const user = await ctx.runQuery(internal.emailHelpers.getUserById, {
      userId: args.userId,
    });

    if (!user) {
      console.log("[checkAndSendReminder] User not found");
      return { success: false, error: "User not found" };
    }

    console.log("[checkAndSendReminder] Sending reminder to:", user.email);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 30000, // 30 second timeout for slow connections
      socketTimeout: 30000, // 30 second socket timeout
    });

    const minutesRemaining = Math.floor(remainingSeconds / 60);
    const hoursRemaining = Math.floor(remainingSeconds / 3600);
    const daysRemaining = Math.floor(remainingSeconds / 86400);

    let timeDisplay = `${Math.round(remainingSeconds)} seconds`;
    if (daysRemaining > 0) {
      timeDisplay = `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} and ${Math.floor((remainingSeconds % 86400) / 3600)} hour${Math.floor((remainingSeconds % 86400) / 3600) !== 1 ? 's' : ''}`;
    } else if (hoursRemaining > 0) {
      timeDisplay = `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''} and ${minutesRemaining % 60} minute${minutesRemaining % 60 !== 1 ? 's' : ''}`;
    } else if (minutesRemaining > 0) {
      timeDisplay = `${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}`;
    }

    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: user.email,
        subject: "⏰ Guardian Angel DMS: Check-in Reminder",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1754cf 0%, #667eea 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 32px;">⏰ Check-in Reminder</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Guardian Angel DMS</p>
            </div>

            <div style="background: #f6f6f8; padding: 40px; text-align: center;">
              <h2 style="color: #1754cf; font-size: 28px; margin: 0 0 20px 0;">
                ${timeDisplay} Remaining
              </h2>

              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Your check-in window is about to expire. Please verify that you're alive and well by pressing the "I AM ALIVE" button in your Guardian Angel dashboard.
              </p>

              <div style="background: white; border: 2px solid #1754cf; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <p style="color: #666; margin: 0; font-size: 14px;">
                  If you don't check in before the timer expires, your digital legacy files will be sent to your designated recipients.
                </p>
              </div>

              <a href="${process.env.VITE_APP_URL || 'https://guardian-angel-dms.app'}" style="display: inline-block; background: #1754cf; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">
                Go to Dashboard
              </a>
            </div>

            <div style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; color: #999; font-size: 12px;">
              <p style="margin: 0;">Guardian Angel DMS - Your Digital Legacy Management System</p>
              <p style="margin: 5px 0 0 0;">This is an automated reminder. Do not reply to this email.</p>
            </div>
          </div>
        `,
      });

      console.log("[checkAndSendReminder] Reminder email sent successfully");

      await ctx.runMutation(internal.emailHelpers.markReminderAsSent, {
        timerId: timer._id,
      });

      return { success: true, message: "Reminder email sent" };
    } catch (error: any) {
      console.error("[checkAndSendReminder] Error sending reminder:", error);
      return { success: false, error: error.message || "Failed to send reminder" };
    }
  },
});

export const sendCheckInAlertEmail = action({
  args: { timerId: v.id("timers"), recipients: v.array(v.object({
    _id: v.string(),
    name: v.string(),
    email: v.string(),
    checkInAuthToken: v.string(),
  })), userName: v.string() },
  handler: async (ctx, args) => {
    console.log("[sendCheckInAlertEmail] Starting for timer:", args.timerId);

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("[sendCheckInAlertEmail] SMTP not fully configured!");
      return { success: false, error: "SMTP not configured" };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 30000, // 30 second timeout for slow connections
      socketTimeout: 30000, // 30 second socket timeout
    });

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const recipient of args.recipients) {
      const checkInLink = `${process.env.VITE_APP_URL || 'https://grdnangl.digitalac.app'}/#/recipient-checkin?token=${recipient.checkInAuthToken}&userId=${args.timerId.split('"')[0]}&recipientId=${recipient._id}`;

      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: recipient.email,
          subject: `Action Needed: Help ${args.userName} Stay Connected`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Action Needed</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Guardian Angel DMS</p>
              </div>

              <div style="background: #f6f6f8; padding: 40px; text-align: center;">
                <h2 style="color: #DC2626; font-size: 24px; margin: 0 0 20px 0;">
                  Help ${args.userName} Stay Connected
                </h2>

                <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                  ${args.userName} has designated you as an emergency contact. Their check-in timer expires in 24 hours.
                </p>

                <div style="background: white; border: 2px solid #DC2626; border-radius: 8px; padding: 20px; margin: 30px 0;">
                  <p style="color: #666; margin: 0 0 15px 0; font-size: 14px;">
                    If you've confirmed they're alive and well, you can help keep their account active by clicking the button below.
                  </p>
                  <p style="color: #999; margin: 0; font-size: 12px; font-style: italic;">
                    Only click if you've personally verified they're okay.
                  </p>
                </div>

                <a href="${checkInLink}" style="display: inline-block; background: #10B981; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; font-size: 16px;">
                  Confirm They're Alive
                </a>
              </div>

              <div style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; color: #999; font-size: 12px;">
                <p style="margin: 0;">Guardian Angel DMS - Your Digital Legacy Management System</p>
                <p style="margin: 5px 0 0 0;">This is an automated request. Do not reply to this email.</p>
              </div>
            </div>
          `,
          text: `Help ${args.userName} Stay Connected\n\n${args.userName} has designated you as an emergency contact. Their check-in timer expires in 24 hours.\n\nIf you've confirmed they're alive and well, visit this link to confirm the check-in:\n${checkInLink}`,
        });

        console.log(`[sendCheckInAlertEmail] Email sent to ${recipient.email}`);
        results.push({ email: recipient.email, success: true });
      } catch (error: any) {
        console.error(`[sendCheckInAlertEmail] Error sending to ${recipient.email}:`, error);
        results.push({
          email: recipient.email,
          success: false,
          error: error.message || "Failed to send email",
        });
      }
    }

    if (results.some((r) => r.success)) {
      try {
        await ctx.runMutation(internal.emailHelpers.markCheckInAlertSent, {
          timerId: args.timerId,
        });
      } catch (error) {
        console.error("[sendCheckInAlertEmail] Error marking alert as sent:", error);
      }
    }

    return { success: results.some((r) => r.success), results };
  },
});

export const sendPasswordResetEmail = action({
  args: { email: v.string(), resetToken: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    console.log("[sendPasswordResetEmail] Sending password reset email to:", args.email);

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("[sendPasswordResetEmail] SMTP not fully configured!");
      return { success: false, error: "SMTP not configured" };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 30000, // 30 second timeout for slow connections
      socketTimeout: 30000, // 30 second socket timeout
    });

    const resetLink = `${process.env.VITE_SITE_URL || "https://grdnangl.digitalac.app"}/#/reset-password?token=${args.resetToken}&email=${encodeURIComponent(args.email)}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1754cf 0%, #0d3a8f 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .logo { max-width: 200px; margin: 0 auto 20px; display: block; }
    .header p { margin: 10px 0 0; opacity: 0.9; font-size: 14px; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .message-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .button { background: #1754cf; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold; margin: 20px 0; }
    .button:hover { background: #0d3a8f; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-radius: 0 0 12px 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; }
    .expiry { color: #6b7280; font-size: 12px; margin-top: 15px; }
    .token-box { background: #f3f4f6; padding: 15px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 12px; color: #374151; margin: 15px 0; }
    .warning { background: #dbeafe; border: 1px solid #1754cf; border-radius: 8px; padding: 15px; margin: 20px 0; color: #0c2956; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://grdnangl.digitalac.app/images/grdnangl-full.png" alt="Guardian Angel DMS" class="logo">
    <p>Reset Your Password</p>
  </div>
  <div class="content">
    <p>Hi,</p>

    <div class="message-box">
      <p>We received a request to reset the password for your Guardian Angel DMS account.</p>
      <p>Click the button below to set a new password. This link will expire in 1 hour.</p>
    </div>

    <p style="text-align: center;">
      <a href="${resetLink}" class="button">Reset Password</a>
    </p>

    <p style="color: #6b7280; font-size: 14px; text-align: center;">Or copy and paste this link in your browser:</p>
    <div class="token-box">${resetLink}</div>

    <div class="warning">
      <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your account remains secure.
    </div>

    <div class="expiry">
      <strong>This link expires in 1 hour.</strong> For security reasons, you'll need to request a new reset link if this one expires.
    </div>
  </div>
  <div class="footer">
    <p>Guardian Angel DMS - Your Digital Legacy</p>
    <p>This is an automated message. Please do not reply directly to this email.</p>
  </div>
</body>
</html>
    `;

    try {
      console.log(`[sendPasswordResetEmail] SMTP Config: host=${process.env.SMTP_HOST}, user=${process.env.SMTP_USER}, port=${process.env.SMTP_PORT}`);
      console.log(`[sendPasswordResetEmail] Attempting to send to: ${args.email}`);
      console.log(`[sendPasswordResetEmail] Reset link: ${resetLink}`);

      const info = await transporter.sendMail({
        from: `"Guardian Angel DMS" <${process.env.SMTP_USER}>`,
        to: args.email,
        subject: "Reset your Guardian Angel DMS password",
        html: emailHtml,
        text: `Hi,\n\nWe received a request to reset the password for your Guardian Angel DMS account.\n\nClick the link below to set a new password. This link will expire in 1 hour.\n\n${resetLink}\n\nIf you didn't request a password reset, please ignore this email. Your account remains secure.\n\n- Guardian Angel DMS`,
      });

      console.log(`[sendPasswordResetEmail] Email sent successfully to ${args.email}`);
      console.log(`[sendPasswordResetEmail] Message ID: ${info.messageId}`);
      return { success: true };
    } catch (error: any) {
      console.error(`[sendPasswordResetEmail] Failed to send email to ${args.email}:`, error.message);
      console.error(`[sendPasswordResetEmail] Full error:`, error);
      return { success: false, error: error.message };
    }
  },
});

export const sendVerificationEmail = action({
  args: { userId: v.id("users"), email: v.string(), verificationToken: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    console.log("[sendVerificationEmail] Sending verification email to:", args.email);

    const user = await ctx.runQuery(internal.emailHelpers.getUserById, {
      userId: args.userId,
    });

    if (!user) {
      console.error("[sendVerificationEmail] User not found:", args.userId);
      return { success: false, error: "User not found" };
    }

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("[sendVerificationEmail] SMTP not fully configured!");
      return { success: false, error: "SMTP not configured" };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 30000, // 30 second timeout for slow connections
      socketTimeout: 30000, // 30 second socket timeout
    });

    const verificationLink = `${process.env.VITE_SITE_URL || "https://grdnangl.digitalac.app"}/#/verify-email?token=${args.verificationToken}&email=${encodeURIComponent(args.email)}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1754cf 0%, #0d3a8f 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .logo { max-width: 200px; margin: 0 auto 20px; display: block; }
    .header p { margin: 10px 0 0; opacity: 0.9; font-size: 14px; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .message-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .button { background: #1754cf; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold; margin: 20px 0; }
    .button:hover { background: #0d3a8f; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-radius: 0 0 12px 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; }
    .expiry { color: #6b7280; font-size: 12px; margin-top: 15px; }
    .token-box { background: #f3f4f6; padding: 15px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 12px; color: #374151; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://grdnangl.digitalac.app/images/grdnangl-full.png" alt="Guardian Angel DMS" class="logo">
    <p>Verify Your Email Address</p>
  </div>
  <div class="content">
    <p>Hi ${user.name},</p>

    <div class="message-box">
      <p>Welcome to Guardian Angel DMS! We're excited to have you on board.</p>
      <p>Before you can start using your secure digital legacy vault, we need you to verify that this email address belongs to you.</p>
    </div>

    <p style="text-align: center;">
      <a href="${verificationLink}" class="button">Verify Email Address</a>
    </p>

    <p style="color: #6b7280; font-size: 14px; text-align: center;">Or copy and paste this link in your browser:</p>
    <div class="token-box">${verificationLink}</div>

    <div class="expiry">
      <strong>This link expires in 24 hours.</strong> If you didn't create this account, please ignore this email.
    </div>

    <p style="margin-top: 30px; font-size: 14px;">
      Once verified, you'll be able to set up multi-factor authentication and start building your digital legacy protection plan.
    </p>
  </div>
  <div class="footer">
    <p>Guardian Angel DMS - Your Digital Legacy</p>
    <p>This is an automated message. Please do not reply directly to this email.</p>
  </div>
</body>
</html>
    `;

    try {
      await transporter.sendMail({
        from: `"Guardian Angel DMS" <${process.env.SMTP_USER}>`,
        to: args.email,
        subject: "Verify your Guardian Angel DMS account",
        html: emailHtml,
        text: `Hi ${user.name},\n\nWelcome to Guardian Angel DMS! Please verify your email address by visiting this link:\n\n${verificationLink}\n\nThis link expires in 24 hours.\n\nIf you didn't create this account, please ignore this email.\n\n- Guardian Angel DMS`,
      });

      console.log(`[sendVerificationEmail] Email sent successfully to ${args.email}`);
      return { success: true };
    } catch (error: any) {
      console.error(`[sendVerificationEmail] Failed to send email to ${args.email}:`, error);
      return { success: false, error: error.message };
    }
  },
});
