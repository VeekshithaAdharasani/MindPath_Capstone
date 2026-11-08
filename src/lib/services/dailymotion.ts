export async function searchDailymotionVideos(query: string, limit = 10): Promise<any[]> {
  try {
    const res = await fetch(
      `https://api.dailymotion.com/videos?search=${encodeURIComponent(query)}&limit=${limit}&fields=title,id,duration,language,views_total,thumbnail_url`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.list || []).map((video: any) => ({
      id: video.id,
      title: video.title,
      channel: 'Dailymotion',
      thumbnail: video.thumbnail_url,
      url: `https://www.dailymotion.com/video/${video.id}`,
      duration: video.duration,
      views: video.views_total,
      language: video.language,
      source: 'dailymotion',
    }));
  } catch {
    return [];
  }
}