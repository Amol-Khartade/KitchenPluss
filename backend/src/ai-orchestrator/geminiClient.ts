// ============================================================
// KitchenPulse — Gemini AI Client (singleton)
// ============================================================

import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

let _client: GoogleGenerativeAI | null = null;
let _model: GenerativeModel | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    _client = new GoogleGenerativeAI(apiKey);
  }
  return _client;
}

export function getGeminiModel(modelName = "gemini-1.5-flash"): GenerativeModel {
  if (!_model) {
    _model = getGeminiClient().getGenerativeModel({ model: modelName });
  }
  return _model;
}
