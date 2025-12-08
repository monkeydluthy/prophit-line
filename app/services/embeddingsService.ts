import OpenAI from 'openai';
import { MarketResult } from '@/types';

// Initialize OpenAI client for embeddings (optional - requires OPENAI_API_KEY)
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Hugging Face API (free alternative - no credit card required)
// Get free API key from: https://huggingface.co/settings/tokens
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || null;
const HUGGINGFACE_EMBEDDINGS_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';

// Cache for embeddings to avoid regenerating
const embeddingsCache = new Map<string, number[]>();
const SIMILARITY_THRESHOLD = 0.75; // Cosine similarity threshold for matches (0-1) - lowered from 0.85

/**
 * Generate embedding for a market title
 * Tries OpenAI first, falls back to Hugging Face (free) if available
 */
async function getEmbedding(text: string): Promise<number[] | null> {
  // Check cache first
  if (embeddingsCache.has(text)) {
    return embeddingsCache.get(text)!;
  }

  // Try OpenAI first (if available)
  if (openai) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small', // $0.02 per 1M tokens
        input: text,
      });

      const embedding = response.data[0].embedding;
      embeddingsCache.set(text, embedding);
      return embedding;
    } catch (error) {
      console.warn('[Embeddings] OpenAI failed, trying Hugging Face:', error);
      // Fall through to Hugging Face
    }
  }

  // Fallback to Hugging Face (free, no credit card required)
  if (HUGGINGFACE_API_KEY) {
    try {
      const response = await fetch(HUGGINGFACE_EMBEDDINGS_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      });

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status}`);
      }

      const embedding = await response.json();
      // Hugging Face returns array directly (not wrapped in data)
      const embeddingArray = Array.isArray(embedding) ? embedding : embedding[0];
      
      embeddingsCache.set(text, embeddingArray);
      
      // Limit cache size
      if (embeddingsCache.size > 5000) {
        const firstKey = embeddingsCache.keys().next().value;
        embeddingsCache.delete(firstKey);
      }

      return embeddingArray;
    } catch (error) {
      console.error('[Embeddings] Hugging Face error:', error);
      return null;
    }
  }

  return null;
}

/**
 * Calculate cosine similarity between two embeddings
 * Returns a value between 0 and 1 (1 = identical, 0 = completely different)
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    return 0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Batch generate embeddings for multiple texts
 * More efficient than individual calls
 */
export async function getEmbeddingsBatch(texts: string[]): Promise<Map<string, number[]>> {
  if ((!openai && !HUGGINGFACE_API_KEY) || texts.length === 0) {
    return new Map();
  }

  // Filter out texts we already have cached
  const textsToEmbed = texts.filter(text => !embeddingsCache.has(text));
  
  if (textsToEmbed.length === 0) {
    // All cached, return from cache
    const result = new Map<string, number[]>();
    for (const text of texts) {
      const embedding = embeddingsCache.get(text);
      if (embedding) {
        result.set(text, embedding);
      }
    }
    return result;
  }

  try {
    // OpenAI allows up to 2048 texts per batch
    const batchSize = 100; // Conservative batch size
    const result = new Map<string, number[]>();

    for (let i = 0; i < textsToEmbed.length; i += batchSize) {
      const batch = textsToEmbed.slice(i, i + batchSize);
      
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      });

      // Map responses back to texts
      for (let j = 0; j < batch.length; j++) {
        const text = batch[j];
        const embedding = response.data[j].embedding;
        embeddingsCache.set(text, embedding);
        result.set(text, embedding);
      }
    }

    // Add cached texts that weren't in the batch
    for (const text of texts) {
      if (!result.has(text) && embeddingsCache.has(text)) {
        result.set(text, embeddingsCache.get(text)!);
      }
    }

    return result;
  } catch (error) {
    console.error('[Embeddings] Error in batch generation:', error);
    return new Map();
  }
}

/**
 * Check if two markets are equivalent using embeddings
 * Returns similarity score (0-1) and match boolean
 */
export async function areMarketsEquivalentEmbeddings(
  market1: MarketResult,
  market2: MarketResult
): Promise<{ match: boolean; similarity: number } | null> {
  if (!openai) {
    return null;
  }

  // Generate embeddings for both titles
  const embedding1 = await getEmbedding(market1.title);
  const embedding2 = await getEmbedding(market2.title);

  if (!embedding1 || !embedding2) {
    return null;
  }

  // Calculate cosine similarity
  const similarity = cosineSimilarity(embedding1, embedding2);
  const match = similarity >= SIMILARITY_THRESHOLD;

  return { match, similarity };
}

/**
 * Extract main subject from title (simple version for embeddings matching)
 */
function extractSubjectSimple(title: string): string {
  const normalized = title.toLowerCase();
  const entities = [
    'bitcoin', 'btc', 'ethereum', 'eth', 'trump', 'donald trump', 'biden', 'joe biden',
    'musk', 'elon musk', 'fed', 'federal reserve', 'super bowl', 'nfl', 'nba', 'election',
    'presidential election', 'governor', 'senate', 'house', 'tesla', 'nvidia'
  ];
  
  for (const entity of entities) {
    if (normalized.includes(entity)) {
      if (entity === 'donald trump') return 'trump';
      if (entity === 'joe biden') return 'biden';
      if (entity === 'federal reserve' || entity === 'federal') return 'fed';
      if (entity === 'bitcoin' || entity === 'btc') return 'bitcoin';
      if (entity === 'ethereum' || entity === 'eth') return 'ethereum';
      return entity;
    }
  }
  
  // Extract first capitalized word as subject
  const words = title.split(' ');
  const properNouns = words.filter(w => w.length > 0 && w[0] === w[0].toUpperCase());
  return properNouns[0]?.toLowerCase() || 'unknown';
}

/**
 * Find matching markets using embeddings
 * More efficient: generates embeddings in batch, then compares only markets with same subject
 */
export async function findMatchesWithEmbeddings(
  kalshiMarkets: MarketResult[],
  polyMarkets: MarketResult[]
): Promise<Array<{ kalshi: MarketResult; poly: MarketResult; similarity: number }>> {
  if (!openai) {
    return [];
  }

  // Index markets by subject to only compare relevant pairs
  const kalshiBySubject = new Map<string, MarketResult[]>();
  const polyBySubject = new Map<string, MarketResult[]>();
  
  kalshiMarkets.forEach(m => {
    const subject = extractSubjectSimple(m.title);
    if (!kalshiBySubject.has(subject)) kalshiBySubject.set(subject, []);
    kalshiBySubject.get(subject)!.push(m);
  });
  
  polyMarkets.forEach(m => {
    const subject = extractSubjectSimple(m.title);
    if (!polyBySubject.has(subject)) polyBySubject.set(subject, []);
    polyBySubject.get(subject)!.push(m);
  });

  // Collect all unique titles that might be compared
  const allTitles = new Set<string>();
  for (const [subject, kalshiMarketsForSubject] of kalshiBySubject.entries()) {
    const polyMarketsForSubject = polyBySubject.get(subject) || [];
    if (polyMarketsForSubject.length > 0) {
      kalshiMarketsForSubject.forEach(m => allTitles.add(m.title));
      polyMarketsForSubject.forEach(m => allTitles.add(m.title));
    }
  }

  // Generate embeddings for all titles in batch
  console.log(`[Embeddings] Generating embeddings for ${allTitles.size} unique titles...`);
  const embeddings = await getEmbeddingsBatch(Array.from(allTitles));
  console.log(`[Embeddings] Generated ${embeddings.size} embeddings`);

  // Find matches - only compare markets with same subject
  const matches: Array<{ kalshi: MarketResult; poly: MarketResult; similarity: number }> = [];
  const topSimilarities: Array<{ kalshi: string; poly: string; sim: number }> = [];

  for (const [subject, kalshiMarketsForSubject] of kalshiBySubject.entries()) {
    const polyMarketsForSubject = polyBySubject.get(subject) || [];
    if (polyMarketsForSubject.length === 0) continue;

    for (const kalshiMarket of kalshiMarketsForSubject) {
      const kalshiEmbedding = embeddings.get(kalshiMarket.title);
      if (!kalshiEmbedding) continue;

      for (const polyMarket of polyMarketsForSubject) {
        const polyEmbedding = embeddings.get(polyMarket.title);
        if (!polyEmbedding) continue;

        const similarity = cosineSimilarity(kalshiEmbedding, polyEmbedding);
        
        // Track top similarities for debugging
        if (topSimilarities.length < 10 || similarity > topSimilarities[9].sim) {
          topSimilarities.push({ kalshi: kalshiMarket.title, poly: polyMarket.title, sim: similarity });
          topSimilarities.sort((a, b) => b.sim - a.sim);
          if (topSimilarities.length > 10) topSimilarities.pop();
        }
        
        if (similarity >= SIMILARITY_THRESHOLD) {
          matches.push({
            kalshi: kalshiMarket,
            poly: polyMarket,
            similarity,
          });
        }
      }
    }
  }

  // Sort by similarity (highest first)
  matches.sort((a, b) => b.similarity - a.similarity);

  console.log(`[Embeddings] Found ${matches.length} matches above ${SIMILARITY_THRESHOLD} similarity threshold`);
  
  // Log top similarities for debugging
  if (topSimilarities.length > 0) {
    console.log(`[Embeddings] Top similarity scores (for debugging):`);
    topSimilarities.slice(0, 5).forEach(({ kalshi, poly, sim }) => {
      console.log(`  ${(sim * 100).toFixed(1)}%: "${kalshi.substring(0, 40)}" vs "${poly.substring(0, 40)}"`);
    });
  }
  
  return matches;
}

/**
 * Check if embeddings service is available
 */
export function isEmbeddingsAvailable(): boolean {
  return openai !== null;
}

