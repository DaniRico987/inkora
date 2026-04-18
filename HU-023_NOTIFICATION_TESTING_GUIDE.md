# HU-023 Notification System Manual Testing Guide

## Overview
The HU-023 notification system automatically sends notifications to users when new books are added to categories they're subscribed to. This includes both in-app notifications and email notifications.

## 1. Environment Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Mail server/SMTP configuration
- Docker (for containerized testing)

### Backend Setup
```bash
# Install dependencies
npm install

# Set up environment variables (.env file)
DATABASE_URL="postgresql://user:password@localhost:5432/inkora"
JWT_SECRET="your-secret-key"
MAIL_HOST="smtp.gmail.com"
MAIL_PORT="587"
MAIL_USER="your-email@gmail.com"
MAIL_PASSWORD="your-app-password"
FRONTEND_URL="http://localhost:3000"

# Run database migrations
npx prisma migrate dev

# Seed initial data
npm run seed:db
```

### Frontend Setup
```bash
cd client
npm install
npm run dev
```

### Start Services
```bash
# Terminal 1: Backend
npm run start:dev

# Terminal 2: Frontend
cd client && npm run dev

# Terminal 3: Database (if using Docker)
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15
```

## 2. Test Data Creation

### Create Test Users
1. Register two client accounts:
   - User A: `testuser1@example.com` (subscribe to "Fiction" and "Mystery")
   - User B: `testuser2@example.com` (subscribe to "Science Fiction" and "Fantasy")

2. Create an admin account for book management

### Create Test Categories
Using Prisma Studio or direct database insertion:
```sql
INSERT INTO category (name, description) VALUES
('Fiction', 'Fiction books'),
('Mystery', 'Mystery and thriller books'),
('Science Fiction', 'Sci-fi books'),
('Fantasy', 'Fantasy books');
```

### Create User Subscriptions
```sql
-- User A subscriptions
INSERT INTO subscription (client_id, category_id) VALUES
(1, 1), (1, 2); -- Fiction, Mystery

-- User B subscriptions
INSERT INTO subscription (client_id, category_id) VALUES
(2, 3), (2, 4); -- Science Fiction, Fantasy
```

### Create Test Books
Use the admin panel or API to create books:

1. **Book 1**: "The Silent Patient" by Alex Michaelides
   - Categories: Fiction, Mystery
   - Expected notifications: User A

2. **Book 2**: "Dune" by Frank Herbert
   - Categories: Science Fiction, Fantasy
   - Expected notifications: User B

3. **Book 3**: "The Name of the Wind" by Patrick Rothfuss
   - Categories: Fantasy
   - Expected notifications: User B

## 3. Frontend Testing Scenarios

### Scenario 1: Notification Bell Icon
**Expected Behavior**: Bell icon shows red badge with unread count

1. Log in as User A
2. Verify notification bell icon appears in navbar
3. Initially, no red badge should be visible (0 unread)
4. After creating Book 1, refresh page or wait for auto-refresh
5. Bell icon should show red badge with "1"

**Visual Description**:
- Bell icon: Gray bell SVG in navbar
- Badge: Small red circle with white number in top-right corner of bell
- Position: Absolute positioned over bell icon

### Scenario 2: Notification Dropdown
**Expected Behavior**: Click bell to open dropdown with notifications

1. Click notification bell icon
2. Dropdown should appear below bell icon
3. Should show:
   - Header: "Notificaciones"
   - List of notifications (max 5)
   - Each notification shows book cover, title, content, date
   - Unread notifications have blue background tint

**Visual Description**:
- Dropdown: White background, rounded corners, shadow
- Width: 320px (w-80)
- Max height: 384px (max-h-96) with scroll
- Unread indicator: Small blue dot on right side
- Book cover: 40x56px thumbnail on left

### Scenario 3: Mark Notification as Read
**Expected Behavior**: Clicking notification marks it as read

1. Click on an unread notification in dropdown
2. Notification should:
   - Lose blue background tint
   - Remove blue dot indicator
   - Unread count in bell badge should decrease
3. Clicking again should navigate to book details (if bookId present)

**API Call**: `PATCH /api/v1/notifications/{id}/read`

### Scenario 4: Empty Notifications State
**Expected Behavior**: Shows "No hay notificaciones" when empty

1. Mark all notifications as read
2. Open dropdown
3. Should show centered gray text: "No hay notificaciones"

### Scenario 5: Loading State
**Expected Behavior**: Shows loading indicator while fetching

1. Open dropdown immediately after login
2. Should show: "Cargando..." in center
3. After loading completes, shows notifications or empty state

### Scenario 6: View All Notifications
**Expected Behavior**: "Ver todas las notificaciones" button navigates to news page

1. Have more than 5 notifications
2. Click "Ver todas las notificaciones" button
3. Should navigate to `/news` page
4. Dropdown should close

## 4. Email Notification Testing

### Scenario 1: Email Delivery
**Expected Behavior**: Users receive email when subscribed to book categories

1. Create a new book in subscribed category
2. Check email inbox for notification email
3. Email should contain:
   - Subject: "Nuevo libro disponible: {Book Title}"
   - Personalized greeting with first name
   - Book details (title, author, categories)
   - "Ver libro" button (currently placeholder)
   - Unsubscribe information

**Email Template Structure**:
```
Subject: Nuevo libro disponible: {Book Title}

Hola {FirstName},

¡Buenas noticias! Hemos añadido un nuevo libro que podría interesarte.

[Book Details Box]
Title: {Book Title}
Author: {Book Author}
Categories: {Category List}

[Ver libro button]

Recibes esta notificación porque estás suscrito a las categorías mencionadas.
```

### Scenario 2: Email Delivery Logging
**Expected Behavior**: System logs email delivery status

Check `notification_log` table:
```sql
SELECT * FROM notification_log WHERE notification_id = {id};
```

Should show:
- `channel`: 'email'
- `status`: 'sent' or 'failed'
- `sent_at`: timestamp
- `error_message`: null if successful

## 5. Edge Cases to Test

### Case 1: User Not Subscribed
1. Create book in category User A is NOT subscribed to
2. User A should receive no notification
3. Check database: no notification record for User A

### Case 2: Book Without Categories
1. Create book with no categories assigned
2. No notifications should be sent
3. Check logs: `triggerNewBookNotifications` should return early

### Case 3: Duplicate Subscriptions
1. Subscribe User A to same category twice
2. Create book in that category
3. User should receive only ONE notification
4. Check database: single notification record

### Case 4: Invalid Email Address
1. Create user with invalid email
2. Subscribe to category and create book
3. Notification should be created
4. Email log should show `status: 'failed'` with error message

### Case 5: Network Failure During Email
1. Temporarily disable mail server
2. Create book that triggers notification
3. Notification should be created
4. Email log should show `status: 'failed'`
5. Re-enable mail server and check retry logic

### Case 6: User Deleted After Notification Created
1. Create notification for user
2. Delete user account
3. Attempt to mark notification as read
4. Should return 404 error

### Case 7: High Volume Notifications
1. Subscribe single user to many categories
2. Create multiple books in different categories simultaneously
3. User should receive separate notifications for each book
4. Check performance: notifications should be sent asynchronously

### Case 8: Special Characters in Book Data
1. Create book with special characters: "Cañón del Colorado" by "José María"
2. Check email encoding is correct
3. Check database storage handles UTF-8 properly

## 6. Troubleshooting Tips

### Notifications Not Appearing
1. **Check user authentication**: Ensure JWT token is valid
2. **Verify subscriptions**: Query `subscription` table for user's category subscriptions
3. **Check book categories**: Ensure new book has categories assigned
4. **Review notification creation**: Check `notification` table for records
5. **Check API response**: Use browser dev tools to inspect `/api/v1/notifications` response

### Emails Not Sending
1. **Verify mail configuration**: Check environment variables
2. **Test SMTP connection**: Use tools like `telnet smtp.gmail.com 587`
3. **Check mail logs**: Look for errors in application logs
4. **Verify user email**: Ensure user has valid email address
5. **Check notification logs**: Query `notification_log` table for delivery status

### Database Issues
1. **Check migrations**: Ensure all migrations are applied
2. **Verify foreign keys**: Check relationships between tables
3. **Review seed data**: Ensure test data is properly inserted
4. **Check constraints**: Verify unique constraints and required fields

### Frontend Issues
1. **Check React Query cache**: Clear cache or force refetch
2. **Verify API endpoints**: Use Postman to test backend APIs directly
3. **Check browser console**: Look for JavaScript errors
4. **Verify authentication**: Ensure user is logged in with correct role

### Performance Issues
1. **Check database indexes**: Ensure proper indexes on frequently queried columns
2. **Monitor async operations**: Verify notifications are sent asynchronously
3. **Review batch operations**: Check if multiple notifications are processed efficiently
4. **Monitor memory usage**: Watch for memory leaks in notification processing

## 7. Success Criteria Checklist

- [ ] Users receive notifications for books in subscribed categories
- [ ] Notification bell shows correct unread count
- [ ] Clicking notifications marks them as read
- [ ] Email notifications are delivered successfully
- [ ] Notification logs track delivery status
- [ ] Edge cases handle gracefully
- [ ] UI updates correctly on state changes
- [ ] Performance remains acceptable under load
- [ ] Error handling prevents system crashes</content>
<parameter name="filePath">c:\Users\abisa\Documents\inkora\HU-023_NOTIFICATION_TESTING_GUIDE.md