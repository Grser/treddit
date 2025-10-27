import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(3).max(32),
  nickname: z.string().min(1).max(80),
  email: z.string().email().max(191),
  password: z.string().min(6).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const createPostSchema = z.object({
  description: z.string().max(2000).optional().nullable(),
  mediaUrl: z.string().url().max(512).optional().nullable(),
});

export const createCommentSchema = z.object({
  postId: z.coerce.number().int().positive(),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  text: z.string().min(1).max(2000),
});

export const followSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

export const likePostSchema = z.object({
  postId: z.coerce.number().int().positive(),
});

export const likeCommentSchema = z.object({
  commentId: z.coerce.number().int().positive(),
});
