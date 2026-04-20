# Security Specification for Dance Events App

## Data Invariants
1. A user can only manage their own profile.
2. Only users with specific roles (host, admin, dj, instructor, media) can create events.
3. An event's hostId must match the creator's UID and is immutable.
4. Registrations are uniquely identified by `${eventId}_${userId}`.
5. Users can only register for themselves.
6. Event attendee counts and like counts must be updated atomically or via restricted update rules.
7. Likes are uniquely identified by `${eventId}_${userId}`.
8. Follows are uniquely identified by `${followerId}_${followingId}`.

## The "Dirty Dozen" Payloads (Deny Cases)
1. **Identity Spoofing**: Creating an event with a different `hostId`.
2. **Privilege Escalation**: Updating own user role to 'admin'.
3. **State Shortcutting**: Updating an event status from 'draft' directly to 'cancelled' without being the host (or similar).
4. **ID Poisoning**: Injecting a 2KB string as an event ID.
5. **Orphaned Registration**: Creating a registration for a non-existent event.
6. **Shadow Fields**: Adding `isVerified: true` to a user profile update.
7. **Attendee Overflow**: Manually incrementing `currentAttendees` beyond `maxAttendees` (though rules focus on permissions, schema should bound it).
8. **Double Registration**: Trying to create a second registration doc with a different ID format.
9. **Fake Likes**: Incrementing `likesCount` on an event without creating an `eventLikes` document (atomicity check planned).
10. **Follow Loop**: Following oneself.
11. **PII Leak**: A user reading another user's private data (like email).
12. **Immutable Field Change**: Changing `createdAt` on an update.

## Test Runner (Planned)
We will verify that all these malicious payloads are rejected by the rules.
