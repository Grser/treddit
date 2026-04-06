import type { Post } from "@/components/PostCard";

const now = new Date();

function minutesAgo(mins: number) {
  return new Date(now.getTime() - mins * 60 * 1000).toISOString();
}

export const DEMO_POSTS: Post[] = [
  {
    id: 1,
    user: 1,
    username: "demo_catlover",
    nickname: "Gatitos FTW",
    avatar_url: "/demo-reddit.png",
    description:
      "¿Ya vieron el último tráiler del juego de gatitos espaciales? \n¡Se ve increíble!",
    created_at: minutesAgo(12),
    mediaUrl: "/demo-x.png",
    likes: 132,
    comments: 18,
    reposts: 6,
    likedByMe: false,
    repostedByMe: false,
    views: 1200,
    hasPoll: false,
    reply_scope: 0,
    is_admin: false,
    is_verified: true,
  },
  {
    id: 2,
    user: 2,
    username: "techmaven",
    nickname: "Ana Tech",
    avatar_url: null,
    description:
      "Hoy probé un framework nuevo para APIs y me sorprendió lo rápido que genera scaffolding. ¿Les interesaría un tutorial?",
    created_at: minutesAgo(45),
    likes: 89,
    comments: 12,
    reposts: 3,
    likedByMe: true,
    repostedByMe: false,
    views: 860,
    hasPoll: true,
    reply_scope: 1,
    is_admin: false,
    is_verified: false,
  },
  {
    id: 3,
    user: 3,
    username: "treddit_admin",
    nickname: "Equipo Treddit",
    avatar_url: "/demo-reddit.png",
    description:
      "¡Bienvenido a Treddit! Este es un feed de demostración para que puedas explorar la interfaz mientras configuramos la base de datos.",
    created_at: minutesAgo(120),
    likes: 240,
    comments: 54,
    reposts: 21,
    likedByMe: false,
    repostedByMe: true,
    views: 4200,
    hasPoll: false,
    reply_scope: 0,
    is_admin: true,
    is_verified: true,
  },
];

export function getDemoPosts(limit: number) {
  return DEMO_POSTS.slice(0, Math.max(0, limit));
}
