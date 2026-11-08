export async function searchCrossrefWorks(query: string, rows = 10): Promise<any[]> {
  try {
    // Add "programming computer science" to avoid ambiguity (e.g. "python" snake)
    const searchQuery = `${query} programming computer science`;
    const res = await fetch(
      `https://api.crossref.org/works?query=${encodeURIComponent(searchQuery)}&rows=${rows}&select=title,author,URL,published`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.message?.items || [])
      // Filter out irrelevant biological/animal papers
      .filter((item: any) => {
        const title = item.title?.[0]?.toLowerCase() || '';
        return !title.includes('rock python') &&
               !title.includes('python sebae') &&
               !title.includes('animal') &&
               !title.includes('species');
      })
      .map((item: any) => ({
        id: `cr-${item.URL}`,
        title: item.title?.[0] || 'Untitled',
        description: item.author?.[0]?.family ? `By ${item.author.family}` : '',
        url: item.URL,
        source: 'crossref' as const,
        thumbnail: '/assets/extracted/course_python.svg',
      }));
  } catch {
    return [];
  }
}