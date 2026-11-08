export async function searchOpenEdx(query: string, limit = 10): Promise<any[]> {
  try {
    const res = await fetch(
      `https://courses.edx.org/api/courses/v1/courses/?search=${encodeURIComponent(query)}&page_size=${limit}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || []).map((course: any) => ({
      id: `edx-${course.id || course.course_id}`,
      title: course.title || 'Untitled Course',
      description: course.short_description || course.description || '',
      url: `https://courses.edx.org/courses/${course.id || course.course_id}`,
      source: 'open-edx' as const,
      type: 'course',
    }));
  } catch {
    return [];
  }
}