# Notification System Design (Task 2)

## Stage 1: API & Real-time stuff
**Endpoints:**
- `GET /api/v1/notifications` 
  - filters: `type` (Placement/Result/Event), `limit`, `page`
  - returns: list of notifs
- `PATCH /api/v1/notifications/:id/read`
  - marks a specific notification as read

**Real-time approach:**
I'm going with SSE (Server-Sent Events) here. WebSockets are great but overkill since the data flows mostly one-way (server to client). We can hook up SSE streams backed by Redis pub/sub to handle the broadcast across multiple Node instances.

---

## Stage 2: DB Choice & Schema
**Choice:** PostgreSQL
Why? We need good indexing on things like `is_read` and `created_at` for filtering, plus we need transactions so we don't accidentally mark things read twice. NoSQL could work, but relational mapping (Users -> Notifications) is just easier to maintain here.

**Schema:**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id INT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50), -- Placement, Result, Event
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Queries:**
Fetch unread placements:
```sql
SELECT id, type, message, created_at 
FROM notifications 
WHERE student_id = 1042 AND type = 'Placement'
ORDER BY created_at DESC LIMIT 50;
```
Mark read:
```sql
UPDATE notifications SET is_read = true WHERE id = 'xyz' AND student_id = 1042;
```

**Scaling problems:**
If we blast a placement notif to 10k students, that's 10k rows inserted at once. This will definitely cause high write IO and block other queries. Also, on login, everyone hits the DB to check unread counts.

---

## Stage 3: Fixing the Slow Query
**Slow query:** `SELECT * FROM notifications WHERE studentID=1042 AND isRead=false ORDER BY createdAt DESC`
**Why it's slow:** No composite index. It's doing a full table scan or sequence scan and sorting in memory.

**Fix:**
```sql
CREATE INDEX idx_student_unread ON notifications (student_id, is_read, created_at DESC);
```
Tradeoff: Writes take a tiny bit longer because the index needs updating, but read speed jumps from O(N) to O(log N). Worth it for a read-heavy app.

**Last 7 days placement query:**
```sql
SELECT DISTINCT student_id FROM notifications 
WHERE type = 'Placement' AND created_at >= NOW() - INTERVAL '7 days';
```

---

## Stage 4: Cache Strategy
To stop the DB from melting on page loads, we need Redis.
1. **Unread counter:** Store `unread:student_id` as a simple integer in Redis. Update it on new notif and decrement on read.
2. **Top 20 Cache:** Keep a Redis List of the 20 most recent notifs per user. 
Tradeoffs: Great performance, but we have to handle cache invalidation carefully to avoid stale unread counts. Also costs more RAM.

---

## Stage 5: Reliable notify_all
The pseudocode loop (`for s in students: send(n)`) is bad because if the server crashes at student 101, the rest get nothing.

**Better Architecture:**
1. API accepts request and drops an event `{"type": "Placement", "msg": "..."}` into a message broker (RabbitMQ/SQS).
2. A fan-out worker picks it up, queries eligible students, and pushes individual jobs into a Task Queue.
3. Worker nodes pull individual jobs, insert the DB row, and fire the SSE.
4. If a DB insert fails (deadlock/timeout), the job stays in the queue and retries later. After 5 retries, it goes to a Dead Letter Queue (DLQ).
5. Use an idempotency key so we don't accidentally notify the same student twice during a retry.
