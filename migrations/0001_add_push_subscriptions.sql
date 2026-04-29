-- Migration to add push_subscriptions table
CREATE TABLE push_subscriptions (
    id TEXT PRIMARY KEY,
    poll_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    FOREIGN KEY(poll_id) REFERENCES polls(id) ON DELETE CASCADE
);
