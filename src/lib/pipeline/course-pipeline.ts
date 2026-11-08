import {
  searchArxivPapers,
} from '../services/arxiv';
import {
  searchCrossrefWorks,
} from '../services/crossref';
import {
  searchGitHubCourses,
} from '../services/github';
import {
  searchArchiveVideos,
} from '../services/internet-archive';
import {
  searchMitOcw,
} from '../services/mit-ocw';
import {
  searchOpenEdx,
} from '../services/open-edx';
import {
  searchOpenStax,
} from '../services/open-stax';
import {
  searchOpenAlexWorks,
} from '../services/openalex';
import {
  searchWikipedia,
} from '../services/wikimedia';
import {
  searchYouTubeVideos,
} from '../services/youtube';

export interface UnifiedSearchResult {
  id: string;
  title: string;
  description?: string;
  url: string;
  source:
    | 'youtube'
    | 'archive'
    | 'github'
    | 'arxiv'
    | 'crossref'
    | 'openalex'
    | 'wikipedia'
    | 'mit-ocw'
    | 'open-edx'
    | 'openstax';
  type: 'video' | 'course' | 'lesson' | 'article';
  duration?: number;
  views?: number;
  stars?: number;
  language?: string;
  thumbnail?: string;
}

export interface SearchCacheEntry {
  query: string;
  results: UnifiedSearchResult[];
  cachedAt: number;
  ttlMs: number;
}

function cleanText(str?: string): string {
  if (!str) return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDefaultThumbnail(source: string): string {
  switch (source) {
    case 'youtube': return '/assets/extracted/course_webdev.svg';
    case 'github': return '/assets/extracted/course_webdev.svg';
    case 'arxiv': return '/assets/extracted/course_ml.svg';
    case 'crossref': return '/assets/extracted/course_python.svg';
    case 'openalex': return '/assets/extracted/course_datascience.svg';
    case 'mit-ocw': return '/assets/extracted/course_cloud.svg';
    case 'open-edx': return '/assets/extracted/course_cybersecurity.svg';
    case 'openstax': return '/assets/extracted/course_softskills.svg';
    default: return '/assets/extracted/course_default.svg';
  }
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Simple in-memory cache (in production, use Turso DB)
const searchCache = new Map<string, SearchCacheEntry>();

function getCachedResults(query: string): UnifiedSearchResult[] | null {
  const entry = searchCache.get(query.toLowerCase().trim());
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > entry.ttlMs) {
    searchCache.delete(query.toLowerCase().trim());
    return null;
  }
  return entry.results;
}

function setCachedResults(query: string, results: UnifiedSearchResult[]): void {
  searchCache.set(query.toLowerCase().trim(), {
    query: query.toLowerCase().trim(),
    results,
    cachedAt: Date.now(),
    ttlMs: CACHE_TTL_MS,
  });
}

export async function searchAllSources(query: string, options?: {
  includeVideos?: boolean;
  includeCourses?: boolean;
  includeLessons?: boolean;
  maxPerSource?: number;
  useCache?: boolean;
}): Promise<UnifiedSearchResult[]> {
  const maxPerSource = options?.maxPerSource || 5;
  const useCache = options?.useCache !== false; // default true

  // If running in browser, proxy through backend API for server keys (e.g. YouTube API)
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams({
        q: query,
        includeVideos: String(options?.includeVideos !== false),
        includeCourses: String(options?.includeCourses !== false),
        includeLessons: String(options?.includeLessons === true),
        maxPerSource: String(maxPerSource),
      });
      const res = await fetch(`/api/courses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.results)) {
          return data.results;
        }
      }
    } catch (_err) {
      // Fallback to direct client scraping below
    }
  }

  // Check cache first
  const cached = useCache ? getCachedResults(query) : null;
  if (cached) {
    return cached;
  }

  const results: UnifiedSearchResult[] = [];

  // Videos in parallel - YouTube is primary
  if (options?.includeVideos !== false) {
    const [youtube, archive] = await Promise.allSettled([
      searchYouTubeVideos(query, maxPerSource),
      searchArchiveVideos(query, maxPerSource),
    ]);

    if (youtube.status === 'fulfilled')
      results.push(...youtube.value.map(v => ({
        id: `yt-${v.id}`,
        title: v.title,
        description: v.description,
        url: v.url,
        source: 'youtube' as const,
        type: 'video' as const,
        duration: v.duration,
        views: v.views,
        thumbnail: v.thumbnail,
      })));

    if (archive.status === 'fulfilled')
      results.push(...archive.value.map(v => ({
        id: `ia-${v.id}`,
        title: cleanText(v.title),
        description: cleanText(v.description) || 'Archived educational video lecture',
        url: v.url,
        source: 'archive' as const,
        type: 'video' as const,
        thumbnail: v.thumbnail || getDefaultThumbnail('archive'),
      })));
  }

  // Courses in parallel
  if (options?.includeCourses !== false) {
    const [github, arxiv, crossref, openalex, mitOcw, openEdx, openStax] = await Promise.allSettled([
      searchGitHubCourses(query, maxPerSource),
      searchArxivPapers(query, maxPerSource),
      searchCrossrefWorks(query, maxPerSource),
      searchOpenAlexWorks(query, maxPerSource),
      searchMitOcw(query, maxPerSource),
      searchOpenEdx(query, maxPerSource),
      searchOpenStax(query, maxPerSource),
    ]);

    if (github.status === 'fulfilled')
      results.push(...github.value.map(g => ({
        id: g.id,
        title: cleanText(g.title),
        description: cleanText(g.description),
        url: g.url,
        source: 'github' as const,
        type: 'course' as const,
        stars: g.stars,
        language: g.language,
        thumbnail: g.thumbnail || getDefaultThumbnail('github'),
      })));

    if (arxiv.status === 'fulfilled')
      results.push(...arxiv.value.map(a => ({
        id: a.id,
        title: cleanText(a.title),
        description: cleanText(a.description),
        url: a.url,
        source: 'arxiv' as const,
        type: 'lesson' as const,
        thumbnail: a.thumbnail || getDefaultThumbnail('arxiv'),
      })));

    if (crossref.status === 'fulfilled')
      results.push(...crossref.value.map(c => ({
        id: c.id,
        title: cleanText(c.title),
        description: cleanText(c.description),
        url: c.url,
        source: 'crossref' as const,
        type: 'lesson' as const,
        thumbnail: c.thumbnail || getDefaultThumbnail('crossref'),
      })));

    if (openalex.status === 'fulfilled')
      results.push(...openalex.value.map(o => ({
        id: o.id,
        title: cleanText(o.title),
        description: cleanText(o.description),
        url: o.url,
        source: 'openalex' as const,
        type: 'lesson' as const,
        thumbnail: o.thumbnail || getDefaultThumbnail('openalex'),
      })));

    if (mitOcw.status === 'fulfilled')
      results.push(...mitOcw.value.map(m => ({
        id: m.id,
        title: cleanText(m.title),
        description: cleanText(m.description),
        url: m.url,
        source: 'mit-ocw' as const,
        type: 'course' as const,
        thumbnail: m.thumbnail || getDefaultThumbnail('mit-ocw'),
      })));

    if (openEdx.status === 'fulfilled')
      results.push(...openEdx.value.map(e => ({
        id: e.id,
        title: cleanText(e.title),
        description: cleanText(e.description),
        url: e.url,
        source: 'open-edx' as const,
        type: 'course' as const,
        thumbnail: e.thumbnail || getDefaultThumbnail('open-edx'),
      })));

    if (openStax.status === 'fulfilled')
      results.push(...openStax.value.map(s => ({
        id: s.id,
        title: cleanText(s.title),
        description: cleanText(s.description),
        url: s.url,
        source: 'openstax' as const,
        type: 'course' as const,
        thumbnail: s.thumbnail || getDefaultThumbnail('openstax'),
      })));
  }

  // Lessons (concept explanations from Wikipedia)
  if (options?.includeLessons !== false) {
    const wiki = await searchWikipedia(query, maxPerSource);
    results.push(...wiki.map(w => ({
      id: w.id,
      title: cleanText(w.title),
      description: cleanText(w.description),
      url: w.url,
      source: 'wikipedia' as const,
      type: 'lesson' as const,
      thumbnail: getDefaultThumbnail('wikipedia'),
    })));
  }

  // Cache results
  if (useCache) {
    setCachedResults(query, results);
  }

  return results;
}

export { CACHE_TTL_MS, getCachedResults, setCachedResults };