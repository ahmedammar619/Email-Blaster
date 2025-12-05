# Email Blaster

A full-featured email blasting service built for supply chain companies. Manage contacts, create email templates, and send bulk email campaigns with ease.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Fastify (Node.js)
- **Database**: PostgreSQL (external)
- **Containerization**: Docker

## Features

- Dashboard with email statistics
- Contact management with CSV import
- Email template builder with variable support
- Campaign creation and bulk sending
- Email logs and delivery tracking
- SMTP configuration and testing

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database (external - e.g., Railway, Supabase, or self-hosted)
- SMTP server credentials (e.g., Gmail, SendGrid, Mailgun)

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/Email-Blaster.git
cd Email-Blaster
```

### 2. Configure environment variables

Copy the example environment file and update with your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/email_blaster

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
SMTP_FROM=Your Name <your-email@gmail.com>

# Application Configuration
NODE_ENV=development
```

### 3. Start with Docker

Build and run the containers:

```bash
docker-compose up --build
```

This will start:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

### 4. Run database migrations

In a new terminal, run the migrations to set up the database schema:

```bash
docker-compose exec backend npm run migrate
```

## Usage

### Accessing the Application

Open your browser and navigate to `http://localhost:5173`

### Managing Contacts

1. Go to **Contacts** page
2. Add contacts manually or import from CSV
3. CSV format: `email,first_name,last_name,company`

### Creating Email Templates

1. Go to **Templates** page
2. Click **New Template**
3. Use variables for personalization:
   - `{{firstName}}` - Contact's first name
   - `{{lastName}}` - Contact's last name
   - `{{email}}` - Contact's email
   - `{{company}}` - Contact's company

### Sending Campaigns

1. Go to **Campaigns** page
2. Click **New Campaign**
3. Select a template and recipients
4. Click **Send Campaign** to start sending

### Monitoring

- **Dashboard**: Overview of all statistics
- **Email Logs**: Detailed delivery status for each email

## Docker Commands

```bash
# Start containers
docker-compose up

# Start in background
docker-compose up -d

# Rebuild containers
docker-compose up --build

# Stop containers
docker-compose down

# View logs
docker-compose logs -f

# Run migrations
docker-compose exec backend npm run migrate
```

## Project Structure

```
Email-Blaster/
├── backend/
│   ├── src/
│   │   ├── db/           # Database connection and migrations
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── server.js     # Fastify server entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API client
│   │   └── App.jsx       # Main app component
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

## API Endpoints

### Health
- `GET /api/health` - Health check

### Campaigns
- `GET /api/campaigns` - List all campaigns
- `GET /api/campaigns/:id` - Get campaign details
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `POST /api/campaigns/:id/send` - Send campaign
- `GET /api/campaigns/:id/stats` - Get campaign statistics

### Contacts
- `GET /api/contacts` - List contacts
- `GET /api/contacts/:id` - Get contact
- `POST /api/contacts` - Create contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `POST /api/contacts/import` - Import from CSV

### Templates
- `GET /api/templates` - List templates
- `GET /api/templates/:id` - Get template
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `POST /api/templates/:id/duplicate` - Duplicate template

### Emails
- `GET /api/emails/logs` - Get email logs
- `GET /api/emails/stats` - Get email statistics
- `POST /api/emails/test` - Send test email
- `GET /api/emails/verify-smtp` - Verify SMTP connection

## Gmail SMTP Setup

To use Gmail as your SMTP server:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account > Security > 2-Step Verification > App passwords
   - Create a new app password for "Mail"
3. Use the generated password as `SMTP_PASS` in your `.env` file

## License

MIT License - See [LICENSE](LICENSE) for details.
