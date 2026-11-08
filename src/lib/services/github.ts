export async function searchGitHubCourses(query: string, perPage = 10): Promise<any[]> {
  try {
    const res = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(`${query} tutorial course`)}&per_page=${perPage}&sort=stars`,
      { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.items || []).map((repo: any) => ({
      id: `gh-${repo.id}`,
      title: repo.name,
      description: repo.description,
      url: repo.html_url,
      stars: repo.stargazers_count,
      language: repo.language,
      source: 'github' as const,
    }));
  } catch {
    return [];
  }
}