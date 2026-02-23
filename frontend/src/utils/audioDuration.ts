/**
 * Get the duration of an audio file by decoding it with Web Audio API.
 */
export async function getAudioDuration(url: string): Promise<number> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`)
  const arrayBuffer = await response.arrayBuffer()
  const audioContext = new AudioContext()
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    return audioBuffer.duration
  } finally {
    await audioContext.close()
  }
}
