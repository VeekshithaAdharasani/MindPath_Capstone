function cleanText(str?: string): string {
  if (!str) return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function searchOpenEdx(query: string, limit = 10): Promise<any[]> {
  try {
    const res = await fetch(
      `https://courses.edx.org/api/courses/v1/courses/?search_term=${encodeURIComponent(query)}&page_size=${limit}`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || [])
      .map((course: any) => {
        const title = cleanText(course.name || course.title || '');
        const desc = cleanText(course.short_description || course.description || '');
        const courseId = course.id || course.course_id || '';
        const image =
          course.media?.image?.large ||
          course.media?.image?.raw ||
          course.media?.banner_image?.uri_absolute ||
          '/assets/extracted/course_cloud.svg';

        return {
          id: `edx-${courseId || Date.now()}`,
          title,
          description: desc || `${title} - Comprehensive verified course curriculum on Open edX.`,
          url: `https://courses.edx.org/courses/${courseId}`,
          source: 'open-edx' as const,
          type: 'course' as const,
          thumbnail: image,
        };
      })
      .filter((c: any) => {
        const t = c.title.toLowerCase();
        return (
          t.length > 3 &&
          t !== 'untitled course' &&
          t !== 'ntest' &&
          !t.includes('<html')
        );
      });
  } catch {
    return [];
  }
}