# CreatorCrafter Web Application

This is the web version of CreatorCrafter, an AI-powered video content creation platform.

## Architecture

- **Frontend**: React with TypeScript, Vite
- **Backend**: Python FastAPI
- **Database**: PostgreSQL
- **AI**: Whisper (transcription), BLIP (vision), AudioCraft (SFX)
- **Background Tasks**: FastAPI BackgroundTasks (Celery-ready)

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Manual Setup

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Install AudioCraft
pip install 'audiocraft @ git+https://github.com/facebookresearch/audiocraft.git'

# Set up environment
cp .env.example .env
# Edit .env with your settings

# Create database
createdb creatorcrafter

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Project Structure

```
CreatorCrafter/
├── frontend/           # React web application
│   ├── src/
│   │   ├── api/        # API client
│   │   ├── components/ # React components
│   │   ├── context/    # State management
│   │   ├── hooks/      # Custom hooks
│   │   └── pages/      # Route pages
│   └── ...
├── backend/            # FastAPI backend
│   ├── app/
│   │   ├── api/        # API routes
│   │   ├── models/     # Database models
│   │   ├── schemas/    # Pydantic schemas
│   │   ├── services/   # Business logic
│   │   ├── tasks/      # Background tasks
│   │   └── ai/         # AI modules
│   └── ...
└── docker-compose.yml
```

## Features

- User authentication (JWT)
- Project management
- Video upload and streaming
- AI video analysis (transcription + scene detection)
- AI sound effect generation
- Subtitle editing
- Text overlay editing
- Timeline editor

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Environment Variables

### Backend (.env)
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT secret key
- `STORAGE_PATH`: File storage directory
- `CELERY_BROKER_URL`: Redis URL for Celery (optional)

### Frontend (.env)
- `VITE_API_URL`: Backend API URL
- `VITE_WS_URL`: WebSocket URL

## Development

### Backend Development
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Database Migrations
```bash
cd backend
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## Production Deployment

For production:
1. Use a proper PostgreSQL instance
2. Set secure `SECRET_KEY`
3. Configure CORS properly
4. Use Redis for Celery (for heavy AI workloads)
5. Consider GPU instances for AI processing
6. Use S3 or similar for file storage
