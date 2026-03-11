/**
 * Playlist types – reading, watch, game, music lists for classes
 */

export type PlaylistType = "reading" | "watch" | "game" | "music";

export type PlaylistItemRequirement = "mandatory" | "recommended";

export type PlaylistProgressStatus = "todo" | "in_progress" | "done";

export interface Playlist {
  id: string;
  classId: string;
  moduleId?: string;
  ownerId: string;
  type: PlaylistType;
  name: string;
  description?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  title: string;
  subtype?: string;
  author?: string;
  link?: string;
  notes?: string;
  requirement: PlaylistItemRequirement;
  order: number;
}

export interface PlaylistItemProgress {
  playlistId: string;
  playlistItemId: string;
  classId: string;
  status: PlaylistProgressStatus;
  addedToDoAt?: number;
  updatedAt: number;
}
