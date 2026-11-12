PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS resources (resource_id TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0 CHECK(count>=0));
CREATE TABLE IF NOT EXISTS likes (resource_id TEXT NOT NULL REFERENCES resources(resource_id), voter_hash TEXT NOT NULL, PRIMARY KEY(resource_id,voter_hash)) WITHOUT ROWID;
CREATE TRIGGER IF NOT EXISTS increment_count AFTER INSERT ON likes BEGIN UPDATE resources SET count=count+1 WHERE resource_id=NEW.resource_id; END;
