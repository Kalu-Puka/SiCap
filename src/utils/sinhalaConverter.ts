/**
 * Singlish to Sinhala Unicode Transliteration Helper
 * Provides high-fidelity phonetic typing support for Sri Lankan content creators.
 */

const CONSONANTS: { [key: string]: string } = {
  'ch': 'ච්',
  'sh': 'ෂ්',
  'th': 'ත්',
  'dh': 'ද්',
  'kh': 'ඛ්',
  'gh': 'ඝ්',
  'ph': 'ෆ්',
  'bh': 'බ්',
  'jh': 'ඣ්',
  'thh': 'ථ්',
  'dhh': 'ධ්',
  'k': 'ක්',
  'g': 'ග්',
  'c': 'ච්',
  'j': 'ජ්',
  't': 'ට්',
  'd': 'ඩ්',
  'n': 'න්',
  'p': 'ප්',
  'b': 'බ්',
  'm': 'ම්',
  'y': 'ය්',
  'r': 'ර්',
  'l': 'ල්',
  'v': 'ව්',
  'w': 'ව්',
  's': 'ස්',
  'h': 'හ්',
  'f': 'ෆ්',
  'x': 'ක්‍ෂ්'
};

const VOWELS: { [key: string]: string } = {
  'aee': 'ඈ',
  'ae': 'ඇ',
  'aa': 'ආ',
  'a': 'අ',
  'ii': 'ඊ',
  'i': 'ඉ',
  'uu': 'ඌ',
  'u': 'උ',
  'ee': 'ඒ',
  'e': 'එ',
  'oo': 'ඕ',
  'o': 'ඔ',
  'au': 'ඖ'
};

const PILLAM: { [key: string]: string } = {
  'aee': 'ෑ',
  'ae': 'ැ',
  'aa': 'ා',
  'a': '', // removes hal-kirima
  'ii': 'ී',
  'i': 'ි',
  'uu': 'ූ',
  'u': 'ු',
  'ee': 'ේ',
  'e': 'ෙ',
  'oo': 'ෝ',
  'o': 'ො',
  'au': 'ෞ'
};

/**
 * Phonetically converts a Singlish string to Sinhala Unicode
 */
export function convertSinglishToSinhala(input: string): string {
  if (!input) return '';

  let result = '';
  let i = 0;

  while (i < input.length) {
    const char = input[i].toLowerCase();
    
    // Non-alphabetical/punctuation characters should bypass transliteration
    if (!/[a-z]/.test(char)) {
      result += input[i];
      i++;
      continue;
    }

    // Check for special multi-character sequences (e.g. consonants like thh, dhh, ch, sh)
    let matchedConsonantLength = 0;
    let sinhalaConsonant = '';

    for (const len of [3, 2, 1]) {
      if (i + len <= input.length) {
        const sub = input.slice(i, i + len).toLowerCase();
        if (CONSONANTS[sub]) {
          matchedConsonantLength = len;
          sinhalaConsonant = CONSONANTS[sub];
          break;
        }
      }
    }

    if (matchedConsonantLength > 0) {
      // We found a consonant cluster!
      i += matchedConsonantLength;

      // Check if this consonant is followed by a vowel sign
      let matchedVowelLength = 0;
      let appliedPillam = '';

      for (const len of [3, 2, 1]) {
        if (i + len <= input.length) {
          const sub = input.slice(i, i + len).toLowerCase();
          if (PILLAM[sub] !== undefined) {
            matchedVowelLength = len;
            appliedPillam = PILLAM[sub];
            break;
          }
        }
      }

      if (matchedVowelLength > 0) {
        // Apply vowel modifier: remove the hal-kirima (්) and append the modifier
        const base = sinhalaConsonant.endsWith('්') 
          ? sinhalaConsonant.slice(0, -1) 
          : sinhalaConsonant;
        result += base + appliedPillam;
        i += matchedVowelLength;
      } else {
        // No vowel follows, keep the default hal-kirima consonant
        result += sinhalaConsonant;
      }
    } else {
      // If it is not a consonant, check if it's a standalone vowel
      let matchedStandaloneVowelLength = 0;
      let standaloneVowel = '';

      for (const len of [3, 2, 1]) {
        if (i + len <= input.length) {
          const sub = input.slice(i, i + len).toLowerCase();
          if (VOWELS[sub]) {
            matchedStandaloneVowelLength = len;
            standaloneVowel = VOWELS[sub];
            break;
          }
        }
      }

      if (matchedStandaloneVowelLength > 0) {
        result += standaloneVowel;
        i += matchedStandaloneVowelLength;
      } else {
        // Fallback for unexpected characters
        result += input[i];
        i++;
      }
    }
  }

  // Post-processing optimizations for natural Singlish typing
  return result
    // Fix n-consonant to anüsvara (ං) e.g., 'sinhala' -> 'සිංහල' instead of 'සින්හල'
    .replace(/න්හ/g, 'ංහ')
    .replace(/න්ස/g, 'ංස')
    .replace(/න්ව/g, 'ංව')
    .replace(/න්ය/g, 'ංය')
    .replace(/න්ෆ/g, 'ංෆ')
    .replace(/න්ග්/g, 'ඟ්')
    .replace(/න්ඩ්/g, 'ඳ්');
}
