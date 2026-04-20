
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const add = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    size: v.string(),
    type: v.string(),
    content: v.optional(v.string()),
    plaintext: v.optional(v.string()),
    audioStorageId: v.optional(v.id("_storage")),
    imageStorageId: v.optional(v.id("_storage")),
    documentStorageId: v.optional(v.id("_storage")),
    recipientIds: v.array(v.string()),
    addedDate: v.string(),
    isEncrypted: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      console.log("[FILES] Adding file:", {
        name: args.name,
        type: args.type,
        hasContent: !!args.content,
        hasPlaintext: !!args.plaintext,
        recipientIds: args.recipientIds,
      });

      const result = await ctx.db.insert("files", {
        userId: args.userId,
        name: args.name,
        size: args.size,
        type: args.type,
        content: args.content,
        plaintext: args.plaintext,
        audioStorageId: args.audioStorageId,
        imageStorageId: args.imageStorageId,
        documentStorageId: args.documentStorageId,
        recipientIds: args.recipientIds,
        addedDate: args.addedDate,
        isEncrypted: args.isEncrypted,
      });

      console.log("[FILES] File added successfully with ID:", result);
      return result;
    } catch (error: any) {
      console.error("[FILES] Error adding file:", error.message || error);
      throw error;
    }
  },
});

export const remove = mutation({
  args: { userId: v.id("users"), fileId: v.id("files") },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== args.userId) {
      throw new Error("File not found or access denied");
    }
    await ctx.db.delete(args.fileId);
  },
});

export const updateAccess = mutation({
  args: { userId: v.id("users"), fileId: v.id("files"), recipientIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== args.userId) {
      throw new Error("File not found or access denied");
    }
    await ctx.db.patch(args.fileId, { recipientIds: args.recipientIds });
  },
});

export const purge = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const f of files) await ctx.db.delete(f._id);
  },
});

export const updateAudioStorageId = mutation({
  args: { fileId: v.id("files"), audioStorageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, { audioStorageId: args.audioStorageId });
  },
});

export const updateDocumentStorageId = mutation({
  args: { fileId: v.id("files"), documentStorageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, { documentStorageId: args.documentStorageId });
  },
});

export const rename = mutation({
  args: { userId: v.id("users"), fileId: v.id("files"), newName: v.string() },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== args.userId) {
      throw new Error("File not found or access denied");
    }
    await ctx.db.patch(args.fileId, { name: args.newName });
  },
});

export const updateContent = mutation({
  args: {
    userId: v.id("users"),
    fileId: v.id("files"),
    content: v.string(),
    plaintext: v.string(),
    isEncrypted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== args.userId) {
      throw new Error("File not found or access denied");
    }
    await ctx.db.patch(args.fileId, {
      content: args.content,
      plaintext: args.plaintext,
      isEncrypted: args.isEncrypted,
    });
  },
});
