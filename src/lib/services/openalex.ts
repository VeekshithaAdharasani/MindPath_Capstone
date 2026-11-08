export async function searchOpenAlexWorks(query: string, perPage = 10): Promise<any[]> {
  try {
    const res = await fetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${perPage}&mailto=your@email.com`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || []).map((work: any) => ({
      id: `oa-${work.id}`,
      title: work.title,
      description: `Cited by ${work.cited_by_count} works`,
      url: work.primary_location?.landing_page_url || work.id,
      source: 'openalex' as const,
    }));
  } catch {
    return [];
  }
}