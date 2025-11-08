# 🚀 Production Deployment Guide

## Pre-Deployment Checklist

### ✅ Environment Configuration
- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Generate strong JWT secrets (64+ characters)
- [ ] Configure production database URL (MongoDB Atlas, AWS DocumentDB)
- [ ] Set up production email service (SendGrid, AWS SES, Mailgun)
- [ ] Configure CORS_ORIGIN to production frontend URL
- [ ] Set LOG_LEVEL to 'error' or 'warn'
- [ ] Disable ENABLE_REGISTRATION (or restrict to admin)
- [ ] Enable EMAIL_VERIFICATION for production

### ✅ Security
- [ ] Generate and set strong JWT_SECRET and REFRESH_TOKEN_SECRET
- [ ] Change ADMIN_REGISTRATION_SECRET to unique value
- [ ] Update INITIAL_ADMIN_PASSWORD and change immediately after first login
- [ ] Set up SSL/TLS certificate (see SSL_SETUP_GUIDE.md)
- [ ] Configure firewall rules (allow only 80, 443, 22)
- [ ] Set up fail2ban for SSH protection
- [ ] Enable rate limiting (already configured)
- [ ] Review and update CORS settings

### ✅ Database
- [ ] Set up production MongoDB cluster (MongoDB Atlas recommended)
- [ ] Enable authentication
- [ ] Configure IP whitelist
- [ ] Set up automated backups
- [ ] Create read replicas (optional for high availability)
- [ ] Test connection from production server

### ✅ Email Service
- [ ] Choose email provider (SendGrid, AWS SES, Mailgun)
- [ ] Set up SPF, DKIM, and DMARC records
- [ ] Verify sender domain
- [ ] Test email delivery
- [ ] Set up email templates (if needed)

### ✅ File Storage
- [ ] Set up cloud storage (AWS S3, Cloudinary, DigitalOcean Spaces)
- [ ] Configure upload limits
- [ ] Set up CDN for static assets (optional)

### ✅ Monitoring & Logging
- [ ] Set up error tracking (Sentry recommended)
- [ ] Configure log rotation
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure application performance monitoring (New Relic, Datadog)
- [ ] Set up alerts for critical errors

---

## Deployment Options

### Option 1: Traditional VPS (DigitalOcean, AWS EC2, Linode)

#### Server Setup

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB (or use cloud service)
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Install Nginx
sudo apt-get install -y nginx

# Install PM2 for process management
sudo npm install -g pm2

# Install Git
sudo apt-get install -y git
```

#### Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/hostel-management
sudo chown -R $USER:$USER /var/www/hostel-management

# Clone repository
cd /var/www/hostel-management
git clone https://github.com/yourusername/hostel-management.git .

# Server setup
cd server
npm install --production

# Copy and configure environment
cp .env.production.example .env.production
nano .env.production  # Edit with your values

# Client setup
cd ../client
npm install
npm run build  # Creates optimized production build

# Start server with PM2
cd ../server
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Follow instructions to enable on boot
```

#### PM2 Ecosystem File

Create `server/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'hostel-api',
    script: 'src/server.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    autorestart: true,
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    min_uptime: '10s',
    max_restarts: 10
  }]
}
```

#### Nginx Configuration

See SSL_SETUP_GUIDE.md for complete Nginx configuration.

```bash
# Copy Nginx config
sudo nano /etc/nginx/sites-available/hostel-management

# Enable site
sudo ln -s /etc/nginx/sites-available/hostel-management /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Option 2: Docker Deployment

#### Create Dockerfile

`server/Dockerfile`:

```dockerfile
FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Build stage
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hostelapi

# Copy dependencies and source
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json

# Create directories
RUN mkdir -p uploads logs
RUN chown -R hostelapi:nodejs /app

USER hostelapi

EXPOSE 5000

CMD ["node", "src/server.js"]
```

`client/Dockerfile`:

```dockerfile
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage - Nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose

`docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: hostel-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

  api:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: hostel-api
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/hostel_management?authSource=admin
      JWT_SECRET: ${JWT_SECRET}
      REFRESH_TOKEN_SECRET: ${REFRESH_TOKEN_SECRET}
      CORS_ORIGIN: https://yourdomain.com
    env_file:
      - ./server/.env.production
    volumes:
      - ./server/uploads:/app/uploads
      - ./server/logs:/app/logs
    ports:
      - "5000:5000"
    depends_on:
      - mongodb

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    container_name: hostel-client
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api

volumes:
  mongodb_data:
    driver: local
```

#### Deploy with Docker

```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop
docker-compose -f docker-compose.prod.yml down
```

---

### Option 3: Heroku

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create hostel-management-api

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
heroku config:set REFRESH_TOKEN_SECRET=your-secret
heroku config:set CORS_ORIGIN=https://your-frontend.herokuapp.com

# Deploy
git push heroku main

# Scale dynos
heroku ps:scale web=1

# View logs
heroku logs --tail
```

Create `Procfile`:

```
web: node server/src/server.js
```

---

### Option 4: AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p node.js-22 hostel-management

# Create environment
eb create production

# Deploy
eb deploy

# View logs
eb logs
```

---

### Option 5: DigitalOcean App Platform

1. Connect GitHub repository
2. Configure build settings:
   - Build Command: `npm install && npm run build`
   - Run Command: `node src/server.js`
3. Add environment variables
4. Deploy

---

## Post-Deployment Tasks

### 1. Verify Deployment

```bash
# Check server health
curl https://yourdomain.com/api/health

# Test API
curl https://yourdomain.com/api/v1/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@domain.com","password":"Admin@123"}'
```

### 2. Create Initial Admin

```bash
# SSH into server
ssh user@your-server

# Run admin creation
cd /var/www/hostel-management/server
node scripts/createInitialAdmin.js
```

### 3. Database Indexes

```bash
# Connect to MongoDB
mongosh "your-connection-string"

# Verify indexes
use hostel_management
db.students.getIndexes()
db.outpassrequests.getIndexes()
```

### 4. Set Up Monitoring

```bash
# PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Install monitoring dashboard
pm2 install pm2-server-monit
```

### 5. Configure Backups

```bash
# MongoDB backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="your-connection-string" --out=/backups/db_backup_$DATE
find /backups -mtime +7 -delete  # Keep last 7 days

# Add to crontab
0 2 * * * /path/to/backup.sh
```

### 6. Set Up SSL Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab
sudo crontab -e
0 0,12 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

---

## Maintenance

### Update Application

```bash
# Pull latest code
cd /var/www/hostel-management
git pull origin main

# Server update
cd server
npm install --production
pm2 restart hostel-api

# Client update
cd ../client
npm install
npm run build
```

### Monitor Logs

```bash
# PM2 logs
pm2 logs hostel-api

# Nginx logs
sudo tail -f /var/log/nginx/hostel-management-error.log

# Application logs
tail -f server/logs/production.log
```

### Database Maintenance

```bash
# Compact database
mongosh "your-connection-string" --eval "db.runCommand({compact: 'students'})"

# Check database stats
mongosh "your-connection-string" --eval "db.stats()"
```

---

## Troubleshooting

### Server Won't Start

```bash
# Check PM2 status
pm2 status

# View detailed logs
pm2 logs hostel-api --lines 100

# Check Node.js version
node --version  # Should be 22.x

# Check environment file
cat server/.env.production
```

### Database Connection Issues

```bash
# Test MongoDB connection
mongosh "your-connection-string"

# Check firewall
sudo ufw status

# Verify IP whitelist (MongoDB Atlas)
```

### SSL Certificate Issues

```bash
# Check certificate
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal

# Test Nginx config
sudo nginx -t
```

---

## Security Best Practices

1. ✅ Use environment variables for sensitive data
2. ✅ Enable HTTPS only
3. ✅ Keep Node.js and dependencies updated
4. ✅ Use PM2 or similar for process management
5. ✅ Set up firewall rules
6. ✅ Regular security audits (`npm audit`)
7. ✅ Monitor error logs
8. ✅ Rate limiting enabled
9. ✅ CORS properly configured
10. ✅ Regular backups

---

## Performance Optimization

### 1. Enable Caching

```javascript
// Add to Nginx config
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 2. Use CDN

- Cloudflare (Free tier available)
- AWS CloudFront
- DigitalOcean CDN

### 3. Database Optimization

- Create proper indexes
- Use lean() for read-only queries
- Implement pagination
- Use projection to limit fields

### 4. Enable Compression

Already enabled in `server/src/app.js`:
- ✅ Gzip compression
- ✅ JSON size limits

---

## Scaling Strategies

### Vertical Scaling
- Upgrade server resources (CPU, RAM)
- Optimize database queries
- Enable caching

### Horizontal Scaling
- Use PM2 cluster mode (already configured)
- Set up load balancer
- Use database read replicas
- Implement Redis for session storage

---

## Support & Resources

- **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
- **PM2 Documentation**: https://pm2.keymetrics.io/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/
- **Sentry**: https://sentry.io/
- **SendGrid**: https://sendgrid.com/

---

**Status: Production deployment guide complete! ✅**
