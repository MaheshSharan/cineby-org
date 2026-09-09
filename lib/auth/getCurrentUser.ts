import { findValidSessionByToken, touchSessionActivity } from "@/lib/db/sessions";
import type { User } from "@/lib/db/types";

import { getSessionToken, type CookieRequest } from "./session";

export function getCurrentUser(req: CookieRequest): User | null {
  const token = getSessionToken(req);

  if (!token) {
    return null;
  }

  const session = findValidSessionByToken(token);

  if (!session) {
    return null;
  }

  touchSessionActivity(token, session.last_active_at);

  return {
    id: session.user_id,
    email: session.email,
    displayName: session.display_name,
    avatarUrl: session.avatar_url ?? null,
    createdAt: session.user_created_at,
    activeProfileId: session.active_profile_id,
  };
}
