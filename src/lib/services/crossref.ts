export async function searchCrossrefWorks(query: string, rows = 10): Promise<any[]> {
  try {
    const res = await fetch(
      `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${rows}&select=title,author,URL,published`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.message?.items || []).map((item: any) => ({
      id: `cr-${item.URL}`,
      title: item.title?.[0] || 'Untitled',
      description: item.author?.[0]?.family ? `By ${item.author.family}` : '',
      url: item.URL,
      source: 'crossref' as const,
    }));
  } catch {
    return [];
  }
}