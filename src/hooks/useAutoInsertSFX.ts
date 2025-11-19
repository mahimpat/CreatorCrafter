import { useEffect, useRef, useState } from 'react'
import { useProject } from '../context/ProjectContext'
import toast from 'react-hot-toast'

interface LibrarySound {
  name: string
  prompt: string
  duration: number
  tags: string[]
  category: string
  filePath: string
}

// Enhanced semantic matching using keywords and context
const calculateSemanticSimilarity = (suggestionPrompt: string, librarySound: LibrarySound): number => {
  const suggestion = suggestionPrompt.toLowerCase().trim()
  const libraryPrompt = librarySound.prompt.toLowerCase().trim()
  const tags = librarySound.tags.map(t => t.toLowerCase())
  const category = librarySound.category.toLowerCase()

  // Extract key descriptive words (filter out common filler words)
  const fillerWords = new Set(['sound', 'effect', 'audio', 'sfx', 'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for'])

  const extractKeywords = (text: string) => {
    return text.split(/[\s,]+/).filter(word =>
      word.length > 2 && !fillerWords.has(word)
    )
  }

  const suggestionKeywords = extractKeywords(suggestion)
  const libraryKeywords = extractKeywords(libraryPrompt)
  const allLibraryKeywords = [...libraryKeywords, ...tags, category]

  // Check for keyword matches
  let matchScore = 0
  let matches = 0

  for (const sugKeyword of suggestionKeywords) {
    for (const libKeyword of allLibraryKeywords) {
      // Exact keyword match
      if (sugKeyword === libKeyword) {
        matchScore += 1.0
        matches++
      }
      // Partial match (one contains the other)
      else if (sugKeyword.includes(libKeyword) || libKeyword.includes(sugKeyword)) {
        matchScore += 0.5
        matches++
      }
    }
  }

  // Normalize by number of suggestion keywords
  if (suggestionKeywords.length === 0) return 0

  return Math.min(1.0, matchScore / suggestionKeywords.length)
}

/**
 * Hook to automatically insert matching SFX from the built-in library
 * after video analysis completes. Runs once per analysis.
 */
export function useAutoInsertSFX() {
  console.log('[Auto-Insert Hook] Hook initialized')

  const { unifiedAnalysis, analysis, addSFXTrack, sfxTracks } = useProject()
  const [builtInLibrary, setBuiltInLibrary] = useState<LibrarySound[]>([])
  const lastProcessedAnalysisRef = useRef<string>('')

  const sfxSuggestions = unifiedAnalysis?.sfx_suggestions || analysis?.suggestedSFX || []

  console.log('[Auto-Insert Hook] Hook render - suggestions:', sfxSuggestions?.length, 'library:', builtInLibrary?.length, 'existing tracks:', sfxTracks?.length)

  // Load built-in SFX Library on mount
  useEffect(() => {
    const loadBuiltInLibrary = async () => {
      try {
        const result = await window.electronAPI.loadSFXLibrary()

        if (result.success) {
          // Flatten all sounds with category info
          const sounds: LibrarySound[] = []
          Object.entries(result.metadata.categories).forEach(([category, categoryData]: [string, any]) => {
            categoryData.sounds.forEach((sound: any) => {
              sounds.push({
                ...sound,
                category,
                filePath: `sfx_library/${category}/${sound.name}.wav`
              })
            })
          })

          setBuiltInLibrary(sounds)
          console.log(`[Auto-Insert Hook] Loaded ${sounds.length} sounds from built-in SFX library`)
        }
      } catch (err) {
        console.error('[Auto-Insert Hook] Failed to load built-in SFX library:', err)
      }
    }

    loadBuiltInLibrary()
  }, [])

  // Auto-insert matching library items ONCE after analysis completes
  useEffect(() => {
    console.log('[Auto-Insert Hook] useEffect triggered', {
      suggestions: sfxSuggestions?.length || 0,
      library: builtInLibrary?.length || 0
    })

    // Only process if we have suggestions and they're from a new analysis
    if (!sfxSuggestions || sfxSuggestions.length === 0) {
      console.log('[Auto-Insert Hook] No suggestions, returning')
      return
    }
    if (!builtInLibrary || builtInLibrary.length === 0) {
      console.log('[Auto-Insert Hook] No library loaded, returning')
      return
    }

    // Create a unique ID for this analysis using all suggestion timestamps combined
    const analysisId = sfxSuggestions.map(s => s.timestamp).join('-')

    console.log('[Auto-Insert Hook] Analysis ID:', analysisId)
    console.log('[Auto-Insert Hook] Last processed ID:', lastProcessedAnalysisRef.current)

    // Skip if we've already processed this analysis
    if (lastProcessedAnalysisRef.current === analysisId) {
      console.log('[Auto-Insert Hook] Already processed this analysis, skipping')
      return
    }

    console.log(`[Auto-Insert Hook] Processing ${sfxSuggestions.length} suggestions against ${builtInLibrary.length} library sounds`)

    // Check if SFX have already been inserted for these suggestions
    const hasExistingSFXForSuggestions = () => {
      // If there are no SFX tracks, definitely not inserted yet
      if (!sfxTracks || sfxTracks.length === 0) return false

      // Check if there are SFX tracks at or near the suggestion timestamps
      // Use a tolerance of 0.5 seconds to account for slight variations
      const TIMESTAMP_TOLERANCE = 0.5

      let matchCount = 0
      for (const suggestion of sfxSuggestions) {
        const hasTrackNearTimestamp = sfxTracks.some(track =>
          Math.abs(track.start - suggestion.timestamp) < TIMESTAMP_TOLERANCE
        )
        if (hasTrackNearTimestamp) {
          matchCount++
        }
      }

      // If more than 50% of suggestions have SFX near their timestamps, assume already inserted
      const threshold = sfxSuggestions.length * 0.5
      return matchCount >= threshold
    }

    if (hasExistingSFXForSuggestions()) {
      console.log('[Auto-Insert Hook] SFX already exist for these suggestions, skipping auto-insert')
      lastProcessedAnalysisRef.current = analysisId
      return
    }

    // Process each suggestion asynchronously
    const processAutoInsert = async () => {
      console.log('[Auto-Insert Hook] processAutoInsert called')
      let insertedCount = 0
      let matchedCount = 0

      for (const suggestion of sfxSuggestions) {
        // Find matching library item
        const libraryMatch = findBestMatch(suggestion.prompt)

        if (libraryMatch) {
          matchedCount++
          console.log(`[Auto-Insert Hook] Found match for "${suggestion.prompt}": ${libraryMatch.name}`)

          try {
            // Get absolute path to the sound file
            const result = await window.electronAPI.getSFXLibraryPath(libraryMatch.filePath)

            if (result.success) {
              // Auto-insert the matching SFX from library
              const track = {
                id: `sfx-${Date.now()}-${Math.random()}`,
                path: result.path,
                start: suggestion.timestamp,
                duration: libraryMatch.duration,
                originalDuration: libraryMatch.duration,
                volume: 1,
                prompt: libraryMatch.prompt
              }

              console.log(`[Auto-Insert Hook] Adding SFX track:`, track)

              // Skip history for auto-inserted tracks
              addSFXTrack(track, true)
              insertedCount++

              // Show toast notification
              toast.success(`✓ Auto-inserted "${libraryMatch.name}" at ${suggestion.timestamp.toFixed(2)}s`, {
                duration: 3000
              })
            } else {
              console.error(`[Auto-Insert Hook] Failed to get path for ${libraryMatch.filePath}:`, result.error)
            }
          } catch (err) {
            console.error('[Auto-Insert Hook] Failed to get SFX library path:', err)
          }
        }
      }

      console.log(`[Auto-Insert Hook] Complete: ${insertedCount} tracks inserted from ${matchedCount} matches`)

      if (insertedCount === 0 && sfxSuggestions.length > 0) {
        console.log(`[Auto-Insert Hook] No matching SFX found in library for ${sfxSuggestions.length} suggestions`)
      }

      // Mark this analysis as processed only AFTER we've attempted insertion
      lastProcessedAnalysisRef.current = analysisId
      console.log('[Auto-Insert Hook] Marked analysis as processed')
    }

    processAutoInsert()
  // Note: sfxTracks not in dependency array to avoid re-running on every track change
  // We only check it once when suggestions or library changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sfxSuggestions, builtInLibrary, addSFXTrack])

  // Find best matching sound from library
  const findBestMatch = (prompt: string): LibrarySound | null => {
    if (!builtInLibrary || builtInLibrary.length === 0) {
      return null
    }

    const SIMILARITY_THRESHOLD = 0.3

    let bestMatch: LibrarySound | null = null
    let bestScore = 0

    for (const item of builtInLibrary) {
      const similarity = calculateSemanticSimilarity(prompt, item)

      if (similarity > bestScore) {
        bestScore = similarity
        bestMatch = item
      }
    }

    // Only return match if it meets threshold
    if (bestMatch && bestScore >= SIMILARITY_THRESHOLD) {
      return bestMatch
    }

    return null
  }
}
