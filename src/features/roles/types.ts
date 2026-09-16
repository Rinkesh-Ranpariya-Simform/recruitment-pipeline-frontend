/**
 * The client's copy of the backend role contract. Nothing is shared by import
 * between the two sides, so a change to the role shape, the status enum or the
 * pagination envelope has to be made here as well.
 *
 * `Role` here is a job requisition. A *user's* role is `UserRole`, in
 * `features/auth/types.ts`.
 */

export type RoleStatus = 'OPEN' | 'CLOSED';

/**
 * Every field the API returns. A role references no person — no hiring manager,
 * creator or assignee — so there is nothing to display or set.
 */
export interface Role {
  id: number;
  title: string;
  description: string;
  status: RoleStatus;
  createdAt: string;
  updatedAt: string;
}

/** The list envelope. The pager renders the server's `totalPages` as given. */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** `GET /api/roles` — 200. */
export interface RolesListResponse {
  roles: Array<Role>;
  pagination: Pagination;
}

/** `GET /api/roles/:roleId` — 200, and the body of both writes. */
export interface RoleResponse {
  role: Role;
}
