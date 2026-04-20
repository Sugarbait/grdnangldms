"use node";

import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// This function is called by the cron job to check for expired timers and send reminders
export const checkExpiredTimers = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number; reminders: number; checkInAlerts: number; trialsExpiring: number; trialsExpired: number }> => {
    console.log("Checking for expired timers, check-in alerts, reminders, and trial subscriptions...");

    // Phase 0: Check for trial subscriptions expiring soon and expired trials
    console.log("Phase 0: Checking trial subscriptions...");

    const trialsExpiringInOneHour = await ctx.runQuery(internal.emailHelpers.getTrialsExpiringInOneHour);
    console.log(`Found ${trialsExpiringInOneHour.length} trial(s) expiring in the next hour`);

    let trialsExpiringCount = 0;
    for (const { subscription, user } of trialsExpiringInOneHour) {
      if (!user) continue;

      try {
        // CRITICAL: Mark as sent BEFORE sending to prevent duplicate emails from cron overlap
        await ctx.runMutation(internal.emailHelpers.markTrialExpiringEmailSent, {
          subscriptionId: subscription._id,
        });

        const result = await ctx.runAction(api.emails.sendTrialExpiringEmail, {
          userId: subscription.userId,
          userName: user.name,
          userEmail: user.email,
          expiresAt: subscription.trialEndsAt,
        });

        if (result.success) {
          trialsExpiringCount++;
          console.log(`Sent trial expiring email to ${user.email}`);
        } else {
          // Clear the sent flag so it can retry on next cron cycle
          await ctx.runMutation(internal.emailHelpers.clearTrialExpiringEmailSent, {
            subscriptionId: subscription._id,
          });
        }
      } catch (error) {
        console.error(`Failed to send trial expiring email for user ${subscription.userId}:`, error);
        // Clear the sent flag so it can retry on next cron cycle
        await ctx.runMutation(internal.emailHelpers.clearTrialExpiringEmailSent, {
          subscriptionId: subscription._id,
        });
      }
    }

    // Check for expired trials
    const expiredTrials = await ctx.runQuery(internal.emailHelpers.getExpiredTrials);
    console.log(`Found ${expiredTrials.length} expired trial(s)`);

    let trialsExpiredCount = 0;
    for (const { subscription, user } of expiredTrials) {
      if (!user) continue;

      // Skip if already marked as expired
      if (subscription.status === "trial_expired") continue;

      try {
        // Update subscription status to trial_expired
        await ctx.runMutation(internal.emailHelpers.markTrialExpirySent, {
          subscriptionId: subscription._id,
        });

        // Send trial expired email
        const result = await ctx.runAction(api.emails.sendTrialExpiredEmail, {
          userId: subscription.userId,
          userName: user.name,
          userEmail: user.email,
        });

        if (result.success) {
          trialsExpiredCount++;
          console.log(`Sent trial expired email to ${user.email}`);
        }
      } catch (error) {
        console.error(`Failed to process expired trial for user ${subscription.userId}:`, error);
      }
    }

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
          userId: group.timer.userId,
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
    const remindersToSend: Array<{ timer: Doc<"timers">; reminderThreshold: number }> = await ctx.runQuery(internal.emailHelpers.getTimersNeedingReminder);

    console.log(`Found ${remindersToSend.length} reminder(s) to send`);

    // Send reminder emails
    for (const { timer, reminderThreshold } of remindersToSend) {
      console.log(`Sending reminder for timer ${timer._id} (threshold: ${reminderThreshold}s) for user ${timer.userId}`);

      try {
        const result = await ctx.runAction(api.emails.sendReminderEmail, {
          timerId: timer._id,
          reminderThreshold,
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

    return {
      processed: expiredTimers.length,
      reminders: remindersToSend.length,
      checkInAlerts: checkInAlertCount,
      trialsExpiring: trialsExpiringCount,
      trialsExpired: trialsExpiredCount,
    };
  },
});
