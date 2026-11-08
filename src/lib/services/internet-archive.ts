export async function searchArchiveVideos(query: string, rows = 10): Promise<any[]> {
  try {
    // Search for educational programming content only
    const searchQuery = `${query} programming tutorial course`;
    const res = await fetch(
      `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchQuery)}&fl[]=title,identifier,description,mediatype&rows=${rows}&output=json`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.response?.docs || [])
      // Filter to only movies/videos (not audio, not software, etc.)
      .filter((doc: any) => doc.mediatype === 'movies' || doc.mediatype === 'etree')
      .map((doc: any) => ({
        id: doc.identifier,
        title: doc.title || 'Untitled',
        channel: 'Internet Archive',
        url: `https://archive.org/details/${doc.identifier}`,
        description: doc.description,
        source: 'archive',
      }));
  } catch {
    return [];
  }
}