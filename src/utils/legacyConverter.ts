import { INVERTED_MAPS } from './invertedMaps';
import { fontToUnicode } from '@suhasdissa/singlish';

/**
 * Maps a font name to its corresponding encoding family from @suhasdissa/singlish
 */
export function mapFontToFamily(fontName: string): string | null {
  if (!fontName) return null;
  const normalized = fontName.toLowerCase();

  // FM fonts map to FM-Abhaya
  if (
    normalized.includes('abhaya') || 
    normalized.includes('malithi') || 
    normalized.includes('yaso') || 
    normalized.includes('emanee') || 
    normalized.includes('ganganee') || 
    normalized.includes('gemunu') || 
    normalized.includes('isidavas') ||
    normalized.startsWith('fm')
  ) {
    return 'FM-Abhaya';
  }

  // DL fonts map to DL-Manel
  if (
    normalized.includes('manel') || 
    normalized.includes('dl-') ||
    normalized.startsWith('dl')
  ) {
    return 'DL-Manel';
  }

  if (normalized.includes('amalee')) {
    return 'Amalee';
  }

  if (normalized.includes('kaputa')) {
    return 'kaputadotcom';
  }

  if (normalized.includes('thibus')) {
    return 'Thibus-Sinhala';
  }

  return null;
}

/**
 * Safe conversion from Sinhala Unicode to legacy font characters with round-trip validation.
 * If conversion fails or round-trip validation shows a mismatch, it outputs a warning,
 * but returns the conversion result.
 */
export function convertToLegacySafe(text: string, fontFamily: string): string {
  const hasSinhalaUnicode = /[\u0d80-\u0dff]/.test(text);
  if (!hasSinhalaUnicode) {
    return text;
  }

  const family = mapFontToFamily(fontFamily);
  if (!family) {
    console.warn(`[සිCaps Safe Converter] No supported legacy mapping family found for font "${fontFamily}"`);
    return text;
  }

  const pairs = INVERTED_MAPS[family];
  if (!pairs) {
    console.warn(`[සිCaps Safe Converter] Missing inverted map rules for family "${family}"`);
    return text;
  }

  // Convert Unicode -> Legacy
  let result = text;
  for (const [unicode, legacy] of pairs) {
    result = result.split(unicode).join(legacy);
  }

  // Perform round-trip validation check
  try {
    const roundTrip = fontToUnicode(result, family);
    if (roundTrip !== text) {
      console.warn(`[සිCaps Round-Trip Mismatch] "${text}" -> legacy "${result}" -> roundtrip "${roundTrip}"`);
    }
  } catch (err) {
    console.warn(`[සිCaps Round-Trip Error] Failed to validate text "${text}" via ${family}:`, err);
  }

  return result;
}
