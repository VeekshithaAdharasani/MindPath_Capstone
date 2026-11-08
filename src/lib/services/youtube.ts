export interface VideoResult {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  url: string;
  duration?: number;
  views?: number;
  source: 'youtube' | 'peertube' | 'dailymotion' | 'archive';
  description?: string;
}

export async function searchYouTubeVideos(query: string, maxResults = 10): Promise<VideoResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video&key=${apiKey}`
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.items || []).map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || '',
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      source: 'youtube',
      description: item.snippet.description,
    }));
  } catch {
    return [];
  }
}