export async function searchMitOcw(query: string, limit = 10): Promise<any[]> {
  try {
    // MIT OCW search page scraping - public HTML endpoint
    const res = await fetch(
      `https://ocw.mit.edu/search/?q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const html = await res.text();

    // Basic HTML parsing for course titles and links
    const courses: any[] = [];
    const courseRegex = /<a[^>]*href="([^"]*\/courses\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
    let match = courseRegex.exec(html);
    let count = 0;

    while (match !== null && count < limit) {
      const url = match[1].startsWith('http') ? match[1] : `https://ocw.mit.edu${match[1]}`;
      const title = match[2].replace(/<[^>]*>/g, '').trim();
      if (title && url) {
        courses.push({
          id: `mit-${url.split('/').pop()}`,
          title: title || 'MIT OCW Course',
          description: 'MIT OpenCourseWare - Free course materials',
          url,
          source: 'mit-ocw' as const,
          type: 'course',
        });
        count++;
      }
      match = courseRegex.exec(html);
    }
    return courses;
  } catch {
    return [];
  }
}