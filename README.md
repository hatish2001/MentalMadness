# MentalMadness - Breaking the Corporate Burnout Cycle

## The Problem: Corporate Burnout is Real

Working at corporate and feeling burnout isn't just a buzzword—it's a silent epidemic. You know the drill: endless meetings that could've been emails, deadlines that keep moving, the constant ping of notifications, and that nagging feeling that you're always behind. The 9-to-5 has become 24/7, and your mental health is paying the price.

**The statistics are sobering:**
- 76% of employees experience burnout at some point
- Burnout costs companies $190 billion annually in healthcare spending
- 50% of employees have left a job due to mental health reasons
- Only 1 in 3 employees feel their company genuinely cares about their wellbeing

The corporate world has normalized stress, but we're here to say: **enough is enough.**

## Introducing MentalMadness

MentalMadness is a B2B mental health platform born from the frustration of watching talented people break under the weight of corporate pressure. We're not here to add another wellness app to your phone. We're here to **disrupt the burnout cycle** and give companies the tools to actually care about their people—not just their productivity.

### Why MentalMadness?

**For Employees:**
- **Your privacy is sacred** - We protect your data like it's our own
- **2 minutes a day** - No lengthy surveys, no time-wasting
- **Real interventions** - Not generic advice, but personalized support
- **See your progress** - Track your journey from burnout to balance

**For Companies:**
- **Real-time insights** - Know when your team is struggling before it's too late
- **Crisis prevention** - Catch burnout before it becomes a crisis
- **Compliance-ready** - HIPAA compliant, audit-ready, enterprise-grade
- **ROI that matters** - Reduce turnover, improve productivity, save on healthcare costs

## Key Features

### For Employees
- **Daily Check-ins**: 2-minute stress pulse checks that actually matter
- **Smart Interventions**: AI-powered wellness recommendations tailored to your stress patterns
- **Personal Dashboard**: Track your mental health journey with privacy-first analytics
- **Proactive Alerts**: Get help when you need it, not when it's too late
- **100% Private**: Your data is encrypted, anonymized, and yours alone

### For Companies
- **Real-time Health Monitoring**: See company-wide stress levels without invading privacy
- **Crisis Detection**: Automated flagging for employees at risk
- **Department Analytics**: Identify burnout hotspots before they spread
- **Compliance Reports**: Generate wellness reports for stakeholders
- **Intervention Tracking**: Measure what actually works

## Project Structure
```
mindcheck/
├── backend/          # Node.js/Express API server
├── mobile/           # React Native mobile app (iOS first)
├── dashboard/        # React admin dashboard
├── docs/             # API and user documentation
├── scripts/          # Deployment and utility scripts
└── docker-compose.yml
```

## Tech Stack

Built with modern, battle-tested technologies:

- **Backend**: Node.js, Express, PostgreSQL, Redis
- **Mobile**: React Native, Expo
- **Dashboard**: React, Material-UI, Chart.js
- **Infrastructure**: Docker, Nginx
- **Security**: JWT, bcrypt, AES-256 encryption
  

### What's Working Now

- **Backend API**: Full REST API with authentication, check-ins, and admin endpoints
- **Mobile App**: iOS-ready React Native app with daily check-ins and interventions
- **Admin Dashboard**: Comprehensive analytics and employee management
- **Security**: HIPAA-compliant data storage, encryption, and audit logging
- **Crisis Detection**: Automated flagging and escalation system
- **Intervention Engine**: Smart recommendations based on stress levels

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose (optional, but recommended)

### Quick Start with Docker 

The fastest way to get MentalMadness running:

```bash
# Clone the repository
git clone https://github.com/hatish2001/MentalMadness.git
cd mindcheck

# Start all services
docker-compose up -d

# Services will be available at:
# - Backend API: http://localhost:3000
# - Admin Dashboard: http://localhost:3001
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

### Manual Installation

#### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration

# Create database and run migrations
psql -U postgres -c "CREATE DATABASE mindcheck;"
psql -U postgres -d mindcheck -f src/db/schema.sql

# Start the backend
npm run dev
```

#### 2. Mobile App Setup
```bash
cd mobile
npm install

# For iOS
npm run ios

# For Android
npm run android
```

#### 3. Admin Dashboard Setup
```bash
cd dashboard
npm install
npm start
```

## 📋 Environment Variables

Key environment variables (see `.env.example` files for full list):

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL connection
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis connection
- `JWT_SECRET` - Secret key for JWT tokens (generate secure random string)
- `ENCRYPTION_KEY` - 256-bit key for data encryption
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD` - SMTP configuration


## Mobile App Features

### 1. Quick Check-in (< 2 minutes)
Because your time is valuable:
- Stress level slider (1-10) - How are you really feeling?
- Stress trigger selection - What's actually causing this?
- Previous helper tracking - What worked before?

### 2. Smart Interventions
Not generic advice, but personalized support:
- Breathing exercises tailored to your stress level
- Meditation guides for your specific triggers
- Activity suggestions based on what's worked before
- Journaling prompts that actually help

### 3. Progress Tracking
See your journey:
- Stress trends over time
- Check-in streaks (gamification that matters)
- Intervention effectiveness (what actually helps you)

## Admin Dashboard Features

### 1. Real-time Monitoring
Know what's happening before it becomes a problem:
- Company health score (aggregate, anonymized)
- Department heat maps (identify burnout hotspots)
- Stress trend charts (spot patterns early)

### 2. Alert Management
Act before it's too late:
- Crisis detection (automated flagging)
- Automated escalation (get help to those who need it)
- Response tracking (ensure no one falls through cracks)

### 3. Reports & Analytics
Data that matters:
- Compliance reports (for stakeholders)
- Wellness summaries (for leadership)
- Intervention effectiveness (what's actually working)

## Testing

```bash
# Backend tests
cd backend
npm test

# Mobile tests
cd mobile
npm test

# Dashboard tests
cd dashboard
npm test
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions including:
- Docker deployment
- Cloud platform guides (AWS, GCP, Azure)
- SSL/TLS setup
- Database backup strategies
- Monitoring and scaling

## Contributing

We're building this to solve a real problem. If you've experienced corporate burnout, you know why this matters.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## Our Mission

MentalMadness was born from frustration—the frustration of watching brilliant people burn out, of seeing companies prioritize profits over people, of feeling like mental health is a luxury instead of a right.

We're not here to add another wellness app to the market. We're here to **change the conversation** about mental health in the workplace. We're here to give employees their power back and give companies the tools to actually care.

**Because burnout isn't a badge of honor. It's a cry for help.**

And we're listening.

---

*Built with empathy, designed for impact, engineered for privacy.*
