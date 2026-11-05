import { parseProfileGenres, type ProfileRow } from "@/lib/db/profiles";

/** The profile fields the browser may see. Never includes the PIN hash, only whether a PIN is set. */
export interface PublicProfile {
  id: number;
  name: string;
  avatarUrl: string;
  hasPin: boolean;
  movieGenres: string[];
  tvGenres: string[];
}

export function toPublicProfile(profile: ProfileRow): PublicProfile {
  return {
    id: profile.id,
    name: profile.name,
    avatarUrl: profile.avatar_url,
    hasPin: Boolean(profile.pin_hash),
    movieGenres: parseProfileGenres(profile.movie_genres),
    tvGenres: parseProfileGenres(profile.tv_genres),
  };
}
