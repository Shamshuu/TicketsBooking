# Admin Panel Implementation

## Overview
The TicketBooking system now includes a comprehensive admin panel that allows administrators to manage all aspects of the movie booking system.

## Features Implemented

### 🔐 Admin Authentication
- **Admin Status**: Added `isAdmin` field to User model
- **Admin Check**: Real-time admin status verification on every admin action
- **Admin Middleware**: Secure admin-only route protection

### 🎬 Movie Management
- **Add Movies**: Upload movie posters, set titles, synopses, and pricing
- **Delete Movies**: Safe deletion with booking conflict prevention
- **File Upload**: JPG poster upload with unique filename generation
- **Admin Controls**: X buttons on movie cards for deletion

### 🏢 Theater Management
- **Add Theaters**: Upload theater photos, set names, addresses, and pricing
- **Delete Theaters**: Safe deletion with booking conflict prevention
- **File Upload**: JPG photo upload with unique filename generation
- **Admin Controls**: X buttons on theater cards for deletion

### 🎭 Show Scheduling
- **Schedule Shows**: Map movies to theaters with custom times and dates
- **Flexible Scheduling**: Multiple times and dates per movie-theater combination
- **Price Control**: Set pricing per movie-theater combination
- **Screen Management**: Specify screen names for each show

### 🎨 User Interface
- **Admin Panel**: Integrated admin controls within existing interface
- **Modal Forms**: Professional forms for adding movies, theaters, and shows
- **Confirmation Dialogs**: Safe deletion with confirmation prompts
- **Real-time Updates**: Changes reflect immediately to users

## Database Changes

### User Model
```javascript
{
  name: String,
  email: String,
  password: String,
  isAdmin: Boolean (default: false)  // NEW
}
```

### Movie Model
```javascript
{
  title: String,
  poster_url: String,
  synopsis: String,
  price: Number (default: 200)  // NEW
}
```

### Theater Model
```javascript
{
  name: String,
  photo_url: String,
  address: String,
  price: Number (default: 200)  // NEW
  screens: Array
}
```

### ShowSchedule Model (NEW)
```javascript
{
  movieId: ObjectId (ref: Movie),
  theaterId: ObjectId (ref: Theater),
  screen: String,
  time: String,
  date: String,
  price: Number,
  createdAt: Date
}
```

## API Endpoints

### Admin Authentication
- `GET /api/auth/check-admin` - Check if user is admin

### Movie Management
- `POST /api/movies` - Add new movie (admin only)
- `PUT /api/movies/:id` - Update movie (admin only)
- `DELETE /api/movies/:id` - Delete movie (admin only)

### Theater Management
- `POST /api/theaters` - Add new theater (admin only)
- `PUT /api/theaters/:id` - Update theater (admin only)
- `DELETE /api/theaters/:id` - Delete theater (admin only)

### Show Scheduling
- `POST /api/shows` - Schedule new shows (admin only)
- `PUT /api/shows/:id` - Update show (admin only)
- `DELETE /api/shows/:id` - Delete show (admin only)
- `DELETE /api/shows/movie-theater/:movieId/:theaterId` - Delete all shows for movie-theater combination

## File Upload System

### Features
- **JPG Only**: Accepts only JPG/JPEG files
- **Unique Names**: Timestamp + UUID for conflict prevention
- **Size Limit**: 5MB maximum file size
- **Storage**: Files stored in `public/uploads/` directory
- **Fallback**: Uses default images if no file uploaded

### File Naming Convention
```
{timestamp}-{uuid}.jpg
Example: 1703123456789-550e8400-e29b-41d4-a716-446655440000.jpg
```

## Security Features

### Admin Protection
- **JWT Verification**: All admin routes require valid JWT token
- **Admin Check**: Database verification of admin status on every request
- **Safe Deletion**: Prevents deletion of items with existing bookings
- **File Validation**: Strict file type and size validation

### Data Integrity
- **Unique Constraints**: Prevents duplicate show schedules
- **Referential Integrity**: Maintains relationships between entities
- **Conflict Prevention**: Checks for booking conflicts before deletion

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Make a User Admin
```bash
node make-admin.js user@example.com
```

### 3. Start the Server
```bash
node server/server.js
```

### 4. Access Admin Features
1. Login with admin account
2. Admin panel appears in side menu
3. Use admin controls on movie/theater cards
4. Access admin forms through side menu

## Admin Workflow

### Adding a Movie
1. Click "Admin Panel" → "Add Movie"
2. Fill in title, synopsis, and price
3. Upload JPG poster (optional)
4. Submit form
5. Movie appears immediately in listings

### Adding a Theater
1. Click "Admin Panel" → "Add Theater"
2. Fill in name, address, and price
3. Upload JPG photo (optional)
4. Submit form
5. Theater appears immediately in listings

### Scheduling Shows
1. Click "Admin Panel" → "Schedule Show"
2. Select movie and theater
3. Enter screen name and price
4. Add multiple show times
5. Add multiple show dates
6. Submit form
7. Shows created for all time-date combinations

### Deleting Items
1. Hover over movie/theater card
2. Click red X button
3. Confirm deletion in dialog
4. Item removed (if no booking conflicts)

## Error Handling

### File Upload Errors
- Invalid file type → "Only JPG files are allowed!"
- File too large → "File size exceeds 5MB limit"
- Upload failure → "Error uploading file"

### Deletion Errors
- Booking conflicts → "Cannot delete - existing bookings found"
- Server errors → "Server error occurred"

### Validation Errors
- Missing fields → "Required fields missing"
- Invalid data → "Invalid data provided"

## Responsive Design

### Mobile Support
- Touch-friendly admin controls
- Responsive modal forms
- Optimized file upload interface
- Mobile-optimized confirmation dialogs

### Desktop Support
- Hover effects for admin controls
- Keyboard navigation support
- Professional form layouts
- Efficient workflow design

## Future Enhancements

### Planned Features
- **Bulk Operations**: Add/delete multiple items at once
- **Advanced Scheduling**: Recurring schedules, time slots
- **Analytics Dashboard**: Booking statistics, revenue reports
- **User Management**: Promote/demote users, view user lists
- **Content Management**: Rich text editor for synopses
- **Image Optimization**: Automatic image resizing and compression

### Payment Integration
- **Refund System**: Automatic refunds for cancelled shows
- **Payment Tracking**: Monitor payment status
- **Revenue Reports**: Detailed financial analytics

## Troubleshooting

### Common Issues

**Admin controls not showing**
- Verify user has `isAdmin: true` in database
- Check browser console for errors
- Ensure JWT token is valid

**File upload failing**
- Check file is JPG format
- Verify file size under 5MB
- Ensure uploads directory exists

**Deletion not working**
- Check for existing bookings
- Verify admin permissions
- Check server logs for errors

### Debug Commands
```bash
# Check admin status
node -e "const mongoose = require('mongoose'); const User = require('./server/models/User'); mongoose.connect('mongodb://localhost:27017/ticketBookingDB').then(() => User.findOne({email: 'user@example.com'}).then(u => console.log(u.isAdmin)));"

# List all admins
node -e "const mongoose = require('mongoose'); const User = require('./server/models/User'); mongoose.connect('mongodb://localhost:27017/ticketBookingDB').then(() => User.find({isAdmin: true}).then(admins => console.log(admins.map(a => a.email))));"
```

## Support

For technical support or feature requests, please refer to the main project documentation or contact the development team. 