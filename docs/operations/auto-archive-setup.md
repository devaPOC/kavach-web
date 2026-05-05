# Auto-Archive Cron Job Setup

This document provides instructions for setting up automatic archiving of expired content in the Kavach awareness lab.

## Overview

The auto-archive functionality automatically archives:

- **Quizzes**: 2 days after their `endDate`
- **Learning Modules**: (Future enhancement - when end dates are added)

## Script Location

- **Script**: `scripts/auto-archive-expired.ts`
- **Package.json command**: `bun run auto-archive`

## Manual Execution

To manually run the auto-archive process:

```bash
# From project root
cd /path/to/kavach
bun run auto-archive
```

## Automated Execution with Cron

### 1. Daily Auto-Archive (Recommended)

Run auto-archive every day at 2:00 AM:

```bash
# Edit crontab
crontab -e

# Add this line (adjust path to your project)
0 2 * * * cd /path/to/kavach && bun run auto-archive >> /var/log/kavach-auto-archive.log 2>&1
```

### 2. Twice Daily Auto-Archive

Run auto-archive twice daily (2:00 AM and 2:00 PM):

```bash
# Add this line to crontab
0 2,14 * * * cd /path/to/kavach && bun run auto-archive >> /var/log/kavach-auto-archive.log 2>&1
```

### 3. Hourly Auto-Archive (High Frequency)

Run auto-archive every hour:

```bash
# Add this line to crontab
0 * * * * cd /path/to/kavach && bun run auto-archive >> /var/log/kavach-auto-archive.log 2>&1
```

## Setup Script for Production

For production environments, use this setup:

```bash
#!/bin/bash
# setup-auto-archive.sh

PROJECT_PATH="/path/to/kavach"
LOG_FILE="/var/log/kavach-auto-archive.log"
USER="kavach"  # User that runs the application

# Create log file with proper permissions
sudo touch $LOG_FILE
sudo chown $USER:$USER $LOG_FILE
sudo chmod 644 $LOG_FILE

# Add cron job (runs daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * cd $PROJECT_PATH && bun run auto-archive >> $LOG_FILE 2>&1") | crontab -

echo "Auto-archive cron job installed successfully!"
echo "Log file: $LOG_FILE"
echo "Next run: $(date -d 'tomorrow 02:00' '+%Y-%m-%d %H:%M:%S')"
```

## Monitoring

### Check Cron Jobs

```bash
# List current cron jobs
crontab -l

# Check if cron service is running
sudo systemctl status cron
```

### View Logs

```bash
# View auto-archive logs
tail -f /var/log/kavach-auto-archive.log

# View recent logs
tail -n 50 /var/log/kavach-auto-archive.log
```

### Manual Testing

```bash
# Test the script manually
cd /path/to/kavach
bun run auto-archive

# Check output and logs
echo $?  # Should return 0 for success
```

## Environment Variables

Ensure these environment variables are available in the cron environment:

```bash
# Add to ~/.bashrc or create a wrapper script
export NODE_ENV=production
export DATABASE_URL=postgresql://user:password@localhost:5432/kavach
export REDIS_URL=redis://localhost:6379
```

## Troubleshooting

### Common Issues

1. **Permission Denied**

   ```bash
   # Fix file permissions
   chmod +x scripts/auto-archive-expired.ts
   ```

2. **Bun Not Found in Cron**

   ```bash
   # Use full path to bun in crontab
   0 2 * * * cd /path/to/kavach && /usr/local/bin/bun run auto-archive >> /var/log/kavach-auto-archive.log 2>&1
   ```

3. **Environment Variables Missing**

   ```bash
   # Create wrapper script with environment
   #!/bin/bash
   source /home/user/.bashrc
   cd /path/to/kavach
   bun run auto-archive
   ```

### Debugging

```bash
# Run with verbose logging
cd /path/to/kavach
DEBUG=1 bun run auto-archive

# Check database connectivity
bun run scripts/test-db-connection.ts
```

## Security Considerations

- Run cron jobs as a dedicated user (not root)
- Ensure log files have appropriate permissions
- Monitor log file size and implement rotation
- Set up alerts for failed auto-archive runs

## Performance Notes

- Auto-archive runs are designed to be lightweight
- Database queries use indexes for optimal performance
- Process handles large numbers of expired items efficiently
- Consider running during low-traffic hours (e.g., 2 AM)

## Future Enhancements

- [ ] Add learning modules auto-archiving when end dates are implemented
- [ ] Email notifications for large archive operations
- [ ] Archive statistics dashboard
- [ ] Configurable archive delay (not hardcoded to 2 days)
- [ ] Archive restoration functionality
