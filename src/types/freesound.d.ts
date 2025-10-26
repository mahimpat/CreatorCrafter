export interface FreesoundToken {
    access_token: string;
    scope: string;
    expires_in: number;
    refresh_token: string;
    token_type: string;
}
export interface FreesoundUser {
    username: string;
    about: string;
    home_page: string;
    avatar: {
        small: string;
        medium: string;
        large: string;
    };
    date_joined: string;
    num_sounds: number;
    num_packs: number;
    num_posts: number;
    num_comments: number;
}
export interface FreesoundSound {
    id: number;
    name: string;
    tags: string[];
    description: string;
    username: string;
    created: string;
    license: string;
    type: string;
    channels: number;
    filesize: number;
    bitrate: number;
    bitdepth: number;
    duration: number;
    samplerate: number;
    download: string;
    previews: {
        'preview-hq-mp3': string;
        'preview-hq-ogg': string;
        'preview-lq-mp3': string;
        'preview-lq-ogg': string;
    };
    images: {
        waveform_m: string;
        waveform_l: string;
        spectral_m: string;
        spectral_l: string;
    };
    num_downloads: number;
    avg_rating: number;
    num_ratings: number;
    comment: string;
    pack?: string;
    url: string;
}
export interface FreesoundSearchResult {
    count: number;
    next: string | null;
    previous: string | null;
    results: FreesoundSound[];
}
export interface FreesoundSearchParams {
    query?: string;
    filter?: string;
    sort?: 'score' | 'duration_desc' | 'duration_asc' | 'created_desc' | 'created_asc' | 'downloads_desc' | 'downloads_asc' | 'rating_desc' | 'rating_asc';
    group_by_pack?: 0 | 1;
    page?: number;
    page_size?: number;
    fields?: string;
    descriptors?: string;
    normalized?: 0 | 1;
}
export interface FreesoundConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}
export interface FreesoundAuthState {
    isAuthenticated: boolean;
    token: FreesoundToken | null;
    user: FreesoundUser | null;
    error: string | null;
}
