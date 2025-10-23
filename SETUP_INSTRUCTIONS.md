# Setup Instructions - Interview Feature

## Quick Start

### 1. Run Database Migration

Open your terminal/command prompt and navigate to the backend directory:

```bash
cd C:\Users\shari\Downloads\hrms\hrms-system-backup12\hrms-backend
```

Then run the migration to add the `duration` column to the `interviews` table:

```bash
php artisan migrate
```

Expected output:
```
Migrating: 2024_12_20_100000_add_duration_to_interviews_table
Migrated:  2024_12_20_100000_add_duration_to_interviews_table (XX.XXms)
```

### 2. Verify Database

Check that the `duration` column was added:

```sql
DESCRIBE interviews;
```

You should see the `duration` column with type `int` and default value `30`.

### 3. Test the Flow

#### As HR Staff/Assistant:
1. Login to the system
2. Go to Onboarding Dashboard
3. Navigate to "Shortlisted" tab
4. Click "Schedule Interview" for an applicant
5. Fill in all fields (all fields with * are required):
   - Interview Date *
   - Interview Time *
   - Duration (minutes) * (dropdown: 10, 20, 30, 40, 50)
   - Interview Type (auto: "On-site")
   - Location *
   - Interviewer *
   - Notes (optional)
6. Click "Send Invite"
7. Verify success message

#### As Applicant:
1. Login with the applicant account
2. Go to PersonalOnboarding dashboard
3. Click "Interview" tab
4. Verify all fields are displayed with asterisks:
   - Interview Date *
   - Interview Time *
   - Duration (minutes) *
   - Interview Type (no asterisk)
   - Location *
   - Interviewer *
   - Notes (if provided by HR)
5. Verify the design looks clean and professional

## That's It!

The interview invitation feature is now fully functional. When HR sends an interview invite, all the details will automatically appear in the applicant's Interview tab with proper formatting and labels.

## Files Changed

✅ Backend:
- `app/Models/Interview.php` - Added duration field
- `app/Http/Controllers/Api/ApplicationController.php` - Save duration
- `database/migrations/2024_12_20_100000_add_duration_to_interviews_table.php` - New migration

✅ Frontend:
- `src/components/PersonalOnboarding.js` - Updated Interview tab UI

## Troubleshooting

### Migration Error: "Column already exists"
If you get an error that the column already exists, you can rollback and re-run:
```bash
php artisan migrate:rollback --step=1
php artisan migrate
```

### Interview not showing up
- Check if the application status is "On going Interview"
- Verify the applicant user ID matches
- Check browser console for API errors
- Verify backend is running on http://localhost:8000

### Duration not displaying
- Make sure you ran the migration
- Check the database to confirm the column exists
- Clear browser cache and refresh
