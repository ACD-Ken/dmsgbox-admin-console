# DMsgBox Admin Console - Device Management

A web-based admin dashboard for managing DMsgBox devices and revoking access to devices registered on user accounts.

## Features

- **Admin Authentication**: Secure login with Supabase authentication
- **Device List View**: View all devices with search and filtering
- **Device Details**: View detailed information about any registered device
- **Device Revocation**: Revoke access to specific devices with optional reason
- **Real-time Statistics**: Track total, active, and revoked devices
- **Responsive Design**: Works on desktop and tablet screens

## Deployment

### Option 1: GitHub Pages (Recommended for MVP)

1. Create a new GitHub repository `dmsgbox-admin-console`
2. Push this folder to the repository
3. Go to Settings → Pages
4. Select "Deploy from a branch"
5. Choose `main` branch and `/root` folder
6. Share the published URL: `https://yourusername.github.io/dmsgbox-admin-console`

### Option 2: Supabase Storage

```bash
# Upload to Supabase Storage public bucket
supabase storage upload-files admin-console/* --bucket dmsgbox-public
```

Then access at: `https://bjpwckpmktnwtdzpmnvn.supabase.co/storage/v1/object/public/dmsgbox-public/index.html`

### Option 3: Netlify

1. Connect your GitHub repo to Netlify
2. Set build command: `echo "No build needed"`
3. Set publish directory: `/`
4. Deploy

## Configuration

The console is configured to connect to the DMsgBox Supabase project:

- **URL**: `https://bjpwckpmktnwtdzpmnvn.supabase.co`
- **API Key**: Uses public Anon key (read-only, RLS enforced)

All data access is protected by Supabase Row Level Security (RLS) policies. Only users with admin role can:
- View all devices
- Revoke devices
- View audit logs

## Usage

### Login

1. Open the admin console in your browser
2. Enter your Supabase admin account credentials
3. System verifies your admin role before allowing access

### View Devices

- All registered devices are displayed in a table
- Use the search bar to find specific devices
- Filter by status (Active/Revoked)
- Click "View" to see device details

### Revoke a Device

1. Find the device in the list
2. Click the "Revoke" button
3. Enter optional reason for revocation
4. Confirm revocation

**Effect**: The revoked device will be logged out immediately and unable to access the account. A revocation audit log entry is created for compliance.

## Architecture

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern responsive design with CSS variables
- **JavaScript ES6+**: Async/await, fetch API
- **Supabase JS SDK**: Real-time database access

### Backend
- **Supabase PostgreSQL**: Data storage
- **RLS Policies**: Row-level security for admin-only access
- **PL/pgSQL Functions**: `revoke_device()` RPC for secure revocation

### Data Flow

```
Admin Console
    ↓
Supabase JS SDK (Client-side)
    ↓
Supabase Auth (JWT verification)
    ↓
RLS Policies (Check admin role)
    ↓
PostgreSQL Database
```

## Security Considerations

1. **Authentication**: Uses Supabase JWT tokens
2. **Authorization**: RLS policies enforce admin-only access
3. **XSS Protection**: HTML escaping on all user-provided data
4. **HTTPS**: Always use HTTPS when deployed
5. **CORS**: Configured via Supabase project settings

## Database Queries

### List All Devices (Admin)

```sql
SELECT * FROM devices WHERE auth.uid() = user_id 
OR EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
);
```

### Revoke Device (Admin Only)

```sql
SELECT revoke_device(
    p_device_id := '...',
    p_reason := 'Admin revocation'
);
```

## Monitoring & Analytics

Device revocations are logged in the `device_revocations` table for compliance:

```sql
SELECT * FROM device_revocations 
WHERE revoked_by = auth.uid()
ORDER BY revoked_at DESC;
```

## Troubleshooting

### "Permission denied" error

- **Cause**: Your user account doesn't have admin role
- **Solution**: Ask a Supabase admin to set your `user_profiles.role` to 'admin'

### Devices not loading

- **Cause**: Network or Supabase outage
- **Solution**: Check browser console for errors, verify Supabase status

### Revocation not working

- **Cause**: Device already revoked or deleted
- **Solution**: Refresh the page to get updated data

## Technical Details

### Response Format

```javascript
{
  id: "uuid",
  device_id: "device-uuid",
  device_name: "Samsung Galaxy S24",
  user_id: "user-uuid",
  is_revoked: false,
  created_at: "2026-04-28T10:00:00+00:00",
  last_active: "2026-04-28T10:30:00+00:00",
  revoked_at: null,
  revoked_by: null
}
```

### Revocation RPC Response

```javascript
{
  success: true,
  device_id: "uuid",
  revoked_at: "2026-04-28T10:35:00+00:00",
  message: "Device revoked successfully"
}
```

## Future Enhancements

- [ ] Bulk device revocation
- [ ] Device revocation scheduling
- [ ] Email notifications to users
- [ ] Advanced filtering (by date, status, user)
- [ ] Export device list to CSV
- [ ] Device activity history visualization
- [ ] Two-factor authentication for admin console
- [ ] Admin action audit trail

## Support

For issues or questions about the admin console, please check:
1. Browser console for JavaScript errors
2. Supabase dashboard logs
3. Network tab for failed API requests

## License

MIT - See LICENSE file in root directory

---

**Last Updated**: April 28, 2026  
**Version**: 1.0.0  
**Maintainer**: DMsgBox Team
