# Development Setup Troubleshooting

This comprehensive troubleshooting guide covers common issues encountered during Kavach development setup and provides step-by-step solutions.

## Quick Diagnosis

### System Health Check

Run this quick diagnostic script to identify common issues:

```bash
#!/bin/bash
# Quick health check script

echo "🔍 Kavach Development Environment Health Check"
echo "=============================================="

# Check Node.js/Bun
echo "📦 Runtime Environment:"
if command -v bun &> /dev/null; then
    echo "✅ Bun: $(bun --version)"
else
    echo "❌ Bun not found"
fi

if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js not found"
fi

# Check database
echo "🗄️ Database:"
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL client installed"
    if pg_isready -h localhost -p 5432 &> /dev/null; then
        echo "✅ PostgreSQL server running"
    else
        echo "❌ PostgreSQL server not running"
    fi
else
    echo "❌ PostgreSQL client not found"
fi

# Check Docker
echo "🐳 Docker:"
if command -v docker &> /dev/null; then
    echo "✅ Docker: $(docker --version)"
    if docker ps &> /dev/null; then
        echo "✅ Docker daemon running"
    else
        echo "❌ Docker daemon not running"
    fi
else
    echo "❌ Docker not found"
fi

# Check project files
echo "📁 Project Files:"
if [ -f "package.json" ]; then
    echo "✅ package.json found"
else
    echo "❌ package.json not found - are you in the project directory?"
fi

if [ -f ".env" ]; then
    echo "✅ .env file found"
else
    echo "❌ .env file not found"
fi

if [ -d "node_modules" ]; then
    echo "✅ node_modules directory found"
else
    echo "❌ node_modules not found - run 'bun install'"
fi

echo "=============================================="
echo "Run specific sections below for detailed troubleshooting"
```

## Installation Issues

### 1. Bun Installation Problems

#### Issue: Bun installation fails
```bash
# Error: curl: command not found
# Solution: Install curl first

# macOS
brew install curl

# Ubuntu/Debian
sudo apt update && sudo apt install curl

# Then retry Bun installation
curl -fsSL https://bun.sh/install | bash
```

#### Issue: Bun not found after installation
```bash
# Check if Bun is in PATH
echo $PATH

# Add Bun to PATH manually
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Or for zsh
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify installation
bun --version
```

#### Issue: Permission denied errors
```bash
# Fix Bun permissions
sudo chown -R $(whoami) ~/.bun

# Or reinstall Bun with proper permissions
rm -rf ~/.bun
curl -fsSL https://bun.sh/install | bash
```

### 2. Node.js Installation Problems

#### Issue: Node.js version conflicts
```bash
# Install Node Version Manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install and use correct Node.js version
nvm install 18
nvm use 18
nvm alias default 18

# Verify version
node --version  # Should be 18.x.x
```

#### Issue: npm permission errors
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Or use nvm (recommended)
nvm use 18
```

### 3. Git Installation Issues

#### Issue: Git not found
```bash
# macOS
brew install git

# Ubuntu/Debian
sudo apt update && sudo apt install git

# Windows
# Download from https://git-scm.com/download/win

# Verify installation
git --version
```

#### Issue: Git configuration problems
```bash
# Set up Git configuration
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Check configuration
git config --list
```

## Database Issues

### 1. PostgreSQL Installation Problems

#### Issue: PostgreSQL installation fails

**macOS:**
```bash
# If Homebrew installation fails
brew update
brew doctor
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# If service won't start
brew services stop postgresql@15
rm -rf /usr/local/var/postgres
initdb /usr/local/var/postgres
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
# If apt installation fails
sudo apt update
sudo apt install wget ca-certificates

# Add PostgreSQL repository
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list

# Install PostgreSQL
sudo apt update
sudo apt install postgresql-15 postgresql-contrib-15

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Issue: PostgreSQL won't start
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check logs
sudo journalctl -u postgresql

# Common fixes:
# 1. Port conflict
sudo netstat -tulpn | grep :5432
# Kill process using port 5432 if needed

# 2. Permission issues
sudo chown -R postgres:postgres /var/lib/postgresql/
sudo chmod 700 /var/lib/postgresql/15/main

# 3. Configuration issues
sudo -u postgres psql -c "SHOW config_file;"
# Edit postgresql.conf if needed

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 2. Database Connection Issues

#### Issue: Connection refused
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# If using Docker
docker ps | grep postgres
docker logs kavach_postgres

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

#### Issue: Authentication failed
```bash
# Check PostgreSQL authentication
sudo -u postgres psql

# Create user if doesn't exist
CREATE USER kavach_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE kavach_auth OWNER kavach_user;
GRANT ALL PRIVILEGES ON DATABASE kavach_auth TO kavach_user;

# Update pg_hba.conf if needed
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Add line: local all kavach_user md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### Issue: Database doesn't exist
```bash
# Create database
createdb -O kavach_user kavach_auth

# Or using SQL
sudo -u postgres psql -c "CREATE DATABASE kavach_auth OWNER kavach_user;"

# Verify database exists
psql -U kavach_user -d kavach_auth -c "\l"
```

### 3. Docker Database Issues

#### Issue: Docker not running
```bash
# Start Docker daemon
sudo systemctl start docker

# Enable Docker to start on boot
sudo systemctl enable docker

# Add user to docker group (Linux)
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

#### Issue: Docker Compose fails
```bash
# Check Docker Compose version
docker-compose --version

# If not installed
sudo apt install docker-compose

# Or install newer version
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Issue: PostgreSQL container won't start
```bash
# Check container logs
docker logs kavach_postgres

# Common issues:
# 1. Port already in use
sudo netstat -tulpn | grep :5432
docker stop $(docker ps -q --filter "publish=5432")

# 2. Volume permission issues
docker-compose down
docker volume rm kavach_postgres_data
docker-compose up -d

# 3. Environment variable issues
# Check .env file has POSTGRES_PASSWORD set
grep POSTGRES_PASSWORD .env
```

## Application Issues

### 1. Package Installation Problems

#### Issue: Dependencies won't install
```bash
# Clear cache and reinstall
rm -rf node_modules
rm bun.lockb  # or package-lock.json
bun install

# If still failing, check network
curl -I https://registry.npmjs.org/

# Use different registry if needed
bun config set registry https://registry.npmjs.org/
```

#### Issue: Version conflicts
```bash
# Check dependency tree
bun why package-name

# Force resolution
bun add package-name@specific-version

# Clear cache
bun pm cache rm
```

#### Issue: Peer dependency warnings
```bash
# Install missing peer dependencies
bun add -D @types/react @types/react-dom

# Check what's needed
bun add --dry-run package-name
```

### 2. Development Server Issues

#### Issue: Port 3000 already in use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 bun run dev
```

#### Issue: Hot reload not working
```bash
# Check file watchers limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Clear Next.js cache
rm -rf .next

# Restart development server
bun run dev
```

#### Issue: TypeScript errors
```bash
# Clear TypeScript cache
rm tsconfig.tsbuildinfo

# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Check TypeScript configuration
npx tsc --noEmit
```

### 3. Build Issues

#### Issue: Build fails with memory errors
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" bun run build

# Or add to package.json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
  }
}
```

#### Issue: Module not found errors
```bash
# Check import paths
# Ensure paths match exactly (case-sensitive)

# Check tsconfig.json paths
cat tsconfig.json | grep -A 10 "paths"

# Clear module cache
rm -rf .next
rm -rf node_modules/.cache
```

## Environment Configuration Issues

### 1. Environment Variables

#### Issue: Environment variables not loading
```bash
# Check .env file exists
ls -la .env

# Check file format (no spaces around =)
cat .env | grep -v "^#" | grep "="

# Check for BOM or special characters
file .env
# Should show: ASCII text

# Recreate .env if needed
cp .env.example .env
```

#### Issue: Database URL format errors
```bash
# Correct format
DATABASE_URL=postgresql://username:password@host:port/database

# Common mistakes:
# - Missing protocol: postgresql://
# - Wrong port: should be 5432 for PostgreSQL
# - Special characters in password need URL encoding

# Test connection string
psql $DATABASE_URL
```

#### Issue: JWT secrets too short
```bash
# Generate secure secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Update .env with generated secrets
JWT_SECRET=generated_secret_here
SESSION_SECRET=another_generated_secret_here
```

### 2. Email Configuration

#### Issue: Email sending fails
```bash
# Test email configuration
bun run test:email

# Common Gmail issues:
# 1. Use App Password, not regular password
# 2. Enable 2-Factor Authentication first
# 3. Check SMTP settings:
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=app_password_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
```

## VS Code Issues

### 1. Extension Problems

#### Issue: TypeScript extension not working
```bash
# Restart TypeScript server
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Check TypeScript version
# Cmd/Ctrl + Shift + P → "TypeScript: Select TypeScript Version"
# Choose "Use Workspace Version"

# Reinstall TypeScript
bun add -D typescript@latest
```

#### Issue: ESLint not working
```bash
# Check ESLint configuration
cat .eslintrc.json

# Install ESLint extension dependencies
bun add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Restart VS Code
```

#### Issue: Tailwind IntelliSense not working
```bash
# Check Tailwind config exists
ls tailwind.config.*

# Install Tailwind CSS IntelliSense extension
code --install-extension bradlc.vscode-tailwindcss

# Check VS Code settings
cat .vscode/settings.json
```

### 2. Debugging Issues

#### Issue: Debugger not attaching
```bash
# Check launch.json configuration
cat .vscode/launch.json

# Ensure correct port
# Default Next.js debug port is 9229

# Start with debug flag
NODE_OPTIONS='--inspect' bun run dev
```

## Performance Issues

### 1. Slow Development Server

#### Issue: Slow startup
```bash
# Use Turbopack (already configured)
bun run dev  # Uses --turbopack flag

# Clear caches
rm -rf .next
rm -rf node_modules/.cache

# Check system resources
top
# Look for high CPU/memory usage
```

#### Issue: Slow hot reload
```bash
# Increase file watcher limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Exclude unnecessary directories
# Add to .gitignore:
node_modules/
.next/
dist/
```

### 2. Database Performance

#### Issue: Slow queries
```bash
# Open database studio
bun run db:studio

# Check query performance
# Look for missing indexes

# Run database maintenance
bun run db:maintenance
```

## Testing Issues

### 1. Test Setup Problems

#### Issue: Tests won't run
```bash
# Check Vitest configuration
cat vitest.config.ts

# Install test dependencies
bun add -D vitest @vitest/coverage-v8

# Run tests with verbose output
bun run test --reporter=verbose
```

#### Issue: Database tests failing
```bash
# Check test database exists
createdb -O kavach_user kavach_auth_test

# Set test environment
NODE_ENV=test bun run db:migrate

# Clear test database between runs
NODE_ENV=test bun run scripts/reset-test-db.ts
```

## Network and Firewall Issues

### 1. Connection Problems

#### Issue: Cannot connect to localhost
```bash
# Check if services are running
netstat -tulpn | grep :3000  # Next.js
netstat -tulpn | grep :5432  # PostgreSQL

# Check firewall (Ubuntu)
sudo ufw status
sudo ufw allow 3000
sudo ufw allow 5432

# Check hosts file
cat /etc/hosts
# Should have: 127.0.0.1 localhost
```

#### Issue: Docker networking problems
```bash
# Check Docker networks
docker network ls

# Inspect network
docker network inspect bridge

# Restart Docker networking
sudo systemctl restart docker
```

## Recovery Procedures

### 1. Complete Reset

If all else fails, perform a complete reset:

```bash
#!/bin/bash
echo "🔄 Performing complete Kavach development reset..."

# Stop all services
bun run docker:down
pkill -f "next"

# Clean project
rm -rf node_modules
rm -rf .next
rm -rf dist
rm bun.lockb
rm tsconfig.tsbuildinfo

# Clean Docker
docker system prune -f
docker volume prune -f

# Reinstall dependencies
bun install

# Reset database
bun run docker:up
sleep 10
bun run db:init
bun run db:migrate
bun run db:seed

# Test installation
bun run test
bun run dev

echo "✅ Reset complete!"
```

### 2. Backup and Restore

```bash
# Backup current state
tar -czf kavach-backup-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=dist \
  .

# Restore from backup
tar -xzf kavach-backup-20250120.tar.gz
bun install
bun run docker:up
bun run db:migrate
```

## Getting Help

### 1. Diagnostic Information

When seeking help, provide this information:

```bash
# System information
echo "OS: $(uname -a)"
echo "Bun: $(bun --version)"
echo "Node: $(node --version)"
echo "Docker: $(docker --version)"
echo "PostgreSQL: $(psql --version)"

# Project information
echo "Package.json:"
cat package.json | grep -A 5 -B 5 "version"

echo "Environment:"
env | grep -E "(NODE_ENV|DATABASE_URL|NEXT_PUBLIC)" | sed 's/=.*/=***/'

# Error logs
echo "Recent errors:"
tail -n 50 ~/.bun/install/debug.log 2>/dev/null || echo "No Bun logs"
```

### 2. Common Resources

- **Project Documentation**: Check other docs in this repository
- **Next.js Documentation**: https://nextjs.org/docs
- **Bun Documentation**: https://bun.sh/docs
- **Drizzle Documentation**: https://orm.drizzle.team/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/

### 3. Community Support

- Check project issues on GitHub
- Search Stack Overflow for similar problems
- Join the project Discord/Slack if available

## Prevention Tips

### 1. Regular Maintenance

```bash
# Weekly maintenance script
#!/bin/bash
echo "🧹 Weekly Kavach maintenance..."

# Update dependencies
bun update

# Run security audit
bun audit

# Clean caches
bun pm cache rm
rm -rf .next

# Run tests
bun run test

# Database maintenance
bun run db:maintenance

echo "✅ Maintenance complete!"
```

### 2. Development Best Practices

- **Always use lock files** (bun.lockb, package-lock.json)
- **Keep dependencies updated** regularly
- **Use environment files** for configuration
- **Run tests** before committing
- **Clear caches** when encountering weird issues
- **Use version managers** for Node.js/Bun
- **Document custom configurations**

Your development environment should now be robust and well-maintained! 🛠️