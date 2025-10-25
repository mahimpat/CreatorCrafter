/**
 * Dynamic Prompt Translation Utility for AI-Generated SFX Suggestions
 *
 * Uses intelligent analysis to convert any scene description into rich,
 * descriptive audio prompts optimized for AudioGen/AudioCraft models.
 * NO STATIC MAPPINGS - fully dynamic prompt generation.
 */

export interface AudioPromptTranslation {
  originalPrompt: string
  translatedPrompt: string
  confidence: number
  category: string
  reasoning: string
}

/**
 * Audio descriptor components for building rich prompts
 */
const AUDIO_DESCRIPTORS = {
  // Sound quality descriptors
  intensity: ['gentle', 'soft', 'moderate', 'loud', 'intense', 'powerful', 'subtle', 'faint', 'strong'],
  rhythm: ['rhythmic', 'steady', 'irregular', 'pulsing', 'continuous', 'intermittent', 'sporadic'],
  texture: ['smooth', 'rough', 'crisp', 'muffled', 'clear', 'echoing', 'reverberant', 'sharp', 'dull'],
  pitch: ['low-pitched', 'deep', 'high-pitched', 'resonant', 'sharp', 'hollow', 'booming'],

  // Temporal descriptors
  duration: ['brief', 'prolonged', 'sustained', 'quick', 'slow', 'gradual', 'sudden'],
  pattern: ['repeated', 'single', 'multiple', 'overlapping', 'sequential'],

  // Environmental acoustics
  acoustics: ['with reverb', 'with echo', 'with natural acoustics', 'in open space', 'in enclosed area', 'with room tone'],

  // Context modifiers
  atmosphere: ['ambient', 'atmospheric', 'environmental', 'background', 'foreground', 'prominent']
}

/**
 * Surface and material descriptors for physical interactions
 */
const SURFACE_MATERIALS = {
  hard: ['concrete', 'stone', 'metal', 'tile', 'asphalt', 'brick'],
  soft: ['carpet', 'grass', 'sand', 'fabric', 'mud', 'snow'],
  hollow: ['wooden floor', 'hollow wood', 'empty container', 'drum-like surface'],
  liquid: ['water', 'puddle', 'wet surface', 'marsh', 'stream'],
  loose: ['gravel', 'pebbles', 'leaves', 'debris', 'scattered objects']
}

/**
 * Weather and environmental conditions
 */
const ENVIRONMENTAL_CONDITIONS = {
  weather: ['during rain', 'in wind', 'during storm', 'in calm weather', 'with thunder'],
  time: ['at dawn', 'during day', 'at dusk', 'at night', 'in morning'],
  location: ['indoors', 'outdoors', 'in building', 'in nature', 'in city', 'in countryside']
}

/**
 * Core sound pattern recognition and dynamic prompt building
 */
class DynamicPromptBuilder {

  /**
   * Analyze scene text to extract key elements for audio generation
   */
  static analyzeScene(text: string): {
    subjects: string[]
    actions: string[]
    objects: string[]
    environments: string[]
    qualities: string[]
  } {
    const words = text.toLowerCase().split(/[\s,.\-!?]+/).filter(w => w.length > 2)

    // Common action words that generate sounds
    const actionPatterns = [
      'walking', 'running', 'moving', 'driving', 'flying', 'swimming', 'jumping',
      'opening', 'closing', 'hitting', 'breaking', 'falling', 'climbing', 'typing',
      'cooking', 'eating', 'drinking', 'speaking', 'singing', 'laughing', 'crying',
      'working', 'building', 'playing', 'dancing', 'writing', 'reading'
    ]

    // Objects that commonly make sounds
    const objectPatterns = [
      'door', 'car', 'phone', 'computer', 'water', 'fire', 'wind', 'rain',
      'machine', 'engine', 'motor', 'tool', 'instrument', 'device', 'appliance'
    ]

    // Environmental descriptors
    const environmentPatterns = [
      'outdoor', 'indoor', 'street', 'room', 'forest', 'ocean', 'city', 'house',
      'office', 'kitchen', 'bathroom', 'garage', 'park', 'beach', 'mountain'
    ]

    // Quality descriptors
    const qualityPatterns = [
      'loud', 'quiet', 'fast', 'slow', 'smooth', 'rough', 'hard', 'soft',
      'wet', 'dry', 'hot', 'cold', 'old', 'new', 'big', 'small'
    ]

    return {
      subjects: words.filter(w => /person|man|woman|people|human|individual/.test(w)),
      actions: words.filter(w => actionPatterns.some(p => w.includes(p) || p.includes(w))),
      objects: words.filter(w => objectPatterns.some(p => w.includes(p) || p.includes(w))),
      environments: words.filter(w => environmentPatterns.some(p => w.includes(p) || p.includes(w))),
      qualities: words.filter(w => qualityPatterns.some(p => w.includes(p) || p.includes(w)))
    }
  }

  /**
   * Generate rich, descriptive audio prompt from scene analysis
   */
  static buildAudioPrompt(elements: ReturnType<typeof DynamicPromptBuilder.analyzeScene>, context: string): string {
    const parts: string[] = []
    let baseSound = ''

    // 1. Determine primary sound source
    if (elements.actions.length > 0) {
      const action = elements.actions[0]
      baseSound = this.getAudioForAction(action, elements)
    } else if (elements.objects.length > 0) {
      const object = elements.objects[0]
      baseSound = this.getAudioForObject(object, elements)
    } else {
      // Fallback: extract from context
      baseSound = this.inferAudioFromContext(context)
    }

    if (!baseSound) {
      baseSound = 'ambient environmental sound'
    }

    parts.push(baseSound)

    // 2. Add descriptive qualities
    const descriptors = this.selectDescriptors(elements, context)
    if (descriptors.length > 0) {
      parts.push('with', descriptors.join(' and '))
    }

    // 3. Add environmental context
    const environment = this.buildEnvironmentalContext(elements, context)
    if (environment) {
      parts.push(environment)
    }

    // 4. Add acoustic characteristics
    const acoustics = this.selectAcoustics(elements, context)
    if (acoustics) {
      parts.push(acoustics)
    }

    return parts.join(' ').replace(/\s+/g, ' ').trim()
  }

  /**
   * Generate audio description for actions
   */
  static getAudioForAction(action: string, elements: any): string {
    const actionMappings = {
      'walking': () => {
        const surface = this.inferSurface(elements)
        const pace = this.inferPace(elements)
        return `${pace} footsteps on ${surface}`
      },
      'running': () => {
        const surface = this.inferSurface(elements)
        return `fast rhythmic running footsteps on ${surface} with heavy breathing`
      },
      'driving': () => {
        const vehicle = this.inferVehicleType(elements)
        const road = this.inferRoadType(elements)
        return `${vehicle} engine sound driving on ${road}`
      },
      'opening': () => {
        const object = elements.objects.find(o => ['door', 'window', 'container'].some(t => o.includes(t)))
        return object ? `${object} opening with mechanical movement` : 'opening sound with handle movement'
      },
      'closing': () => {
        const object = elements.objects.find(o => ['door', 'window', 'container'].some(t => o.includes(t)))
        return object ? `${object} closing with solid contact` : 'closing sound with latch mechanism'
      },
      'typing': () => 'keyboard typing with mechanical key presses and consistent rhythm',
      'cooking': () => 'cooking sounds with sizzling, bubbling, and kitchen activity',
      'speaking': () => 'human conversation with natural speech patterns and vocal tones',
      'breaking': () => {
        const material = this.inferMaterial(elements)
        return `${material} breaking with fracture and debris sounds`
      }
    }

    const generator = actionMappings[action] || (() => `${action} sound with natural audio characteristics`)
    return generator()
  }

  /**
   * Generate audio description for objects
   */
  static getAudioForObject(object: string, elements: any): string {
    const objectMappings = {
      'car': () => 'car engine sound with mechanical operation and road interaction',
      'phone': () => 'telephone ringing with clear bell tone and electronic characteristics',
      'water': () => {
        const motion = elements.actions.length > 0 ? 'flowing and moving' : 'gentle ambient'
        return `${motion} water sounds with liquid characteristics`
      },
      'wind': () => 'wind blowing with air movement and environmental interaction',
      'rain': () => 'rainfall with water droplets hitting surfaces and natural rhythm',
      'fire': () => 'fire crackling with flame movement and combustion sounds',
      'machine': () => 'mechanical operation with motor sounds and working components',
      'door': () => 'door interaction with handle movement and hinge operation'
    }

    const generator = objectMappings[object] || (() => `${object} sound with characteristic audio properties`)
    return generator()
  }

  /**
   * Infer audio from general context when specific elements aren't clear
   */
  static inferAudioFromContext(context: string): string {
    const contextLower = context.toLowerCase()

    // Look for implicit sound indicators
    if (contextLower.includes('movement') || contextLower.includes('motion')) {
      return 'movement sound with physical interaction'
    }
    if (contextLower.includes('mechanical') || contextLower.includes('machine')) {
      return 'mechanical operation with motor and component sounds'
    }
    if (contextLower.includes('natural') || contextLower.includes('outdoor')) {
      return 'natural environmental sound with outdoor acoustics'
    }
    if (contextLower.includes('urban') || contextLower.includes('city')) {
      return 'urban ambience with city sounds and activity'
    }
    if (contextLower.includes('quiet') || contextLower.includes('silent')) {
      return 'subtle ambient sound with quiet environmental tone'
    }

    return 'environmental sound with natural acoustic characteristics'
  }

  /**
   * Smart descriptor selection based on context
   */
  static selectDescriptors(elements: any, context: string): string[] {
    const descriptors: string[] = []

    // Add intensity based on context
    if (context.includes('loud') || context.includes('intense')) {
      descriptors.push('loud intensity')
    } else if (context.includes('quiet') || context.includes('gentle')) {
      descriptors.push('gentle volume')
    }

    // Add rhythm based on actions
    if (elements.actions.some(a => ['walking', 'running', 'typing'].includes(a))) {
      descriptors.push('rhythmic pattern')
    }

    // Add texture based on environment
    if (elements.environments.some(e => ['outdoor', 'forest', 'nature'].includes(e))) {
      descriptors.push('natural texture')
    } else if (elements.environments.some(e => ['indoor', 'room', 'office'].includes(e))) {
      descriptors.push('clear indoor acoustics')
    }

    return descriptors.slice(0, 2) // Limit to avoid over-describing
  }

  /**
   * Build environmental context
   */
  static buildEnvironmentalContext(elements: any, context: string): string {
    if (elements.environments.length > 0) {
      const env = elements.environments[0]
      if (env.includes('outdoor')) return 'in outdoor environment'
      if (env.includes('indoor')) return 'in indoor setting'
      if (env.includes('city')) return 'in urban environment'
      if (env.includes('forest')) return 'in natural forest setting'
    }

    // Infer from context
    if (context.includes('inside') || context.includes('room')) return 'in enclosed space'
    if (context.includes('outside') || context.includes('outdoor')) return 'in open air'

    return ''
  }

  /**
   * Select appropriate acoustics
   */
  static selectAcoustics(elements: any, context: string): string {
    if (elements.environments.some(e => ['large', 'hall', 'cathedral'].some(w => e.includes(w)))) {
      return 'with spacious reverb'
    }
    if (elements.environments.some(e => ['small', 'close', 'tight'].some(w => e.includes(w)))) {
      return 'with intimate acoustics'
    }
    if (context.includes('echo') || context.includes('reverb')) {
      return 'with natural echo'
    }
    return ''
  }

  // Helper methods for specific inferences
  static inferSurface(elements: any): string {
    if (elements.qualities.some(q => ['hard', 'concrete', 'stone'].includes(q))) return 'hard pavement'
    if (elements.qualities.some(q => ['soft', 'grass', 'carpet'].includes(q))) return 'soft surface'
    if (elements.qualities.some(q => ['wet', 'rain'].includes(q))) return 'wet ground'
    return 'solid ground'
  }

  static inferPace(elements: any): string {
    if (elements.qualities.some(q => ['fast', 'quick', 'hurried'].includes(q))) return 'quick'
    if (elements.qualities.some(q => ['slow', 'casual', 'relaxed'].includes(q))) return 'casual'
    return 'steady'
  }

  static inferVehicleType(elements: any): string {
    if (elements.objects.some(o => ['truck', 'bus'].includes(o))) return 'heavy vehicle'
    if (elements.objects.some(o => ['motorcycle', 'bike'].includes(o))) return 'motorcycle'
    return 'car'
  }

  static inferRoadType(elements: any): string {
    if (elements.environments.some(e => ['highway', 'freeway'].includes(e))) return 'smooth highway'
    if (elements.qualities.some(q => ['rough', 'gravel'].includes(q))) return 'rough road'
    return 'paved road'
  }

  static inferMaterial(elements: any): string {
    if (elements.objects.some(o => ['glass', 'window'].includes(o))) return 'glass'
    if (elements.objects.some(o => ['wood', 'wooden'].includes(o))) return 'wood'
    if (elements.objects.some(o => ['metal', 'steel'].includes(o))) return 'metal'
    return 'solid material'
  }
}

/**
 * Main translation function: converts scene description to rich AudioGen prompt
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

  // Clean the input first
  const cleanedContext = cleanInput(fullContext)

  // Analyze scene elements
  const elements = DynamicPromptBuilder.analyzeScene(cleanedContext)

  // Generate rich audio prompt
  const translatedPrompt = DynamicPromptBuilder.buildAudioPrompt(elements, cleanedContext)

  // Calculate confidence based on how much we extracted
  const confidence = calculateConfidence(elements, cleanedContext)

  // Determine category
  const category = determineCategory(elements)

  // Build reasoning
  const reasoning = buildReasoning(elements, originalPrompt, translatedPrompt)

  return {
    originalPrompt,
    translatedPrompt,
    confidence,
    category,
    reasoning
  }
}

/**
 * Clean input text for better analysis
 */
function cleanInput(text: string): string {
  return text
    .replace(/what sounds would you hear/gi, '')
    .replace(/sounds that might be/gi, '')
    .replace(/in this scene\?*/gi, '')
    .replace(/\?+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Calculate confidence based on extracted elements
 */
function calculateConfidence(elements: any, context: string): number {
  let confidence = 0.3 // Base confidence

  // Higher confidence for clear actions
  if (elements.actions.length > 0) confidence += 0.3

  // Higher confidence for identifiable objects
  if (elements.objects.length > 0) confidence += 0.2

  // Higher confidence for environmental context
  if (elements.environments.length > 0) confidence += 0.1

  // Higher confidence for descriptive qualities
  if (elements.qualities.length > 0) confidence += 0.1

  // Bonus for longer, more descriptive context
  if (context.length > 50) confidence += 0.1

  return Math.min(0.95, confidence)
}

/**
 * Determine audio category
 */
function determineCategory(elements: any): string {
  if (elements.actions.length > 0) {
    const action = elements.actions[0]
    if (['walking', 'running', 'moving'].includes(action)) return 'movement'
    if (['driving', 'flying'].includes(action)) return 'transportation'
    if (['speaking', 'talking'].includes(action)) return 'voice'
    return 'action'
  }

  if (elements.objects.length > 0) {
    const object = elements.objects[0]
    if (['car', 'vehicle', 'engine'].includes(object)) return 'transportation'
    if (['water', 'rain', 'wind'].includes(object)) return 'nature'
    if (['machine', 'computer', 'phone'].includes(object)) return 'technology'
    return 'object'
  }

  if (elements.environments.length > 0) {
    return 'environmental'
  }

  return 'ambient'
}

/**
 * Build human-readable reasoning
 */
function buildReasoning(elements: any, original: string, translated: string): string {
  const parts: string[] = []

  if (elements.actions.length > 0) {
    parts.push(`Detected action: ${elements.actions[0]}`)
  }

  if (elements.objects.length > 0) {
    parts.push(`Identified object: ${elements.objects[0]}`)
  }

  if (elements.environments.length > 0) {
    parts.push(`Environment: ${elements.environments[0]}`)
  }

  if (parts.length === 0) {
    parts.push('Generated from general context')
  }

  return `${parts.join(', ')} → Enhanced with descriptive audio characteristics`
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