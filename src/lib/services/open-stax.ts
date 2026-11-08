export async function searchOpenStax(query: string, limit = 10): Promise<any[]> {
  try {
    const res = await fetch(
      `https://openstax.org/subjects?q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const html = await res.text();

    const books: any[] = [];
    const bookRegex = /<a[^>]*href="([^"]*\/books\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
    let match = bookRegex.exec(html);
    let count = 0;

    while (match && count < limit) {
      const url = match[1].startsWith('http') ? match[1] : `https://openstax.org${match[1]}`;
      const title = match[2].replace(/<[^>]*>/g, '').trim();
      if (title && url) {
        books.push({
          id: `openstax-${url.split('/').filter(Boolean).pop()}`,
          title: title || 'OpenStax Textbook',
          description: 'OpenStax - Free peer-reviewed textbook',
          url,
          source: 'openstax' as const,
          type: 'course' as const,
          thumbnail: '/assets/extracted/course_softskills.svg',
        });
        count++;
      }
      match = bookRegex.exec(html);
    }
    return books;
  } catch {
    return [];
  }
}