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
  serverUrl: string; // 保留向后兼容，默认使用第一个地址
  serverUrlInternal?: string; // 内网地址，如 http://192.168.1.10:8096
  serverUrlExternal?: string; // 外网地址，如 https://emby.example.com
  apiKey: string;
  userId?: string;
}

export interface NotificationConfig {
  telegramBotToken?: string;
  telegramChatId?: string;
  emailEnabled?: boolean;
  emailSmtpServer?: string;
  emailSmtpPort?: number;
  emailSender?: string;
  emailPassword?: string;
  emailRecipient?: string;
  // MoviePilot Config
  moviePilotUrl?: string;
  moviePilotToken?: string;
  moviePilotUsername?: string;
  moviePilotPassword?: string;
  moviePilotSubscribeUser?: string; // 订阅时使用的用户名
}

export interface EmbyUser {
  Id: string;
  Name: string;
  HasPassword?: boolean;
  PrimaryImageTag?: string;
  Policy?: {
    IsAdministrator: boolean;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: EmbyUser | null;
  serverUrl: string;
  accessToken: string;
  isAdmin: boolean;
  isGuest: boolean;
}

export interface RequestItem {
  id: number;
  title: string;
  year: string;
  mediaType: 'movie' | 'tv';
  posterUrl: string | null;
  backdropUrl?: string | null;
  overview: string;
  requestDate: string;
  requestedBy: string;
  requestedByAvatar?: string;
  status: 'pending' | 'completed' | 'rejected' | 'processing';
  completedAt?: string;
  
  // New fields
  resolutionPreference?: 'Any' | '4K' | '1080p' | '720p';
  notes?: string;
  seasonsRequested?: number[]; // For TV shows, maybe specific seasons?
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
