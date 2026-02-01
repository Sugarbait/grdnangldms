"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// Action to generate an upload URL for client-side file uploads
// This is the recommended pattern for Convex file uploads:
// 1. Client calls this action to get an upload URL
// 2. Client uploads directly to that URL from the browser
// 3. Client receives storageId and saves it to the database
export const generateUploadUrl = action({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Action to get preview URL for files (images, etc.)
export const getFileUrl = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    try {
      const url = await ctx.storage.getUrl(args.storageId);
      return url;
    } catch (error) {
      console.error(`[FILE] Failed to get URL for file ${args.storageId}:`, error);
      return null;
    }
  },
});

// Action to get audio file for email attachment
export const getAudioFileBuffer = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    try {
      const blob = await ctx.storage.get(args.storageId);
      if (!blob) {
        console.error(`[FILE] Audio file not found in storage: ${args.storageId}`);
        return null;
      }

      // Convert Blob to Buffer for nodemailer
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(`[FILE] Retrieved audio file: ${args.storageId}, size: ${buffer.length} bytes`);
      return buffer;
    } catch (error) {
      console.error(`[FILE] Failed to retrieve audio file ${args.storageId}:`, error);
      return null;
    }
  },
});
