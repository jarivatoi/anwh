# Supabase Setup Guide for Roster System

## Step 1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" 
3. Sign up with GitHub, Google, or email
4. Create a new organization (or use existing)
5. Create a new project:
   - Give it a name like "X-ray Roster"
   - Choose a region close to you
   - Set a strong database password (save this!)
   - Click "Create new project"

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (starts with https://...)
   - **anon/public key** (starts with eyJ...)
3. Update your `.env` file with these values

## Step 3: Create the Roster Table

Since the table already exists, skip the table creation and go directly to Step 4.

## Step 4: Insert Sample Data

Since the table already exists, first clear any existing data and then add the new roster entries:

```sql
-- Add the missing change_description column to existing table
ALTER TABLE roster_entries ADD COLUMN IF NOT EXISTS change_description TEXT;

-- Clear existing data (optional - only if you want to start fresh)
DELETE FROM roster_entries;
-- Insert sample roster data
INSERT INTO roster_entries (date, shift_type, assigned_name, last_edited_by, last_edited_at) VALUES
-- July 2025 roster data with 3 people per shift (like PDF)
-- Day 1 - July 1st
('2025-07-01', 'Morning Shift (9-4)', 'NARAYYA(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-01', 'Morning Shift (9-4)', 'BHEKUR(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-01', 'Morning Shift (9-4)', 'DHUNNY(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-01', 'Evening Shift (4-10)', 'DOMUN(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-01', 'Evening Shift (4-10)', 'DUSSEE(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-01', 'Evening Shift (4-10)', 'FOKEERCHAND(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-01', 'Night Duty', 'GHOORAN(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-01', 'Night Duty', 'HOSENBUX(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-01', 'Night Duty', 'JUMMUN(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),

-- Day 2 - July 2nd
('2025-07-02', 'Morning Shift (9-4)', 'MADOO(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-02', 'Morning Shift (9-4)', 'MAUDHOO(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-02', 'Morning Shift (9-4)', 'PITTEA(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-02', 'Evening Shift (4-10)', 'RUNGADOO(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-02', 'Evening Shift (4-10)', 'TEELUCK(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-02', 'Evening Shift (4-10)', 'VEERASAWMY(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-02', 'Night Duty', 'BHEKUR', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-02', 'Night Duty', 'BHOLLOORAM', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-02', 'Night Duty', 'DHUNNY', 'NARAYYA(R)', '01-07-2025 08:00:00'),

-- Day 3 - July 3rd
('2025-07-03', 'Morning Shift (9-4)', 'DOMUN', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-03', 'Morning Shift (9-4)', 'DUSSEE', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-03', 'Morning Shift (9-4)', 'FOKEERCHAND', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-03', 'Evening Shift (4-10)', 'GHOORAN', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-03', 'Evening Shift (4-10)', 'HOSENBUX', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-03', 'Evening Shift (4-10)', 'JUMMUN', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-03', 'Night Duty', 'MAUDHOO', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-03', 'Night Duty', 'NARAYYA', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-03', 'Night Duty', 'PITTEA', 'NARAYYA(R)', '01-07-2025 08:00:00'),

-- Day 4 - July 4th
('2025-07-04', 'Morning Shift (9-4)', 'RUNGADOO', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-04', 'Morning Shift (9-4)', 'TEELUCK', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-04', 'Morning Shift (9-4)', 'NARAYYA(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-04', 'Evening Shift (4-10)', 'BHEKUR(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-04', 'Evening Shift (4-10)', 'DHUNNY(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-04', 'Evening Shift (4-10)', 'DOMUN(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-04', 'Night Duty', 'DUSSEE(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-04', 'Night Duty', 'FOKEERCHAND(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-04', 'Night Duty', 'GHOORAN(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),

-- Day 5 - July 5th (Saturday)
('2025-07-05', 'Saturday Regular (12-10)', 'HOSENBUX(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-05', 'Saturday Regular (12-10)', 'JUMMUN(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-05', 'Saturday Regular (12-10)', 'MADOO(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-05', 'Night Duty', 'MAUDHOO(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-05', 'Night Duty', 'PITTEA(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-05', 'Night Duty', 'RUNGADOO(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),

-- Day 6 - July 6th (Sunday)
('2025-07-06', 'Sunday/Public Holiday/Special', 'TEELUCK(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-06', 'Sunday/Public Holiday/Special', 'VEERASAWMY(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-06', 'Sunday/Public Holiday/Special', 'BHEKUR', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-06', 'Evening Shift (4-10)', 'BHOLLOORAM', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-06', 'Evening Shift (4-10)', 'DHUNNY', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-06', 'Evening Shift (4-10)', 'DOMUN', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-06', 'Night Duty', 'DUSSEE', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-06', 'Night Duty', 'FOKEERCHAND', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-06', 'Night Duty', 'GHOORAN', 'NARAYYA(R)', '01-07-2025 08:00:00'),

-- Day 7 - July 7th
('2025-07-07', 'Morning Shift (9-4)', 'HOSENBUX', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-07', 'Morning Shift (9-4)', 'JUMMUN', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-07', 'Morning Shift (9-4)', 'MAUDHOO', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-07', 'Evening Shift (4-10)', 'NARAYYA', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-07', 'Evening Shift (4-10)', 'PITTEA', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-07', 'Evening Shift (4-10)', 'RUNGADOO', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-07', 'Night Duty', 'TEELUCK', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-07', 'Night Duty', 'NARAYYA(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-07', 'Night Duty', 'BHEKUR(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),

-- Day 8 - July 8th
('2025-07-08', 'Morning Shift (9-4)', 'DHUNNY(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-08', 'Morning Shift (9-4)', 'DOMUN(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-08', 'Morning Shift (9-4)', 'DUSSEE(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-08', 'Evening Shift (4-10)', 'FOKEERCHAND(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-08', 'Evening Shift (4-10)', 'GHOORAN(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-08', 'Evening Shift (4-10)', 'HOSENBUX(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-08', 'Night Duty', 'JUMMUN(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-08', 'Night Duty', 'MADOO(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-08', 'Night Duty', 'MAUDHOO(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),

-- Day 9 - July 9th
('2025-07-09', 'Morning Shift (9-4)', 'PITTEA(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-09', 'Morning Shift (9-4)', 'RUNGADOO(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-09', 'Morning Shift (9-4)', 'TEELUCK(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-09', 'Evening Shift (4-10)', 'VEERASAWMY(R)', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-09', 'Evening Shift (4-10)', 'BHEKUR', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-09', 'Evening Shift (4-10)', 'BHOLLOORAM', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-09', 'Night Duty', 'DHUNNY', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-09', 'Night Duty', 'DOMUN', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-09', 'Night Duty', 'DUSSEE', 'NARAYYA(R)', '01-07-2025 08:00:00'),

-- Day 10 - July 10th
('2025-07-10', 'Morning Shift (9-4)', 'FOKEERCHAND', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-10', 'Morning Shift (9-4)', 'GHOORAN', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-10', 'Morning Shift (9-4)', 'HOSENBUX', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-10', 'Evening Shift (4-10)', 'JUMMUN', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-10', 'Evening Shift (4-10)', 'MAUDHOO', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-10', 'Evening Shift (4-10)', 'NARAYYA', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-10', 'Night Duty', 'PITTEA', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-10', 'Night Duty', 'RUNGADOO', 'NARAYYA(R)', '01-07-2025 08:00:00'),
('2025-07-10', 'Night Duty', 'TEELUCK', 'NARAYYA(R)', '01-07-2025 08:00:00');
```

## Step 5: How to Run SQL Commands

### Option A: SQL Editor (Recommended)
1. Go to **SQL Editor** in your Supabase dashboard
2. Click **"New query"**
3. Paste the SQL code above
4. Click **"Run"** to execute

### Option B: Table Editor
1. Go to **Table Editor**
2. Click **"Create a new table"**
3. Fill in the table details manually:
   - Table name: `roster_entries`
   - Add columns as shown in the SQL above

## Step 6: Verify Your Setup

1. Go to **Table Editor** → **roster_entries**
2. You should see your sample data
3. Try editing a row to test it works
4. Check that the data appears in your app

## Step 7: Add More Authentication Codes

To add more colleagues, update the `authCodes` array in `RosterPanel.tsx`:

```typescript
const authCodes: AuthCode[] = [
  { code: 'B001', name: 'BHEKUR(R)' },
  { code: 'B002', name: 'BHOLLOORAM(R)' },
  { code: 'D001', name: 'DHUNNY(R)' },
  { code: 'D002', name: 'DOMUN(R)' },
  { code: 'D003', name: 'DUSSEE(R)' },
  { code: 'F001', name: 'FOKEERCHAND(R)' },
  { code: 'G001', name: 'GHOORAN(R)' },
  { code: 'H001', name: 'HOSENBUX(R)' },
  { code: 'J001', name: 'JUMMUN(R)' },
  { code: 'M001', name: 'MADOO(R)' },
  { code: 'M002', name: 'MAUDHOO(R)' },
  { code: 'N001', name: 'NARAYYA(R)' },
  { code: 'P001', name: 'PITTEA(R)' },
  { code: 'R001', name: 'RUNGADOO(R)' },
  { code: 'T001', name: 'TEELUCK(R)' },
  { code: 'V001', name: 'VEERASAWMY(R)' },
  { code: 'B003', name: 'BHEKUR' },
  { code: 'B004', name: 'BHOLLOORAM' },
  { code: 'D004', name: 'DHUNNY' },
  { code: 'D005', name: 'DOMUN' },
  { code: 'D006', name: 'DUSSEE' },
  { code: 'F002', name: 'FOKEERCHAND' },
  { code: 'G002', name: 'GHOORAN' },
  { code: 'H002', name: 'HOSENBUX' },
  { code: 'J002', name: 'JUMMUN' },
  { code: 'M003', name: 'MAUDHOO' },
  { code: 'N002', name: 'NARAYYA' },
  { code: 'P002', name: 'PITTEA' },
  { code: 'R002', name: 'RUNGADOO' },
  { code: 'T002', name: 'TEELUCK' },
  // Add more codes here
];
```

## Common Shift Types

Based on your PDF, here are the common shift types:
- `Morning Shift (9-4)`
- `Evening Shift (4-10)` 
- `Saturday Regular (12-10)`
- `Night Duty`
- `Sunday/Public Holiday/Special`

## Troubleshooting

### If you get RLS (Row Level Security) errors:
```sql
-- Disable RLS temporarily for testing
ALTER TABLE roster_entries DISABLE ROW LEVEL SECURITY;
```

### If you need to reset the table:
```sql
-- Delete all data
DELETE FROM roster_entries;

-- Or drop and recreate the table
DROP TABLE roster_entries;
-- Then run the CREATE TABLE command again
```

### If you need to add more names to the available list:
Update the `availableNames` array in `RosterPanel.tsx`:

```typescript
const [availableNames] = useState([
  'BHEKUR(R)', 'BHOLLOORAM(R)', 'DHUNNY(R)', 'DOMUN(R)', 'DUSSEE(R)',
  'FOKEERCHAND(R)', 'GHOORAN(R)', 'HOSENBUX(R)', 'JUMMUN(R)', 'MADOO(R)',
  'MAUDHOO(R)', 'NARAYYA(R)', 'PITTEA(R)', 'RUNGADOO(R)', 'TEELUCK(R)',
  'VEERASAWMY(R)', 'BHEKUR', 'BHOLLOORAM', 'DHUNNY', 'DOMUN', 'DUSSEE',
  'FOKEERCHAND', 'GHOORAN', 'HOSENBUX', 'JUMMUN', 'MAUDHOO', 'NARAYYA',
  'PITTEA', 'RUNGADOO', 'TEELUCK',
  // Add more names here
]);
```

## Next Steps

1. Complete the Supabase setup above
2. Update your `.env` file with the correct credentials
3. Test the roster system in your app
4. Add your actual roster data
5. Share authentication codes with your colleagues

Your roster system will then be ready for collaborative editing!