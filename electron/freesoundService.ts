import axios, { AxiosInstance } from 'axios'
import * as fs from 'fs/promises'
import type {
  FreesoundSearchResult,
  FreesoundSearchParams,
  FreesoundSound
} from '../src/types/freesound'

const FREESOUND_API_BASE = 'https://freesound.org/apiv2'

export class FreesoundService {
  private apiKey: string
  private axiosInstance: AxiosInstance

  constructor(apiKey: string) {
    this.apiKey = apiKey
    console.log('FreeSound service initialized with API key')

    this.axiosInstance = axios.create({
      baseURL: FREESOUND_API_BASE,
      timeout: 30000,
    })
  }

  // Search for sounds using API key
  async search(params: FreesoundSearchParams): Promise<FreesoundSearchResult> {
    console.log('Searching FreeSound:', params.query)

    const response = await this.axiosInstance.get('/search/text/', {
      params: {
        ...params,
        token: this.apiKey
      }
    })

    console.log(`Found ${response.data.count} results`)
    return response.data
  }

  // Get sound details by ID
  async getSound(soundId: number): Promise<FreesoundSound> {
    const response = await this.axiosInstance.get(`/sounds/${soundId}/`, {
      params: {
        token: this.apiKey
      }
    })

    return response.data
  }

  // Download preview (high-quality MP3/OGG - no auth needed)
  async downloadPreview(previewUrl: string, outputPath: string): Promise<string> {
    console.log('Downloading preview from:', previewUrl)

    const response = await axios.get(previewUrl, {
      responseType: 'arraybuffer'
    })

    await fs.writeFile(outputPath, Buffer.from(response.data))
    console.log('Preview downloaded to:', outputPath)
    return outputPath
  }
}

// Singleton instance
let freesoundService: FreesoundService | null = null

export function initializeFreesoundService(apiKey: string) {
  freesoundService = new FreesoundService(apiKey)
  return freesoundService
}

export function getFreesoundService(): FreesoundService {
  if (!freesoundService) {
    throw new Error('FreesoundService not initialized. Make sure FREESOUND_CLIENT_ID is set in .env')
  }
  return freesoundService
}
