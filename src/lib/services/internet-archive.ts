export async function searchArchiveVideos(query: string, rows = 10): Promise<any[]> {
  try {
    const res = await fetch(
      `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=title,identifier,description&rows=${rows}&output=json`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.response?.docs || []).map((doc: any) => ({
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