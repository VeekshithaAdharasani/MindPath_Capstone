export async function searchArxivPapers(query: string, maxResults = 10): Promise<any[]> {
  try {
    const res = await fetch(
      `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=${maxResults}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const text = await res.text();

    const entries = text.split('<entry>').slice(1);
    return entries.map((entry: string) => {
      const titleMatch = entry.match(/<title>(.*?)<\/title>/s);
      const idMatch = entry.match(/<id>(.*?)<\/id>/);
      const summaryMatch = entry.match(/<summary>(.*?)<\/summary>/s);

      return {
        id: `arxiv-${idMatch?.[1]?.split('/abs/').pop() || 'unknown'}`,
        title: titleMatch?.[1]?.replace(/\s+/g, ' ').trim() || 'Untitled Paper',
        description: summaryMatch?.[1]?.replace(/\s+/g, ' ').trim() || '',
        url: idMatch?.[1] || '',
        source: 'arxiv' as const,
        thumbnail: '/assets/extracted/course_ml.svg',
      };
    });
  } catch {
    return [];
  }
}