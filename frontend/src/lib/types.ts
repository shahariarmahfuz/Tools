export type AccessMode = "public_rw" | "public_read" | "private";

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface LiveEndpoint {
  id: number;
  slug: string;
  title: string;
  content: string;
  access_mode: AccessMode;
  owner_id: number;
  owner_username: string;
  is_owner: boolean;
  can_edit: boolean;
  active_count: number;
  updated_at: string;
  created_at: string;
}

export interface EndpointSnapshot {
  id: number;
  content: string;
  saved_by: string;
  created_at: string;
}

export interface PresenceViewer {
  client_id: string;
  name: string;
  is_typing: boolean;
}

export interface PresenceState {
  active_count: number;
  viewers: PresenceViewer[];
}
