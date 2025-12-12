export type KitsuSeriesResult = {
  id: string;
  slug: string | null;
  canonicalTitle: string | null;
  titles: Record<string, string>;
  synopsis: string | null;
  startDate: string | null;
  endDate: string | null;
  episodeCount: number | null;
  status: string | null;
  subtype: string | null;
  ageRating: string | null;
  ageRatingGuide: string | null;
  posterImage: string | null;
  coverImage: string | null;
};
