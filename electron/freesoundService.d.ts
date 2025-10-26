import type { FreesoundSearchResult, FreesoundSearchParams, FreesoundSound } from '../src/types/freesound';
export declare class FreesoundService {
    private apiKey;
    private axiosInstance;
    constructor(apiKey: string);
    search(params: FreesoundSearchParams): Promise<FreesoundSearchResult>;
    getSound(soundId: number): Promise<FreesoundSound>;
    downloadPreview(previewUrl: string, outputPath: string): Promise<string>;
}
export declare function initializeFreesoundService(apiKey: string): FreesoundService;
export declare function getFreesoundService(): FreesoundService;
