# ELONVERSE Security Specification

## 1. Data Invariants

1. **Conversation Ownership & Isolation**: Visitors can only create and access their own conversation (`/conversations/{visitorId}`) matching their unique visitor ID. Visitors can NEVER access, read, or list other visitors' conversations.
2. **Strict Admin Privilege**: Only the designated administrator (`elonmuskspace241@gmail.com`) with a verified email can delete conversations, delete messages, write as `sender: "admin"`, and view all conversations in the admin directory.
3. **No Automatic Expiration**: All conversation records and messages are permanently retained; no TTL or auto-deletion rules exist.
4. **Anti-Impersonation**: A non-admin client cannot create a message with `sender: "admin"`.
5. **No Visitor Deletion**: Visitors are strictly forbidden from executing `delete` on conversations or messages under any circumstance.
6. **Admin-Only Deletion**: Deletion of `/conversations/{visitorId}` and `/conversations/{visitorId}/messages/{messageId}` is mathematically restricted to `request.auth.token.email == 'elonmuskspace241@gmail.com' && request.auth.token.email_verified == true`.
7. **Input Boundary Enforcement**: Message texts cannot exceed 2000 characters, URLs cannot exceed 2048 characters, and visitor IDs must match alphanumeric patterns (`^[a-zA-Z0-9_\-]+$`) up to 128 characters.
8. **Audit Trail**: Every administrative deletion triggers an append-only audit record in `/admin_audit_logs/{logId}`.

## 2. The Dirty Dozen Payloads (Targeting Exploits)

1. **Payload 1 (Visitor Deleting Conversation)**: A visitor issues a DELETE request on `/conversations/visitor_target` -> Expected: PERMISSION_DENIED.
2. **Payload 2 (Visitor Impersonating Admin Sender)**: A visitor writes `{ sender: "admin", text: "Free Dogecoin", type: "text" }` -> Expected: PERMISSION_DENIED.
3. **Payload 3 (Unauthenticated Visitor Accessing Another Visitor's Conversation)**: Visitor A requests `GET /conversations/visitor_B` -> Expected: PERMISSION_DENIED.
4. **Payload 4 (Ghost Field Injection)**: A visitor sends `{ visitorId: "visitor_1", text: "Hi", isAdmin: true, bypass: true }` -> Expected: PERMISSION_DENIED.
5. **Payload 5 (Unverified Email Admin Spoofing)**: A user authenticated with `email: "elonmuskspace241@gmail.com"` but `email_verified: false` attempts DELETE -> Expected: PERMISSION_DENIED.
6. **Payload 6 (Oversized Message String / Denial of Wallet)**: A visitor sends a 2MB string in `text` -> Expected: PERMISSION_DENIED.
7. **Payload 7 (Path Traversal / Malformed Document ID)**: An attacker creates a conversation with document ID containing path traversal symbols `../../secret` -> Expected: PERMISSION_DENIED.
8. **Payload 8 (Visitor Deleting Admin Audit Logs)**: An attacker calls DELETE on `/admin_audit_logs/log_123` -> Expected: PERMISSION_DENIED.
9. **Payload 9 (Non-Admin Listing All Conversations)**: An unauthenticated or standard visitor issues `list` on `/conversations` -> Expected: PERMISSION_DENIED.
10. **Payload 10 (Invalid Message Type)**: A client sends a message with `type: "executable"` -> Expected: PERMISSION_DENIED.
11. **Payload 11 (Overwriting Message Sender on Update)**: A client attempts to update an existing message changing `sender: "visitor"` to `sender: "admin"` -> Expected: PERMISSION_DENIED.
12. **Payload 12 (Blanket Read Bypass)**: Attempting to query `get` across `/conversations` without credentials -> Expected: PERMISSION_DENIED.
