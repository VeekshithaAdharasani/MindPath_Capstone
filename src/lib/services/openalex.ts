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
      title: work.title || 'Academic Research Work',
      description: `Peer-reviewed academic research • Cited by ${work.cited_by_count || 0} scholarly works`,
      url: work.primary_location?.landing_page_url || work.id,
      source: 'openalex' as const,
      thumbnail: '/assets/extracted/course_datascience.svg',
    }));
  } catch {
    return [];
  }
}