export interface ElevenLabsConfig {
    apiKey: string;
    defaultDuration?: number;
}
export interface GenerationOptions {
    prompt: string;
    duration?: number;
    outputPath: string;
}
export interface GenerationResult {
    success: boolean;
    filePath?: string;
    duration?: number;
    creditsUsed?: number;
    error?: string;
}
export declare function generateSoundEffect(config: ElevenLabsConfig, options: GenerationOptions): Promise<GenerationResult>;
export declare function validateApiKey(apiKey: string): Promise<boolean>;
export declare function getRemainingCredits(apiKey: string): Promise<number | null>;
