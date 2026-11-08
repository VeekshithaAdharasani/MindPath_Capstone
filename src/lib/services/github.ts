function cleanText(str?: string): string {
  if (!str) return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function searchGitHubCourses(query: string, perPage = 10): Promise<any[]> {
  try {
    const res = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(`${query} tutorial course`)}&per_page=${perPage}&sort=stars`,
      { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.items || [])
      .filter((repo: any) => {
        const name = (repo.name || '').toLowerCase().trim();
        const desc = (repo.description || '').toLowerCase();
        return (
          name.length > 3 &&
          !name.startsWith('ok') &&
          !name.includes('w3school') &&
          !name.includes('<html') &&
          !desc.includes('<html') &&
          !desc.includes('<!doctype') &&
          !desc.includes('<script') &&
          !/^[_\-.]/.test(name)
        );
      })
      .map((repo: any) => {
        const formattedTitle = repo.name
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (l: string) => l.toUpperCase())
          .trim();
        const cleanedDesc = cleanText(repo.description);
        return {
          id: `gh-${repo.id}`,
          title: formattedTitle,
          description: cleanedDesc || `${formattedTitle} - Open source curriculum and hands-on coding repositories.`,
          url: repo.html_url,
          stars: repo.stargazers_count,
          language: repo.language,
          source: 'github' as const,
          thumbnail: repo.owner?.avatar_url || '/assets/extracted/course_webdev.svg',
        };
      });
  } catch {
    return [];
  }
}