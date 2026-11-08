export async function searchWikipedia(query: string, limit = 5): Promise<any[]> {
  try {
    const searchTerm = query.toLowerCase().includes('programming') ? query : `${query} programming`;
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&srlimit=${limit}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.query?.search || []).map((item: any) => ({
      id: `wiki-${item.pageid}`,
      title: item.title,
      description: item.snippet.replace(/<[^>]*>/g, ''),
      url: `https://en.wikipedia.org/wiki/${item.title.replace(/ /g, '_')}`,
      source: 'wikipedia' as const,
    }));
  } catch {
    return [];
  }
}