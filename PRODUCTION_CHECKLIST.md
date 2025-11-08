# 🚀 Production Deployment Checklist

## ✅ Pre-Deployment Verification

### Environment Configuration
- [ ] Created `.env.production` from `.env.production.example`
- [ ] Generated strong JWT secrets (64+ characters)
- [ ] Set production database URL (MongoDB Atlas/AWS DocumentDB)
- [ ] Configured production email service
- [ ] Set CORS_ORIGIN to production frontend URL
- [ ] Changed NODE_ENV to 'production'
- [ ] Set LOG_LEVEL to 'error' or 'warn'
- [ ] Updated INITIAL_ADMIN_PASSWORD
- [ ] Ran `npm run validate:prod` - **PASSED ✅**

### Security
- [ ] All secrets are strong and randomly generated
- [ ] SSL/TLS certificate obtained (Let's Encrypt/Commercial)
- [ ] HTTPS configured (Nginx/Apache reverse proxy)
- [ ] Firewall rules configured (allow only 80, 443, 22)
- [ ] SSH key-based authentication enabled
- [ ] Disabled root login
- [ ] fail2ban installed and configured
- [ ] Rate limiting tested and working
- [ ] CORS properly configured for production domain
- [ ] Security headers verified (Helmet)

### Database
- [ ] Production MongoDB cluster created
- [ ] Authentication enabled
- [ ] IP whitelist configured
- [ ] Database indexes created
- [ ] Automated backups scheduled
- [ ] Connection tested from production server
- [ ] Database credentials secured

### Email Service
- [ ] Email provider chosen (SendGrid/AWS SES/Mailgun)
- [ ] SPF record added to DNS
- [ ] DKIM record added to DNS
- [ ] DMARC policy configured
- [ ] Sender domain verified
- [ ] Test email sent successfully
- [ ] Email templates reviewed

### Application
- [ ] Dependencies installed (`npm ci --production`)
- [ ] All tests passing (`npm test`)
- [ ] Linting passed (`npm run lint`)
- [ ] No console.log statements in production code
- [ ] Error tracking configured (Sentry)
- [ ] Logging configured and tested
- [ ] File upload limits configured
- [ ] Static files path configured

### Infrastructure
- [ ] Server provisioned (adequate CPU/RAM/disk)
- [ ] Node.js 22.x installed
- [ ] PM2 installed globally
- [ ] Nginx/Apache installed and configured
- [ ] SSL certificate installed
- [ ] Log rotation configured
- [ ] Monitoring tools installed
- [ ] Backup strategy implemented

---

## 🔧 Deployment Steps

### 1. Server Setup
```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt-get install -y nginx
```

### 2. Application Deployment
```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/yourusername/hostel-management.git
cd hostel-management

# Server setup
cd server
npm ci --production
cp .env.production.example .env.production
# Edit .env.production with production values
nano .env.production

# Validate environment
npm run validate:prod

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 3. SSL Configuration
```bash
# Install Certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Configure Nginx (see SSL_SETUP_GUIDE.md)
sudo nano /etc/nginx/sites-available/hostel-management
sudo ln -s /etc/nginx/sites-available/hostel-management /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Database Setup
```bash
# Connect to MongoDB
mongosh "your-production-connection-string"

# Create indexes
use hostel_management
db.students.createIndex({ email: 1 }, { unique: true })
db.students.createIndex({ rollNumber: 1 }, { unique: true })
db.outpassrequests.createIndex({ student: 1, createdAt: -1 })
# ... (see database setup section)
```

### 5. Create Initial Admin
```bash
cd /var/www/hostel-management/server
node scripts/createInitialAdmin.js
# Change password immediately after first login!
```

---

## ✅ Post-Deployment Verification

### Functional Testing
- [ ] Server is running (check PM2 status)
- [ ] Health endpoint accessible (https://domain.com/api/health)
- [ ] SSL certificate valid (check in browser)
- [ ] Admin login successful
- [ ] Student creation works
- [ ] Outpass workflow works (create → approve → exit → return)
- [ ] Email notifications sent successfully
- [ ] File uploads working
- [ ] All API endpoints responding correctly

### Performance Testing
- [ ] Page load times acceptable (<3 seconds)
- [ ] API response times good (<500ms)
- [ ] Database queries optimized
- [ ] Gzip compression enabled
- [ ] Static assets cached properly

### Security Testing
- [ ] SSL Labs grade A or A+
- [ ] No console errors in browser
- [ ] CORS working correctly
- [ ] Rate limiting working
- [ ] Authentication working
- [ ] Authorization (role-based access) working
- [ ] XSS protection working
- [ ] CSRF protection working (if applicable)

### Monitoring
- [ ] Error tracking active (Sentry)
- [ ] Log aggregation working
- [ ] Uptime monitoring configured
- [ ] Alert notifications configured
- [ ] Performance monitoring active

---

## 📊 Monitoring Commands

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs hostel-api

# Monitor resources
pm2 monit

# Check Nginx logs
sudo tail -f /var/log/nginx/hostel-management-error.log

# Check application logs
tail -f /var/www/hostel-management/server/logs/production.log

# Check database status
mongosh "your-connection-string" --eval "db.serverStatus()"
```

---

## 🔄 Maintenance

### Regular Tasks
- [ ] **Daily:** Monitor error logs
- [ ] **Daily:** Check server resources
- [ ] **Weekly:** Review uptime reports
- [ ] **Weekly:** Check database backup status
- [ ] **Monthly:** Update dependencies
- [ ] **Monthly:** Review security patches
- [ ] **Monthly:** SSL certificate renewal check
- [ ] **Quarterly:** Performance audit
- [ ] **Quarterly:** Security audit

### Update Procedure
```bash
# Pull latest changes
cd /var/www/hostel-management
git pull origin main

# Update dependencies
cd server
npm ci --production

# Restart application
pm2 restart hostel-api

# Verify
pm2 logs hostel-api --lines 50
```

---

## 🚨 Emergency Procedures

### Server Down
1. Check PM2 status: `pm2 status`
2. View logs: `pm2 logs hostel-api --lines 100`
3. Restart: `pm2 restart hostel-api`
4. If still failing, check Nginx: `sudo systemctl status nginx`

### Database Connection Failed
1. Check MongoDB status
2. Verify connection string in .env.production
3. Check IP whitelist
4. Test connection: `mongosh "connection-string"`

### SSL Certificate Expired
1. Renew: `sudo certbot renew --force-renewal`
2. Reload Nginx: `sudo systemctl reload nginx`
3. Verify: Check https://yourdomain.com

### High Memory Usage
1. Check PM2: `pm2 monit`
2. Restart if needed: `pm2 restart hostel-api`
3. Consider scaling: Increase server resources

---

## 📞 Support Contacts

- **Hosting Provider:** [Your Provider Support]
- **Database Provider:** MongoDB Atlas Support
- **Email Service:** SendGrid/AWS Support
- **SSL Provider:** Let's Encrypt Community
- **Development Team:** [Your Contact Info]

---

## ✅ Final Checklist Before Go-Live

- [ ] All pre-deployment checks passed
- [ ] All deployment steps completed
- [ ] All post-deployment verifications passed
- [ ] Monitoring configured and active
- [ ] Backup strategy tested
- [ ] Emergency procedures documented
- [ ] Team trained on deployment process
- [ ] Rollback plan prepared
- [ ] Go-live announcement prepared

---

**Date Deployed:** _______________
**Deployed By:** _______________
**Production URL:** _______________
**Status:** ⬜ Development ⬜ Staging ⬜ **Production** ✅

---

## 🎉 Congratulations!

Your Hostel Management System is now live in production!

**Next Steps:**
1. Monitor for first 24 hours closely
2. Collect user feedback
3. Plan regular maintenance windows
4. Keep documentation updated
5. Celebrate your successful deployment! 🚀
