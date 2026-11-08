export async function searchMitOcw(query: string, limit = 10): Promise<any[]> {
  try {
    const res = await fetch(
      `https://ocw.mit.edu/search/?q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const html = await res.text();

    // Better regex for MIT OCW results
    const courses: any[] = [];
    const patterns = [
      /<a[^>]*href="([^"]*\/courses\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g,
      /<h3[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/g,
    ];

    for (const regex of patterns) {
      let match = regex.exec(html);
      while (match && courses.length < limit) {
        const url = match[1].startsWith('http') ? match[1] : `https://ocw.mit.edu${match[1]}`;
        const rawTitle = match[2].replace(/<[^>]*>/g, '').replace(/&[a-z0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
        if (
          rawTitle.length > 4 &&
          rawTitle.length < 120 &&
          !rawTitle.includes('{') &&
          !rawTitle.includes(';') &&
          !rawTitle.toLowerCase().includes('script') &&
          !rawTitle.toLowerCase().includes('cookie') &&
          url &&
          !courses.find(c => c.url === url)
        ) {
          courses.push({
            id: `mit-${url.split('/').filter(Boolean).pop()}`,
            title: rawTitle,
            description: `${rawTitle} - Official MIT OpenCourseWare curriculum & lecture materials.`,
            url,
            source: 'mit-ocw' as const,
            type: 'course' as const,
            thumbnail: '/assets/extracted/course_webdev.svg',
          });
        }
        match = regex.exec(html);
      }
    }
    return courses;
  } catch {
    return [];
  }
}