export function estimatePostViews(input: { likes?: number; comments?: number; reposts?: number }) {
  const likes = Number(input.likes) || 0;
  const comments = Number(input.comments) || 0;
  const reposts = Number(input.reposts) || 0;

  return likes * 12 + comments * 8 + reposts * 15;
}
