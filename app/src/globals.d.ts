/** True when the dev server has ELEVENLABS_API_KEY and proxies /api/tts to ElevenLabs. */
declare const __ELEVEN_TTS__: boolean;

interface ImportMetaEnv {
  readonly VITE_ELEVENLABS_AGENT_ID?: string;
}
