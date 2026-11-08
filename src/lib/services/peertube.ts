export async function searchPeerTubeVideos(query: string, count = 10): Promise<any[]> {
  try {
    const res = await fetch(
      `https://peertube2.cpy.re/api/v1/search/videos?search=${encodeURIComponent(query)}&count=${count}&languageOneOf=en`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.data || []).map((video: any) => ({
      id: video.uuid,
      title: video.name,
      channel: video.channel?.name || 'PeerTube',
      thumbnail: video.thumbnail,
      url: `https://peertube2.cpy.re/videos/watch/${video.uuid}`,
      duration: video.duration,
      views: video.views,
      source: 'peertube',
      description: video.description,
    }));
  } catch {
    return [];
  }
}