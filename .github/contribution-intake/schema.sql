CREATE TABLE submissions (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT NOT NULL, tier TEXT NOT NULL,
  license TEXT NOT NULL, created_at INTEGER NOT NULL, bytes INTEGER NOT NULL CHECK(bytes BETWEEN 1 AND 5000000)
);
CREATE INDEX submissions_newest ON submissions(created_at DESC, id DESC);
CREATE TRIGGER enforce_community_capacity BEFORE INSERT ON submissions
WHEN (SELECT count(*) FROM submissions) >= 60
BEGIN SELECT RAISE(ABORT,'community_full'); END;
