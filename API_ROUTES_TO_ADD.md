# API Routes to Add to api/index.js

Add these route handlers to your existing `api/index.js` Express server:

## 1. GET /api/courses?q= - Course Discovery
```javascript
app.get('/api/courses', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  const { searchAllSources } = require('./src/lib/pipeline/course-pipeline');
  const results = await searchAllSources(q, {
    includeVideos: false,
    includeCourses: true,
    includeLessons: false,
    maxPerSource: 10,
    useCache: true,
  });

  return res.json({ success: true, query: q, results });
});
```

## 2. GET /api/videos?q= - Video Aggregation (YouTube + Internet Archive)
```javascript
app.get('/api/videos', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  const { searchAllSources } = require('./src/lib/pipeline/course-pipeline');
  const results = await searchAllSources(q, {
    includeVideos: true,
    includeCourses: false,
    includeLessons: false,
    maxPerSource: 10,
    useCache: true,
  });

  return res.json({ success: true, query: q, results });
});
```

## 3. GET /api/lessons?q= - Lesson Content
```javascript
app.get('/api/lessons', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  const { searchAllSources } = require('./src/lib/pipeline/course-pipeline');
  const results = await searchAllSources(q, {
    includeVideos: false,
    includeCourses: false,
    includeLessons: true,
    maxPerSource: 10,
    useCache: true,
  });

  return res.json({ success: true, query: q, results });
});
```

## 4. POST /api/career/path - AI Career Path
```javascript
app.post('/api/career/path', async (req, res) => {
  const { goal, userId } = req.body;
  if (!goal) return res.status(400).json({ error: 'Goal required' });

  const { generateCareerPath } = require('./src/lib/services/enzonic-ai');
  
  try {
    const path = await generateCareerPath(goal);
    
    // Store in Turso
    const id = `cp_${Date.now()}`;
    await client.execute({
      sql: 'INSERT INTO generated_career_paths (id, user_id, goal, path_json, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [id, userId || 'anonymous', goal, JSON.stringify(path), Date.now()]
    });

    return res.json({ success: true, path, id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
```

## 5. POST /api/quiz/generate - AI Quiz Generation
```javascript
app.post('/api/quiz/generate', async (req, res) => {
  const { topic, level, numQuestions } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic required' });

  const { generateQuiz } = require('./src/lib/services/enzonic-ai');
  
  try {
    const quiz = await generateQuiz(topic, level || 'beginner', numQuestions || 10);
    return res.json({ success: true, quiz });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
```

## 6. POST /api/storage/upload - R2 File Upload
```javascript
app.post('/api/storage/upload', async (req, res) => {
  const { key, buffer, contentType } = req.body;
  if (!key || !buffer) return res.status(400).json({ error: 'Key and buffer required' });

  const { uploadToR2 } = require('./src/lib/storage/r2');
  
  try {
    const result = await uploadToR2(key, Buffer.from(buffer, 'base64'), contentType || 'image/png');
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
```

## 7. Database Schema - Run these in Turso
Run this SQL against your Turso database (nova-ai-aztech1729.aws-ap-south-1.turso.io):

```sql
CREATE TABLE IF NOT EXISTS course_enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  course_title TEXT NOT NULL,
  source TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  enrolled_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE TABLE IF NOT EXISTS user_course_lessons (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  lesson_title TEXT NOT NULL,
  video_url TEXT,
  video_source TEXT,
  completed INTEGER DEFAULT 0,
  completed_at INTEGER
);

CREATE TABLE IF NOT EXISTS generated_career_paths (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  goal TEXT NOT NULL,
  path_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_lessons_user ON user_course_lessons(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_generated_career_paths_user ON generated_career_paths(user_id);
```

## 8. Environment Variables Needed (.env)
```
# Already have:
TURSO_DATABASE_URL="libsql://nova-ai-aztech1729.aws-ap-south-1.turso.io"
TURSO_AUTH_TOKEN="..."
R2_ACCOUNT_ID="ab2af3d71ef8359a0eb12fed2d7919d5"
R2_ACCESS_KEY_ID="e8c94837df33b1717c38f8e6e85090c8"
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="nova-ai"
R2_ENDPOINT="https://ab2af3d71ef8359a0eb12fed2d7919d5.r2.cloudflarestorage.com"
ENZONIC_ROTATOR_URL="http://sgp-two.enzonic.com:25836/v1"
ENZONIC_API_KEY="dummy-key-for-sdk"
ENZONIC_MODEL="nvidia/nemotron-3-ultra-550b-a55b"

# Add this:
YOUTUBE_API_KEY="your-youtube-api-key-from-google-cloud"
```

## Caching Strategy

The pipeline caches results in-memory for 24 hours. For production, extend this to Turso:

1. Create `search_cache` table in Turso:
```sql
CREATE TABLE IF NOT EXISTS search_cache (
  query TEXT PRIMARY KEY,
  results_json TEXT NOT NULL,
  cached_at INTEGER NOT NULL,
  ttl_ms INTEGER NOT NULL DEFAULT 86400000
);
```

2. Before calling YouTube API, check `search_cache` table for the query
3. If cached and not expired, return cached results
4. If not cached or expired, call YouTube API, store results in cache

This way 100 users searching "Python" only uses 1 YouTube search unit.
```
