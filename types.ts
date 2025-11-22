export interface Episode {
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  episode_number: number;
  vote_average: number;
  runtime: number;
}

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
  air_date: string;
}

export interface MediaItem {
  id: number;
  title: string;
  subtitle: string;
  overview: string;
  type: string; // '电影' | '剧集'
  mediaType: 'movie' | 'tv';
  platform: string | null;
  hasProvider: boolean;
  providerRegion: string;
  status: 'streaming' | 'released' | 'pending';
  badgeLabel: string;
  badgeColorClass?: string; // Added specific color class for brands
  
  // Date Info
  releaseDate: string; // Main display date
  releaseDates?: {
      theatrical?: string;
      digital?: string;
      physical?: string;
  };
  
  year: string;
  region: string;
  voteAverage: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  posterColor: string;
  posterText: string;
  // Details populated later
  genres?: { id: number; name: string }[];
  runtime?: number;
  cast?: { id: number; name: string; character: string; profile_path: string | null }[];
  videos?: { key: string; name: string; type: string }[];
  collectionId?: number; // For movie collections
  collectionName?: string;
  
  // TV Specific
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  seasons?: Season[];
  lastEpisodeToAir?: Episode;
  nextEpisodeToAir?: Episode;
}

export interface LogEntry {
  time: string;
  msg: string;
  highlight?: boolean;
}

export interface FilterState {
  type: string;
  region: string;
  platform: string;
  year: string;
  sort: string;
}

export interface EmbyConfig {
  serverUrl: string;
  apiKey: string;
  userId?: string; // Optional, if we want to check watch status later, but for library presence, admin key is usually enough or just recursive query
}

export interface EmbyItem {
  Id: string;
  Name: string;
  Type: string;
  ProviderIds?: {
    Tmdb?: string;
    Imdb?: string;
  };
  UserData?: {
    Played: boolean;
  };
  // For Episodes
  SeriesId?: string;
  ParentIndexNumber?: number; // Season Number
  IndexNumber?: number; // Episode Number
}
