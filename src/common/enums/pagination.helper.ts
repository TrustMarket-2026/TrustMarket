// ============================================================
//  Pagination Helper — Pagination des listes
//  Utilisé dans tous les modules qui retournent des listes
// ============================================================

/**
 * Calcule les paramètres skip/take pour Prisma
 *
 * @param page  - Numéro de page (commence à 1)
 * @param limit - Nombre d'éléments par page
 * @returns { skip, take } à passer directement à Prisma
 */
export function getPaginationParams(
  page: number = 1,
  limit: number = 10,
): { skip: number; take: number } {
  const safePage = Math.max(1, page);       // Minimum page 1
  const safeLimit = Math.min(100, limit);   // Maximum 100 par page

  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

/**
 * Construit la réponse paginée standard
 * Toutes les listes de l'API retournent ce format
 *
 * @param data  - Les données de la page actuelle
 * @param total - Nombre total d'éléments
 * @param page  - Page actuelle
 * @param limit - Éléments par page
 */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number = 1,
  limit: number = 10,
) {
  const lastPage = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,           // Total d'éléments
      page,            // Page actuelle
      limit,           // Éléments par page
      lastPage,        // Dernière page
      hasNextPage: page < lastPage,
      hasPreviousPage: page > 1,
    },
  };
}