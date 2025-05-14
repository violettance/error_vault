-- Eğer total_net_score kolonu yoksa ekleyin
ALTER TABLE exams ADD COLUMN IF NOT EXISTS total_net_score NUMERIC(10,2) DEFAULT 0;
