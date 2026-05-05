# Data Management Scripts for Kavach Awareness Lab

This directory contains comprehensive data management scripts for maintaining, validating, cleaning, migrating, and archiving data in the Kavach Awareness Lab system.

## Overview

The data management suite provides tools for:

- **Data Validation**: Identify and fix data integrity issues
- **Data Cleanup**: Remove orphaned records and optimize performance
- **Data Consistency**: Check and repair referential integrity
- **Data Migration**: Safe schema migrations with rollback capabilities
- **Data Deduplication**: Identify and resolve duplicate records
- **Data Archival**: Archive old data while maintaining referential integrity

## Scripts

### 1. Data Validation (`data-validation.ts`)

Comprehensive data validation script that identifies orphaned records, inconsistencies, and referential integrity issues.

```bash
# Analyze data issues without fixing
bun run scripts/data-validation.ts

# Analyze and automatically fix issues
bun run scripts/data-validation.ts --fix

# Generate report only
bun run scripts/data-validation.ts --report-only
```

**Features:**

- Identifies orphaned quiz questions, attempts, and materials
- Checks for published content without required data
- Validates referential integrity across all tables
- Provides detailed error reporting with fix suggestions
- Automatic repair capabilities for safe issues

### 2. Data Cleanup (`data-cleanup.ts`)

Enhanced cleanup utility for removing orphaned data, unused templates, and optimizing database performance.

```bash
# Preview cleanup operations (dry run)
bun run scripts/data-cleanup.ts --dry-run

# Clean orphaned records only
bun run scripts/data-cleanup.ts --orphaned

# Clean unused templates only
bun run scripts/data-cleanup.ts --templates

# Clean old archived content
bun run scripts/data-cleanup.ts --archived

# Run database optimization
bun run scripts/data-cleanup.ts --optimize

# Run all cleanup operations
bun run scripts/data-cleanup.ts --all
```

**Features:**

- Removes orphaned quiz questions and attempts
- Cleans up unused quiz templates
- Archives expired quizzes automatically
- Optimizes database with VACUUM and REINDEX
- Detailed operation reporting

### 3. Data Consistency Checker (`data-consistency-checker.ts`)

Advanced consistency checker that performs comprehensive referential integrity validation and automated repairs.

```bash
# Check for consistency issues
bun run scripts/data-consistency-checker.ts --check-only

# Check and automatically repair issues
bun run scripts/data-consistency-checker.ts --auto-repair

# Generate detailed report
bun run scripts/data-consistency-checker.ts --report --verbose
```

**Features:**

- Comprehensive referential integrity checking
- Business logic validation (e.g., published content requirements)
- Performance issue identification
- Automated repair capabilities
- Detailed reporting with severity levels

### 4. Data Migration (`data-migration.ts`)

Safe migration tool with rollback capabilities for schema changes and data transformations.

```bash
# List available migrations
bun run scripts/data-migration.ts --list

# Preview migration (dry run)
bun run scripts/data-migration.ts --migration add_quiz_metadata_fields --dry-run

# Apply migration
bun run scripts/data-migration.ts --migration add_quiz_metadata_fields

# Rollback migration
bun run scripts/data-migration.ts --rollback add_quiz_metadata_fields
```

**Available Migrations:**

- `add_quiz_metadata_fields`: Add validation status and performance metrics to quizzes
- `add_quiz_attempt_metadata`: Add session tracking and security fields to attempts
- `add_learning_material_metadata`: Add security validation and access tracking to materials
- `migrate_quiz_question_format`: Migrate questions to enhanced format with metadata

**Features:**

- Safe migrations with automatic backups
- Rollback capabilities for all migrations
- Data transformation with validation
- Dependency management between migrations
- Risk assessment and confirmation prompts

### 5. Data Deduplication (`data-deduplication.ts`)

Intelligent deduplication tool that identifies and resolves duplicate records with conflict resolution.

```bash
# Analyze duplicates without removing
bun run scripts/data-deduplication.ts --analyze

# Remove duplicates with automatic resolution
bun run scripts/data-deduplication.ts --deduplicate --auto-resolve

# Focus on specific table
bun run scripts/data-deduplication.ts --analyze --table quizzes

# Interactive conflict resolution
bun run scripts/data-deduplication.ts --deduplicate --interactive
```

**Features:**

- Identifies exact and similar duplicates
- Content similarity analysis for quizzes and modules
- Intelligent conflict resolution strategies
- Preserves data with highest value/usage
- Interactive and automatic resolution modes

### 6. Data Archival (`data-archival.ts`)

Comprehensive archival tool that safely archives old data while maintaining referential integrity.

```bash
# Create archive table structure
bun run scripts/data-archival.ts --create-archive-tables

# Soft archival (mark as archived)
bun run scripts/data-archival.ts --archive-type soft --age-threshold 365

# Hard archival (move to archive tables)
bun run scripts/data-archival.ts --archive-type hard --age-threshold 730

# External archival (export to files)
bun run scripts/data-archival.ts --archive-type external --age-threshold 1095

# Preview archival plan
bun run scripts/data-archival.ts --dry-run --age-threshold 365
```

**Archival Types:**

- **Soft**: Mark records as archived (keeps in same tables)
- **Hard**: Move records to dedicated archive tables
- **External**: Export records to JSON/CSV files

**Features:**

- Maintains referential integrity during archival
- Configurable age thresholds
- Safety checks for active content
- Dependency analysis and preservation
- Multiple archival strategies

## Usage Guidelines

### Safety Recommendations

1. **Always backup before running scripts in production**
2. **Use dry-run mode first** to preview changes
3. **Test in development environment** before production
4. **Run during maintenance windows** for large operations
5. **Monitor system performance** during execution

### Execution Order

For comprehensive data maintenance, run scripts in this order:

1. **Data Validation** - Identify issues first
2. **Data Consistency Checker** - Fix referential integrity
3. **Data Cleanup** - Remove orphaned data
4. **Data Deduplication** - Resolve duplicates
5. **Data Migration** - Apply schema changes (if needed)
6. **Data Archival** - Archive old data

### Monitoring and Logging

All scripts provide comprehensive logging and can be monitored through:

- Console output with progress indicators
- Structured logging to application logs
- Error reporting with correlation IDs
- Performance metrics and timing information

### Error Handling

Scripts include robust error handling:

- **Transactional operations** - All-or-nothing execution
- **Rollback capabilities** - Undo changes if errors occur
- **Detailed error reporting** - Specific error messages and context
- **Graceful degradation** - Continue processing when possible

## Configuration

### Environment Variables

```bash
# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/kavach

# Environment
NODE_ENV=development|production

# Logging level
LOG_LEVEL=info|debug|warn|error
```

### Script-Specific Options

Each script supports various command-line options. Use `--help` or check the script header comments for detailed usage information.

## Integration with CI/CD

These scripts can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Data Validation
  run: bun run scripts/data-validation.ts --fix

- name: Run Data Cleanup
  run: bun run scripts/data-cleanup.ts --orphaned --templates

- name: Apply Migrations
  run: bun run scripts/data-migration.ts --migration latest
```

## Troubleshooting

### Common Issues

1. **Permission Errors**
   - Ensure database user has required permissions
   - Check file system permissions for backups/archives

2. **Memory Issues**
   - Use pagination for large datasets
   - Run scripts during low-traffic periods

3. **Lock Timeouts**
   - Reduce concurrent operations
   - Increase database timeout settings

4. **Referential Integrity Violations**
   - Run consistency checker first
   - Use `--preserve-references` option

### Getting Help

- Check script logs for detailed error information
- Use `--verbose` flag for additional debugging output
- Review the script source code for implementation details
- Contact the development team for complex issues

## Performance Considerations

- **Large Datasets**: Scripts are optimized for large datasets but may require tuning
- **Concurrent Access**: Some operations may lock tables temporarily
- **Resource Usage**: Monitor CPU and memory usage during execution
- **Network I/O**: External archival may require significant bandwidth

## Security Considerations

- **Data Privacy**: Archived data may contain sensitive information
- **Access Control**: Restrict script execution to authorized personnel
- **Audit Logging**: All operations are logged for audit purposes
- **Backup Security**: Ensure backups are stored securely

## Future Enhancements

Planned improvements include:

- **Incremental Processing**: Process data in smaller batches
- **Parallel Execution**: Multi-threaded processing for better performance
- **Advanced Analytics**: More sophisticated duplicate detection
- **Cloud Integration**: Direct integration with cloud storage services
- **Automated Scheduling**: Built-in cron-like scheduling capabilities

---

For questions or issues with these scripts, please contact the development team or create an issue in the project repository.
