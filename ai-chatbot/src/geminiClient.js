import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Get or initialize Google Gen AI Client
 * @param {Object} [options]
 * @param {string} [options.apiKey] Explicit API key override
 * @returns {GoogleGenAI|null}
 */
export function getGeminiClient(options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    return null;
  }

  return new GoogleGenAI({ apiKey });
}

export const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export default {
  getGeminiClient,
  DEFAULT_MODEL
};
