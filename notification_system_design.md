# Campus Notifications Microservice - System Design

## Stage 1: REST API Endpoints & Real-time Mechanism

### 1. Fetch Notifications
**Endpoint:** `GET /api/v1/notifications`
**Headers:**
- `Authorization: Bearer <token>`
**Query Parameters:**
- `type` (optional): Placement, Result, Event
- `limit` (default: 50)
- `page` (default: 1)
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif_123",
      "type": "Placement",
      "message": "Google is visiting campus next week.",
      "isRead": false,
      "createdAt": "2023-10-25T10:00:00Z"
    }
  ]
}
```

### 2. Mark Notification as Read
**Endpoint:** `PATCH /api/v1/notifications/:id/read`
**Headers:**
- `Authorization: Bearer <token>`
**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read."
}
```

### Real-Time Mechanism Design
To deliver real-time updates (e.g., immediate Placement alerts), we will use **Server-Sent Events (SSE)** or **WebSockets**.
- **WebSockets** are ideal for bi-directional communication, but since notifications are mostly one-way (Server to Client), **SSE** is more lightweight and perfectly suited.
- Clients subscribe to `GET /api/v1/notifications/stream`.
- A Redis Pub/Sub channel will back the SSE connections to broadcast notifications globally across horizontally scaled backend instances.

---

## Stage 2: Database Choice & Schema

### DB Choice: PostgreSQL (SQL)
**Justification:** 
Notifications inherently possess structured relationships. We need robust filtering (by `isRead`, `type`), pagination, and ACID guarantees for state transitions (e.g., marking as read without race conditions). PostgreSQL offers excellent indexing capabilities (B-Trees for querying read statuses and timestamps).

### Schema Design
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id INT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) CHECK (type IN ('Placement', 'Result', 'Event')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Queries for Stage 1 APIs
**Fetch Notifications:**
```sql
SELECT id, type, message, is_read, created_at 
FROM notifications 
WHERE student_id = 1042 AND (type = 'Placement' OR type IS NULL)
ORDER BY created_at DESC
LIMIT 50 OFFSET 0;
```
**Mark as Read:**
```sql
UPDATE notifications SET is_read = true WHERE id = 'notif_123' AND student_id = 1042;
```

### Scaling Problems
- **Write Heavy:** A single broadcast to 10,000 students means 10,000 row inserts. This causes write locks and high disk I/O.
- **Read Heavy:** Every student opening the app polls the DB simultaneously, overloading the connection pool.

---

## Stage 3: Fixing Slow Queries

### The Problem
`SELECT * FROM notifications WHERE studentID=1042 AND isRead=false ORDER BY createdAt DESC`
**Why is it slow?** 
Without a proper index, the database performs a sequential scan over millions of notification rows, filtering out `studentID` and `isRead`, and then performing an expensive in-memory sort on `createdAt`.

### The Fix
We need a **Composite B-Tree Index**.
```sql
CREATE INDEX idx_student_unread_recent ON notifications (student_id, is_read, created_at DESC);
```
**Tradeoffs of Indexing:**
- **Pros:** Read times drop from O(N) to O(log N). The sort is pre-computed.
- **Cons:** Write times increase slightly because every insert requires updating the B-Tree. Storage overhead increases.

### Recent Placement Notifications Query
Query for students who received a Placement notification in the last 7 days:
```sql
SELECT DISTINCT student_id 
FROM notifications 
WHERE type = 'Placement' 
  AND created_at >= NOW() - INTERVAL '7 days';
```

---

## Stage 4: Caching & Performance Strategy

**Problem:** DB getting overwhelmed on every page load.
**Strategy:** Implement a **Read-Through Cache using Redis**.

1. **Unread Count Caching:** Store the total unread count per user in Redis (`unread_count:1042`). Fetching this is O(1).
2. **Recent Notifications Caching:** Store a cached JSON list of the top 20 most recent notifications per user in a Redis List.
3. **Invalidation:** When a new notification is generated, push it to the Redis List and increment the `unread_count`. When a user marks as read, decrement the counter and lazily sync to Postgres.

**Tradeoffs:**
- **Pros:** Massive reduction in DB queries. Page loads become instantaneous.
- **Cons:** Cache invalidation complexity. Potential for stale data (e.g., a notification marked read on a mobile device might momentarily show as unread on web if cache isn't synchronized correctly). High memory usage in Redis for millions of users.

---

## Stage 5: Reliable `notify_all` Architecture

### The Problem with Pseudocode
A synchronous loop like `for student in students: send(notification)` fails midway if the server crashes, a network timeout occurs, or the DB locks. The first 100 get it, the next 100 don't, and retrying sends duplicates to the first 100.

### Redesign: Queues, Atomicity, and Retries
1. **Message Broker (RabbitMQ / Kafka / AWS SQS):**
   - The API server simply publishes a single event: `{"event": "broadcast", "type": "Placement", "message": "..."}`.
   - It returns `202 Accepted` immediately.
2. **Fan-out Workers:**
   - A background worker consumes the broadcast event.
   - It fetches all eligible students and generates individual task payloads (`{"studentId": 1, "msg": "..."}`).
   - It pushes these individual tasks into a **Task Queue**.
3. **Delivery Workers (Retries & Dead Letter Queues):**
   - Workers pick up individual tasks. They insert the DB row and push to the SSE channel.
   - If a DB insert fails, the message returns to the queue for a retry (with exponential backoff).
   - If it fails 5 times, it is sent to a **Dead Letter Queue (DLQ)** for manual inspection.
4. **Idempotency:**
   - Each task has a unique `Idempotency-Key` to ensure that if a worker crashes right after sending, but before acknowledging the queue, the retry won't create a duplicate notification in the DB.
