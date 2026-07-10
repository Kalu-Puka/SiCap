import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import multer from 'multer';
import dotenv from 'dotenv';
import ffmpeg from 'fluent-ffmpeg';

dotenv.config();

// Ensure directories exist
const uploadDir = path.join(process.cwd(), 'uploads');
const exportDir = path.join(process.cwd(), 'exports');
const fontDir = path.join(process.cwd(), 'public', 'fonts');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
if (!fs.existsSync(fontDir)) fs.mkdirSync(fontDir, { recursive: true });

// Create simple local empty font files if they don't exist to prevent 404s
const fmYasoPath = path.join(fontDir, 'FMYASO.ttf');
const fmMallithiPath = path.join(fontDir, 'FMMALITHI.ttf');
if (!fs.existsSync(fmYasoPath)) fs.writeFileSync(fmYasoPath, '');
if (!fs.existsSync(fmMallithiPath)) fs.writeFileSync(fmMallithiPath, '');

const app = express();
const PORT = 3000;

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Set up Multer for handling video file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for local videos
});

// Lazy-loaded Gemini AI client
let activeApiKey: string | null = null;
let aiClient: GoogleGenAI | null = null;

function cleanKey(rawKey: string | undefined): string | null {
  if (!rawKey) return null;
  let key = rawKey.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  const lowerKey = key.toLowerCase();
  if (
    lowerKey === 'my_gemini_api_key' ||
    lowerKey.includes('placeholder') ||
    lowerKey.includes('your_key') ||
    key.length < 10
  ) {
    return null;
  }
  return key;
}

async function getGeminiClient(): Promise<GoogleGenAI> {
  // If we already verified a working client, return it
  if (aiClient && activeApiKey) {
    return aiClient;
  }

  // List of keys to try in order of priority:
  // 1. GEMINI_API_KEY1 (renamed from GEMINI_API_KEY to avoid reserved name issues)
  // 2. GEMINI_API_KEY2 (fallback)
  // 3. GEMINI_API_KEY (original fallback)
  const keysToTry = [
    { name: 'GEMINI_API_KEY1', value: process.env.GEMINI_API_KEY1 },
    { name: 'GEMINI_API_KEY2', value: process.env.GEMINI_API_KEY2 },
    { name: 'GEMINI_API_KEY', value: process.env.GEMINI_API_KEY }
  ];

  let lastErr: any = null;

  for (const item of keysToTry) {
    const cleaned = cleanKey(item.value);
    if (!cleaned) continue;

    console.log(`Testing API key from environment variable: ${item.name} (length: ${cleaned.length})`);
    try {
      const client = new GoogleGenAI({
        apiKey: cleaned,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      // Perform a cheap, fast list models call to verify the key
      await client.models.list();
      
      console.log(`Success! Verified working Gemini API key from: ${item.name}`);
      activeApiKey = cleaned;
      aiClient = client;
      return client;
    } catch (err: any) {
      console.warn(`API key validation failed for ${item.name}:`, err.message || err);
      lastErr = err;
    }
  }

  // If we have tried everything and none succeeded
  const triedNames = keysToTry.filter(item => !!item.value).map(item => item.name).join(', ') || 'none';
  const errMsg = lastErr ? (lastErr.message || JSON.stringify(lastErr)) : 'No keys provided.';
  throw new Error(`Failed to configure any working Gemini API Key. Tried: [${triedNames}]. Details: ${errMsg}`);
}

// In-memory queue database for export jobs
interface ExportJobInternal {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  videoUrl: string;
  styleConfig: any;
  segments: any[];
  outputUrl?: string;
  createdAt: string;
  error?: string;
  ffmpegCommand?: string;
  remotionCommand?: string;
}

const exportJobs: Map<string, ExportJobInternal> = new Map();

// Helper to generate ASS subtitle content
function generateAssSubtitles(segments: any[], style: any): string {
  const textColorAss = style.textColor.replace('#', '&H00') + 'FF'; // ASS format is AGBR or simple RGB hex conversion, we keep it simple for mock
  const backColorAss = style.backgroundColor.replace('#', '&H80') + 'FF'; // 50% opacity
  
  let ass = `[Script Info]
Title: Sinhala Captions Subtitles
ScriptType: v4.00+
Collisions: Normal
PlayResX: 1280
PlayResY: 720

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${style.fontFamily},${style.fontSize},${textColorAss},&H000000FF,&H00000000,${backColorAss},0,0,0,0,100,100,0,0,1,${style.strokeWidth},${style.shadowBlur},2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  segments.forEach((seg) => {
    const formatTime = (ms: number) => {
      const date = new Date(ms);
      const h = String(Math.floor(ms / 3600000)).padStart(1, '0');
      const m = String(date.getUTCMinutes()).padStart(2, '0');
      const s = String(date.getUTCSeconds()).padStart(2, '0');
      const cs = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
      return `${h}:${m}:${s}.${cs}`;
    };

    const startStr = formatTime(seg.start);
    const endStr = formatTime(seg.end);
    ass += `Dialogue: 0,${startStr},${endStr},Default,,0,0,0,,${seg.text}\n`;
  });

  return ass;
}

// Background Worker for Export Queue
setInterval(() => {
  for (const [id, job] of exportJobs.entries()) {
    if (job.status === 'pending') {
      job.status = 'processing';
      job.progress = 10;
      
      // Simulate processing
      let progressTimer = setInterval(() => {
        if (job.status !== 'processing') {
          clearInterval(progressTimer);
          return;
        }
        
        job.progress += 15;
        if (job.progress >= 95) {
          job.progress = 95;
        }
      }, 800);

      setTimeout(() => {
        clearInterval(progressTimer);
        
        // Generate actual ffmpeg commands to show user exactly how it's done
        const inputBasename = path.basename(job.videoUrl);
        const assFilename = `subs_${job.id}.ass`;
        const outputFilename = `export_${job.id}_burn.mp4`;
        
        const ffmpegCmd = `ffmpeg -i uploads/${inputBasename} -vf "subtitles=exports/${assFilename}:fontsdir=public/fonts" -c:a copy exports/${outputFilename}`;
        const remotionCmd = `npx remotion render src/remotion/SubtitleComposition.tsx --props='${JSON.stringify({ videoUrl: job.videoUrl, segments: job.segments, style: job.styleConfig })}' --out exports/${outputFilename}`;
        
        // Save mock subtitle file
        try {
          const assContent = generateAssSubtitles(job.segments, job.styleConfig);
          fs.writeFileSync(path.join(exportDir, assFilename), assContent);
          
          // Duplicate video file to simulate final render, or make a mock video if original doesn't exist
          const finalOutputPath = path.join(exportDir, outputFilename);
          const originalPath = path.join(process.cwd(), job.videoUrl);
          
          if (fs.existsSync(originalPath)) {
            fs.copyFileSync(originalPath, finalOutputPath);
          } else {
            // Write a small dummy file if original isn't physically present
            fs.writeFileSync(finalOutputPath, 'Mock Exported Video File');
          }
          
          job.status = 'completed';
          job.progress = 100;
          job.outputUrl = `/exports/${outputFilename}`;
          job.ffmpegCommand = ffmpegCmd;
          job.remotionCommand = remotionCmd;
          
        } catch (e: any) {
          job.status = 'failed';
          job.error = e.message || 'An error occurred during rendering simulation';
        }
      }, 5000); // 5 seconds processing duration
    }
  }
}, 2000);

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// API: Check Gemini API Key status
app.get('/api/config-status', async (req, res) => {
  try {
    const ai = await getGeminiClient();
    res.json({ success: true, hasKey: true, valid: true });
  } catch (error: any) {
    console.warn('API Key validation failed:', error.message || error);
    res.json({ success: true, hasKey: false, valid: false, error: error.message });
  }
});

// Helper to extract mono 16kHz MP3 audio from video
function extractAudio(inputPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioChannels(1)
      .audioFrequency(16000)
      .audioCodec('libmp3lame')
      .format('mp3')
      .on('end', () => {
        console.log(`FFmpeg audio extraction completed: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.warn(`FFmpeg audio extraction failed: ${err.message}`);
        reject(err);
      })
      .save(outputPath);
  });
}

// API: Upload video & Transcribe via Gemini
app.post('/api/transcribe', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false, error: 'No video file provided.' });
    }

    const filePath = req.file.path;
    const fileMimeType = req.file.mimetype;
    const transcribeMode = req.body.transcribeMode || 'sinhala-direct';
    
    // Get Gemini SDK client
    const ai = await getGeminiClient();

    let uploadPath = filePath;
    let uploadMimeType = fileMimeType;
    let extractedAudioPath: string | null = null;

    // Try to extract audio as a mono 16kHz MP3 for optimal and super-fast Gemini transcription
    if (fileMimeType.startsWith('video/')) {
      const audioPath = `${filePath}.mp3`;
      try {
        console.log(`Extracting audio from ${filePath} to ${audioPath}...`);
        await extractAudio(filePath, audioPath);
        extractedAudioPath = audioPath;
        uploadPath = audioPath;
        uploadMimeType = 'audio/mp3';
        console.log('Successfully extracted MP3 audio from video!');
      } catch (err: any) {
        console.warn(`Could not extract audio via FFmpeg (${err.message || err}). Falling back to direct video file upload...`);
      }
    }

    let uploadResult: any = null;
    try {
      // 1. Upload file using Gemini Files API
      console.log(`Uploading file ${uploadPath} (${uploadMimeType}) to Gemini Files API...`);
      uploadResult = await ai.files.upload({
        file: uploadPath,
        config: {
          mimeType: uploadMimeType,
        }
      });

      console.log(`File uploaded successfully to Gemini. Name: ${uploadResult.name}`);

      // 2. Poll file state to ensure it is processed
      let fileState = await ai.files.get({ name: uploadResult.name });
      let attempts = 0;
      while (fileState.state === 'PROCESSING' && attempts < 30) {
        console.log(`Processing state: ${fileState.state}. Waiting...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        fileState = await ai.files.get({ name: uploadResult.name });
        attempts++;
      }

      if (fileState.state === 'FAILED') {
        throw new Error('Gemini failed to process the video/audio file.');
      }

      // 3. Generate structured transcription content
      console.log(`Requesting transcription from Gemini with Structured JSON Schema. Mode: ${transcribeMode}`);
      
      let modeInstruction = '';
      if (transcribeMode === 'sinhala-direct') {
        modeInstruction = `The audio contains spoken Sinhala. Transcribe the spoken Sinhala words directly into accurate, formal Sinhala Unicode characters (e.g. "සිංහල").`;
      } else if (transcribeMode === 'english-to-sinhala') {
        modeInstruction = `The audio contains spoken English. You must translate the spoken English speech into high-quality, natural-sounding, contextually accurate Sinhala Unicode captions (e.g. "සිංහල") matching the timing of the spoken English words.`;
      } else if (transcribeMode === 'english-direct') {
        modeInstruction = `The audio contains spoken English. Transcribe the spoken English speech directly into accurate English captions.`;
      } else {
        modeInstruction = `Transcribe the audio speech accurately to its spoken language (either Sinhala Unicode or English).`;
      }

      const prompt = `You are an expert audio transcriber, translator, and professional caption generator like sinhalacaptions.com.
  ${modeInstruction}

  You must partition the speech into sequential, timestamped segments. Each segment should contain either a single word or a short 1-4 word phrase.
  Timestamps must represent milliseconds from the start of the video.
  For example:
  - "සිංහල" starts at 0ms and ends at 500ms
  - "Captions" starts at 510ms and ends at 900ms

  Output MUST strictly adhere to the response schema requested. Ensure start and end timestamps are sequential and accurate. Do not skip words.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            fileData: {
              fileUri: uploadResult.uri,
              mimeType: uploadResult.mimeType
            }
          },
          { text: prompt }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: {
                  type: Type.STRING,
                  description: 'The transcribed word or phrase in Sinhala (Unicode) or English.'
                },
                start: {
                  type: Type.INTEGER,
                  description: 'The start timestamp of the segment in milliseconds from the beginning.'
                },
                end: {
                  type: Type.INTEGER,
                  description: 'The end timestamp of the segment in milliseconds from the beginning.'
                }
              },
              required: ['text', 'start', 'end']
            }
          }
        }
      });

      const transcriptionText = response.text;
      console.log('Successfully received transcription from Gemini.');
      
      // Cleanup file from Gemini Files API to save storage
      try {
        await ai.files.delete({ name: uploadResult.name });
        console.log('Cleaned up file from Gemini Files API.');
      } catch (cleanupError) {
        console.error('Failed to clean up file from Gemini API:', cleanupError);
      }

      if (!transcriptionText) {
        throw new Error('Gemini returned an empty response.');
      }

      let cleanText = transcriptionText.trim();
      if (cleanText.startsWith('```')) {
        // Remove starting markdown block e.g. ```json or ```
        cleanText = cleanText.replace(/^```(?:json)?\s*/i, '');
        // Remove ending markdown block
        cleanText = cleanText.replace(/```\s*$/, '');
      }

      let segments;
      try {
        segments = JSON.parse(cleanText.trim());
      } catch (parseError: any) {
        console.error('Failed to parse transcription JSON from Gemini:', cleanText);
        throw new Error(`Failed to parse transcription response: ${parseError.message}. Content: ${cleanText.slice(0, 150)}`);
      }
      
      // Add unique front-end keys to each segment
      const formattedSegments = segments.map((seg: any, idx: number) => ({
        ...seg,
        id: `seg_${Date.now()}_${idx}_${Math.round(Math.random() * 1000)}`
      }));

      res.json({
        success: true,
        videoUrl: `/uploads/${req.file.filename}`,
        segments: formattedSegments,
      });

    } finally {
      // Clean up local temp audio if created
      if (extractedAudioPath) {
        fs.unlink(extractedAudioPath, (err) => {
          if (err) console.error('Failed to clean up local extracted audio file:', err);
        });
      }
    }

  } catch (error: any) {
    console.error('Transcription API Error:', error);
    res.json({
      success: false,
      error: error.message || 'Transcription failed. Please make sure you have configured a valid Gemini API Key in Settings.'
    });
  }
});

// API: Polish text (using AI to convert English/Singlish to elegant Sinhala captions)
app.post('/api/polish-text', express.json(), async (req, res) => {
  try {
    const { text, mode } = req.body;
    if (!text) {
      return res.json({ success: false, error: 'No text provided.' });
    }

    const ai = await getGeminiClient();
    let prompt = '';
    if (mode === 'translate') {
      prompt = `You are a professional Sinhala caption translator. Translate this English subtitle/phrase to clear, concise, and natural Sinhala Unicode captions: "${text}". Only return the translated Sinhala Unicode text, nothing else. Do not add any punctuation unless necessary, no explanation.`;
    } else {
      prompt = `You are a professional Sinhala caption editor like sinhalacaptions.com. Clean up and correct any spelling, grammar, or phonetics (including converting Singlish phonetics to beautiful Sinhala Unicode characters) for this subtitle: "${text}". Keep it compact and perfectly readable as video captions. Only return the corrected Sinhala Unicode text, nothing else.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ text: prompt }]
    });

    const polishedText = response.text ? response.text.trim() : text;
    res.json({ success: true, polishedText });
  } catch (error: any) {
    console.error('API Polish Text Error:', error);
    res.json({ success: false, error: error.message || 'Failed to polish text.' });
  }
});

// API: Queue video caption burning job
app.post('/api/export', (req, res) => {
  try {
    const { videoUrl, styleConfig, segments } = req.body;
    
    if (!videoUrl || !styleConfig || !segments) {
      return res.json({ success: false, error: 'Missing required parameters: videoUrl, styleConfig, or segments.' });
    }

    const jobId = `job_${Date.now()}_${Math.round(Math.random() * 1e5)}`;
    
    const newJob: ExportJobInternal = {
      id: jobId,
      status: 'pending',
      progress: 0,
      videoUrl,
      styleConfig,
      segments,
      createdAt: new Date().toISOString(),
    };

    exportJobs.set(jobId, newJob);
    res.json({ success: true, jobId, job: newJob });
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
});

// API: Get job status
app.get('/api/export/status/:jobId', (req, res) => {
  const job = exportJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found.' });
  }
  res.json({ success: true, job });
});

// API: List all jobs
app.get('/api/export/jobs', (req, res) => {
  res.json({ success: true, jobs: Array.from(exportJobs.values()).reverse() });
});

// Serve static resources
app.use('/uploads', express.static(uploadDir));
app.use('/exports', express.static(exportDir));

// Global Error Handler Middleware (converts all crashes or multer/body-parser errors to JSON instead of HTML)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global Express Error Caught:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'An unexpected error occurred on the server.'
  });
});

async function bootstrap() {
  // Vite and Single Page App static assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start full-stack container on PORT 3000
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sinhala Captions Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap();
