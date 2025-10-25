/**
 * Prompt Translation Utility for AI-Generated SFX Suggestions
 *
 * Translates scene descriptions and AI analysis into optimized prompts
 * for AudioGen/AudioCraft models to generate appropriate sound effects.
 */

export interface AudioPromptTranslation {
  originalPrompt: string
  translatedPrompt: string
  confidence: number
  category: string
  reasoning: string
}

/**
 * Scene keyword mappings for audio generation
 */
const SCENE_AUDIO_MAPPINGS = {
  // Movement & Actions
  movement: {
    keywords: ['walking', 'running', 'moving', 'stepping', 'climbing', 'jumping', 'dancing'],
    sounds: ['footsteps', 'running footsteps', 'movement sounds', 'steps on ground', 'jumping impact', 'dancing feet']
  },

  // Transportation
  vehicles: {
    keywords: ['car', 'vehicle', 'driving', 'truck', 'motorcycle', 'bicycle', 'bus'],
    sounds: ['car engine', 'vehicle rumble', 'engine starting', 'car driving', 'motorcycle engine', 'bicycle pedaling']
  },

  aircraft: {
    keywords: ['airplane', 'plane', 'helicopter', 'flying', 'aircraft'],
    sounds: ['airplane engine', 'helicopter rotor', 'jet engine', 'propeller aircraft', 'aviation sounds']
  },

  trains: {
    keywords: ['train', 'railway', 'locomotive', 'subway', 'metro'],
    sounds: ['train sounds', 'railway ambience', 'locomotive whistle', 'train on tracks', 'subway rumble']
  },

  // Nature & Environment
  weather: {
    keywords: ['rain', 'storm', 'thunder', 'wind', 'snow', 'hail'],
    sounds: ['rain falling', 'thunderstorm', 'wind blowing', 'heavy rain', 'gentle rain', 'storm sounds']
  },

  water: {
    keywords: ['water', 'ocean', 'sea', 'lake', 'river', 'stream', 'splash', 'swimming'],
    sounds: ['water sounds', 'ocean waves', 'flowing water', 'splash', 'underwater ambience', 'river flowing']
  },

  nature: {
    keywords: ['forest', 'trees', 'birds', 'animals', 'wilderness', 'outdoor'],
    sounds: ['forest ambience', 'birds chirping', 'rustling leaves', 'nature sounds', 'outdoor atmosphere']
  },

  // Urban & Indoor
  urban: {
    keywords: ['city', 'street', 'traffic', 'urban', 'construction', 'crowd'],
    sounds: ['city ambience', 'traffic sounds', 'urban atmosphere', 'construction noise', 'crowd noise', 'street sounds']
  },

  indoor: {
    keywords: ['room', 'house', 'office', 'kitchen', 'bedroom', 'bathroom'],
    sounds: ['room ambience', 'indoor atmosphere', 'house sounds', 'kitchen ambience', 'office environment']
  },

  // Objects & Interactions
  doors: {
    keywords: ['door', 'opening', 'closing', 'entrance', 'exit'],
    sounds: ['door opening', 'door closing', 'door creak', 'door slam', 'wooden door', 'metal door']
  },

  technology: {
    keywords: ['phone', 'computer', 'typing', 'keyboard', 'mouse', 'electronic'],
    sounds: ['phone ring', 'keyboard typing', 'computer sounds', 'electronic beep', 'mouse click', 'notification sound']
  },

  mechanical: {
    keywords: ['machine', 'motor', 'engine', 'mechanical', 'machinery', 'industrial'],
    sounds: ['machine humming', 'motor running', 'mechanical noise', 'industrial ambience', 'machinery operation']
  },

  // Actions & Events
  impact: {
    keywords: ['hit', 'crash', 'bang', 'collision', 'smash', 'break'],
    sounds: ['impact sound', 'crash', 'bang', 'collision noise', 'breaking glass', 'metal clang']
  },

  communication: {
    keywords: ['talking', 'speaking', 'conversation', 'voice', 'speech'],
    sounds: ['conversation ambience', 'people talking', 'distant voices', 'crowd chatter', 'speech sounds']
  }
}

/**
 * Extract key elements from scene description for audio mapping
 */
function extractSceneElements(description: string): {
  keywords: string[]
  actions: string[]
  objects: string[]
  environment: string[]
} {
  const text = description.toLowerCase()
  const words = text.split(/[\s,.\-!?]+/).filter(word => word.length > 2)

  // Common action words
  const actionWords = [
    'walking', 'running', 'driving', 'flying', 'swimming', 'talking', 'eating',
    'opening', 'closing', 'hitting', 'breaking', 'falling', 'climbing', 'jumping'
  ]

  // Common object words
  const objectWords = [
    'door', 'car', 'phone', 'computer', 'water', 'tree', 'building', 'road',
    'window', 'table', 'chair', 'machine', 'engine', 'train', 'plane'
  ]

  // Environment words
  const environmentWords = [
    'outdoor', 'indoor', 'forest', 'city', 'street', 'room', 'kitchen', 'office',
    'park', 'beach', 'mountain', 'field', 'garden', 'garage', 'basement'
  ]

  return {
    keywords: words,
    actions: words.filter(word => actionWords.includes(word)),
    objects: words.filter(word => objectWords.includes(word)),
    environment: words.filter(word => environmentWords.includes(word))
  }
}

/**
 * Find matching audio categories for scene elements
 */
function findAudioMatches(elements: ReturnType<typeof extractSceneElements>): Array<{
  category: string
  sounds: string[]
  confidence: number
}> {
  const matches: Array<{ category: string; sounds: string[]; confidence: number }> = []

  for (const [category, mapping] of Object.entries(SCENE_AUDIO_MAPPINGS)) {
    let matchCount = 0
    let totalKeywords = mapping.keywords.length

    // Count how many keywords match
    for (const keyword of mapping.keywords) {
      if (elements.keywords.some(word =>
        word.includes(keyword) || keyword.includes(word)
      )) {
        matchCount++
      }
    }

    if (matchCount > 0) {
      const confidence = Math.min(0.95, (matchCount / totalKeywords) + 0.3)
      matches.push({
        category,
        sounds: mapping.sounds,
        confidence
      })
    }
  }

  // Sort by confidence
  return matches.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Clean and optimize prompt for AudioGen
 */
function optimizeForAudioGen(prompt: string): string {
  // Remove question words and phrases
  let cleaned = prompt
    .replace(/what sounds would you hear/gi, '')
    .replace(/sounds that might be heard/gi, '')
    .replace(/audio that could be/gi, '')
    .replace(/in this scene\?*/gi, '')
    .replace(/\?+/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Remove common non-audio words
  const nonAudioWords = ['scene', 'image', 'video', 'visual', 'picture', 'showing', 'depicts']
  for (const word of nonAudioWords) {
    cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, 'gi'), '')
  }

  // Clean up extra spaces and punctuation
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim()

  // Ensure it's a valid audio prompt
  if (cleaned.length < 3) {
    return 'ambient background sound'
  }

  // Add audio-specific terms if needed
  if (!cleaned.includes('sound') && !cleaned.includes('audio') && !cleaned.includes('noise')) {
    cleaned += ' sound'
  }

  return cleaned
}

/**
 * Main translation function: converts scene description to AudioGen prompt
 */
export function translateSceneToAudioPrompt(
  originalPrompt: string,
  sceneDescription?: string,
  actionDescription?: string
): AudioPromptTranslation {

  // Combine all available context
  const fullContext = [originalPrompt, sceneDescription, actionDescription]
    .filter(Boolean)
    .join(' ')

  // Extract scene elements
  const elements = extractSceneElements(fullContext)

  // Find matching audio categories
  const matches = findAudioMatches(elements)

  let translatedPrompt: string
  let confidence: number
  let category: string
  let reasoning: string

  if (matches.length > 0) {
    // Use the best match
    const bestMatch = matches[0]

    // Select most appropriate sound from the category
    const soundOptions = bestMatch.sounds
    let selectedSound = soundOptions[0] // Default to first option

    // Try to find more specific sound based on context
    for (const sound of soundOptions) {
      const soundWords = sound.toLowerCase().split(' ')
      if (soundWords.some(word => elements.keywords.includes(word))) {
        selectedSound = sound
        break
      }
    }

    translatedPrompt = selectedSound
    confidence = bestMatch.confidence
    category = bestMatch.category
    reasoning = `Matched scene elements: ${elements.keywords.slice(0, 3).join(', ')} → ${category} sounds`

  } else {
    // Fallback: clean up the original prompt
    translatedPrompt = optimizeForAudioGen(originalPrompt)
    confidence = 0.5
    category = 'generic'
    reasoning = 'No specific matches found, cleaned original prompt'
  }

  // Final optimization
  translatedPrompt = optimizeForAudioGen(translatedPrompt)

  return {
    originalPrompt,
    translatedPrompt,
    confidence,
    category,
    reasoning
  }
}

/**
 * Batch translate multiple suggestions
 */
export function translateSuggestionsBatch(suggestions: Array<{
  prompt: string
  reason?: string
  visual_context?: string
  action_context?: string
}>): Array<AudioPromptTranslation & { originalSuggestion: any }> {

  return suggestions.map(suggestion => {
    const translation = translateSceneToAudioPrompt(
      suggestion.prompt,
      suggestion.visual_context,
      suggestion.action_context
    )

    return {
      ...translation,
      originalSuggestion: suggestion
    }
  })
}

/**
 * Get human-readable explanation of the translation
 */
export function getTranslationExplanation(translation: AudioPromptTranslation): string {
  if (translation.confidence > 0.8) {
    return `High confidence: ${translation.reasoning}`
  } else if (translation.confidence > 0.6) {
    return `Medium confidence: ${translation.reasoning}`
  } else {
    return `Low confidence: ${translation.reasoning}. You may want to edit this prompt.`
  }
}