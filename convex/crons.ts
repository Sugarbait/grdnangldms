
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check for expired timers every 5 minutes
crons.interval(
  "check expired timers",
  { minutes: 5 },
  internal.cronHandler.checkExpiredTimers
);

export default crons;
