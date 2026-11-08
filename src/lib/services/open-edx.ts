export async function searchOpenEdx(query: string, limit = 10): Promise<any[]> {
  try {
    const res = await fetch(
      `https://courses.edx.org/api/courses/v1/courses/?search_term=${encodeURIComponent(query)}&page_size=${limit}`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || []).map((course: any) => ({
      id: `edx-${course.id || course.course_id || Date.now()}`,
      title: course.title || 'Untitled Course',
      description: course.short_description || course.description || '',
      url: `https://courses.edx.org/courses/${course.id || course.course_id}`,
      source: 'open-edx' as const,
      type: 'course' as const,
    }));
  } catch {
    return [];
  }
}