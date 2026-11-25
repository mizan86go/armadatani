import { db } from './store.js';
import { uid } from './utils.js';

export async function favoriteIdsFor(userId) {
  if (!userId) return new Set();
  const favorites = await db.all('favorites');
  return new Set(favorites.filter((f) => f.userId === userId).map((f) => f.itemId));
}

/** Returns the new state (true = now favourited). */
export async function toggleFavorite(userId, unitId) {
  const favorites = await db.all('favorites');
  const existing = favorites.find((f) => f.userId === userId && f.itemId === unitId);
  if (existing) {
    await db.remove('favorites', existing.id);
    return false;
  }
  await db.insert('favorites', {
    id: uid('fav'),
    userId,
    itemId: unitId,
    createdAt: new Date().toISOString(),
  });
  return true;
}
