"use node";

import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// This function is called by the cron job to check for expired timers and send reminders
export const checkExpiredTimers = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number; reminders: number; checkInAlerts: number }> => {
    console.log("Checking for expired timers, check-in alerts, and reminders...");

    // Phase 1: Check for authorized recipients needing check-in alerts
    const recipientsNeedingAlert = await ctx.runQuery(internal.emailHelpers.getAuthorizedRecipientsNeedingAlert);

    console.log(`Found ${recipientsNeedingAlert.length} group(s) of authorized recipients needing alert`);

    let checkInAlertCount = 0;
    for (const group of recipientsNeedingAlert) {
      console.log(`Sending check-in alerts for timer ${group.timer._id} to ${group.recipients.length} recipient(s)`);

      try {
        // Extract user ID from timer (need to construct the userId)
        const recipientEmails = group.recipients.map((r: any) => ({
          _id: r._id,
          name: r.name,
          email: r.email,
          checkInAuthToken: r.checkInAuthToken,
        }));

        const result = await ctx.runAction(api.emails.sendCheckInAlertEmail, {
          timerId: group.timer._id,
          recipients: recipientEmails,
          userName: group.user.name,
        });

        if (result.success) {
          checkInAlertCount++;
        }
        console.log(`Check-in alert send result for timer ${group.timer._id}:`, result);
      } catch (error) {
        console.error(`Failed to send check-in alerts for timer ${group.timer._id}:`, error);
      }
    }

    // Phase 2: Check for timers needing reminder emails
    const timersNeedingReminder: Doc<"timers">[] = await ctx.runQuery(internal.emailHelpers.getTimersNeedingReminder);

    console.log(`Found ${timersNeedingReminder.length} timer(s) needing reminder`);

    // Send reminder emails
    for (const timer of timersNeedingReminder) {
      console.log(`Sending reminder for timer ${timer._id} for user ${timer.userId}`);

      try {
        const result = await ctx.runAction(api.emails.sendReminderEmail, {
          timerId: timer._id,
        });

        console.log(`Reminder send result for timer ${timer._id}:`, result);
      } catch (error) {
        console.error(`Failed to send reminder for timer ${timer._id}:`, error);
      }
    }

    // Phase 3: Get all expired timers that haven't had emails sent
    const expiredTimers: Doc<"timers">[] = await ctx.runQuery(internal.emailHelpers.getExpiredTimers);

    console.log(`Found ${expiredTimers.length} expired timer(s) needing notification`);

    // Send notification emails for each expired timer
    for (const timer of expiredTimers) {
      console.log(`Processing expired timer ${timer._id} for user ${timer.userId}`);

      try {
        const result = await ctx.runAction(api.emails.sendNotificationEmails, {
          timerId: timer._id,
        });

        console.log(`Email send result for timer ${timer._id}:`, result);
      } catch (error) {
        console.error(`Failed to process timer ${timer._id}:`, error);
      }
    }

    return { processed: expiredTimers.length, reminders: timersNeedingReminder.length, checkInAlerts: checkInAlertCount };
  },
});
