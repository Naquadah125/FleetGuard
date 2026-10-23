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

  return new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
}

const CURRENT_DEFAULT_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_MODEL = process.env.GEMINI_MODEL || CURRENT_DEFAULT_MODEL;

export function getGeminiModels(options = {}) {
  const configured = options.models
    ?? options.model
    ?? process.env.GEMINI_MODELS
    ?? DEFAULT_MODEL;
  const models = Array.isArray(configured)
    ? configured
    : String(configured || '').split(',');
  const cleaned = models.map((model) => model.trim()).filter(Boolean);
  return [...new Set([...(cleaned.length ? cleaned : [DEFAULT_MODEL]), CURRENT_DEFAULT_MODEL])];
}

export default {
  getGeminiClient,
  DEFAULT_MODEL,
  getGeminiModels
};
