import { app, BrowserWindow, ipcMain, shell } from 'electron'
import axios, { AxiosInstance } from 'axios'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as http from 'http'
import type {
  FreesoundToken,
  FreesoundUser,
  FreesoundSearchResult,
  FreesoundSearchParams,
  FreesoundSound
} from '../src/types/freesound'

const FREESOUND_API_BASE = 'https://freesound.org/apiv2'
const TOKEN_STORAGE_PATH = path.join(app.getPath('userData'), 'freesound-token.json')

export class FreesoundService {
  private clientId: string
  private clientSecret: string
  private redirectUri: string
  private token: FreesoundToken | null = null
  private axiosInstance: AxiosInstance
  private authServer: http.Server | null = null

  constructor(clientId: string, clientSecret: string, redirectUri: string = 'http://localhost:3000/freesound/callback') {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.redirectUri = redirectUri

    this.axiosInstance = axios.create({
      baseURL: FREESOUND_API_BASE,
      timeout: 30000,
    })

    // Load saved token on initialization
    this.loadToken()
  }

  // Save token to disk
  private async saveToken() {
    if (this.token) {
      try {
        await fs.writeFile(TOKEN_STORAGE_PATH, JSON.stringify(this.token), 'utf-8')
      } catch (error) {
        console.error('Failed to save FreeSound token:', error)
      }
    }
  }

  // Load token from disk
  private async loadToken() {
    try {
      const data = await fs.readFile(TOKEN_STORAGE_PATH, 'utf-8')
      this.token = JSON.parse(data)
      console.log('FreeSound token loaded from storage')
    } catch (error) {
      // Token file doesn't exist or is invalid
      this.token = null
    }
  }

  // Clear stored token
  async clearToken() {
    this.token = null
    try {
      await fs.unlink(TOKEN_STORAGE_PATH)
    } catch (error) {
      // File might not exist
    }
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    return this.token !== null && this.token.access_token !== null
  }

  // Get current token
  getToken(): FreesoundToken | null {
    return this.token
  }

  // Start OAuth2 authorization flow
  async authorize(): Promise<FreesoundToken> {
    return new Promise((resolve, reject) => {
      const state = Math.random().toString(36).substring(7)
      const authUrl = `${FREESOUND_API_BASE}/oauth2/authorize/?` +
        `client_id=${this.clientId}&` +
        `response_type=code&` +
        `state=${state}`

      // Create local server to handle OAuth callback
      this.authServer = http.createServer(async (req, res) => {
        if (req.url?.startsWith('/freesound/callback')) {
          const url = new URL(req.url, `http://localhost:3000`)
          const code = url.searchParams.get('code')
          const returnedState = url.searchParams.get('state')
          const error = url.searchParams.get('error')

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end('<html><body><h1>Authorization Failed</h1><p>You can close this window.</p></body></html>')
            this.authServer?.close()
            reject(new Error(`Authorization failed: ${error}`))
            return
          }

          if (code && returnedState === state) {
            try {
              // Exchange code for token
              const token = await this.exchangeCodeForToken(code)

              res.writeHead(200, { 'Content-Type': 'text/html' })
              res.end('<html><body><h1>Authorization Successful!</h1><p>You can close this window and return to the app.</p></body></html>')

              this.authServer?.close()
              resolve(token)
            } catch (err) {
              res.writeHead(200, { 'Content-Type': 'text/html' })
              res.end('<html><body><h1>Authorization Failed</h1><p>Failed to exchange code for token.</p></body></html>')
              this.authServer?.close()
              reject(err)
            }
          } else {
            res.writeHead(400, { 'Content-Type': 'text/html' })
            res.end('<html><body><h1>Invalid Request</h1><p>State mismatch or missing code.</p></body></html>')
            this.authServer?.close()
            reject(new Error('Invalid OAuth callback'))
          }
        }
      })

      this.authServer.listen(3000, () => {
        console.log('OAuth callback server running on http://localhost:3000')
        // Open authorization URL in default browser
        shell.openExternal(authUrl)
      })

      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.authServer) {
          this.authServer.close()
          reject(new Error('Authorization timeout'))
        }
      }, 300000)
    })
  }

  // Exchange authorization code for access token
  private async exchangeCodeForToken(code: string): Promise<FreesoundToken> {
    const response = await axios.post(`${FREESOUND_API_BASE}/oauth2/access_token/`, null, {
      params: {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        code: code
      }
    })

    this.token = response.data
    await this.saveToken()
    return this.token
  }

  // Refresh access token using refresh token
  async refreshToken(): Promise<FreesoundToken> {
    if (!this.token?.refresh_token) {
      throw new Error('No refresh token available')
    }

    const response = await axios.post(`${FREESOUND_API_BASE}/oauth2/access_token/`, null, {
      params: {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.token.refresh_token
      }
    })

    this.token = response.data
    await this.saveToken()
    return this.token
  }

  // Get authenticated user info
  async getMe(): Promise<FreesoundUser> {
    if (!this.token) {
      throw new Error('Not authenticated')
    }

    const response = await this.axiosInstance.get('/me/', {
      headers: {
        Authorization: `Bearer ${this.token.access_token}`
      }
    })

    return response.data
  }

  // Search for sounds
  async search(params: FreesoundSearchParams): Promise<FreesoundSearchResult> {
    const headers: any = {}

    // Use token if authenticated, otherwise use client ID
    if (this.token) {
      headers.Authorization = `Bearer ${this.token.access_token}`
    } else {
      params = { ...params, token: this.clientId }
    }

    try {
      const response = await this.axiosInstance.get('/search/text/', {
        params,
        headers
      })

      return response.data
    } catch (error: any) {
      if (error.response?.status === 401 && this.token?.refresh_token) {
        // Token expired, try to refresh
        await this.refreshToken()
        return this.search(params) // Retry with new token
      }
      throw error
    }
  }

  // Get sound details by ID
  async getSound(soundId: number): Promise<FreesoundSound> {
    const headers: any = {}
    let params: any = {}

    if (this.token) {
      headers.Authorization = `Bearer ${this.token.access_token}`
    } else {
      params.token = this.clientId
    }

    const response = await this.axiosInstance.get(`/sounds/${soundId}/`, {
      params,
      headers
    })

    return response.data
  }

  // Download sound (requires OAuth2 authentication)
  async downloadSound(soundId: number, outputPath: string): Promise<string> {
    if (!this.token) {
      throw new Error('Authentication required for downloading sounds')
    }

    try {
      // Get download URL
      const response = await this.axiosInstance.get(`/sounds/${soundId}/download/`, {
        headers: {
          Authorization: `Bearer ${this.token.access_token}`
        },
        responseType: 'arraybuffer',
        maxRedirects: 5
      })

      // Save file
      await fs.writeFile(outputPath, Buffer.from(response.data))
      return outputPath
    } catch (error: any) {
      if (error.response?.status === 401 && this.token?.refresh_token) {
        // Token expired, refresh and retry
        await this.refreshToken()
        return this.downloadSound(soundId, outputPath)
      }
      throw error
    }
  }

  // Download preview (doesn't require authentication)
  async downloadPreview(previewUrl: string, outputPath: string): Promise<string> {
    const response = await axios.get(previewUrl, {
      responseType: 'arraybuffer'
    })

    await fs.writeFile(outputPath, Buffer.from(response.data))
    return outputPath
  }
}

// Singleton instance
let freesoundService: FreesoundService | null = null

export function initializeFreesoundService(clientId: string, clientSecret: string, redirectUri?: string) {
  freesoundService = new FreesoundService(clientId, clientSecret, redirectUri)
  return freesoundService
}

export function getFreesoundService(): FreesoundService {
  if (!freesoundService) {
    throw new Error('FreesoundService not initialized')
  }
  return freesoundService
}
