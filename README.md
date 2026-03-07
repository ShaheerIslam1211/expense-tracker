# Expense Tracker with PaddleOCR

A modern expense tracking app with AI-powered receipt scanning using PaddleOCR for superior text recognition accuracy.

## Features

- 📱 Modern React + TypeScript frontend
- 🤖 AI-powered receipt scanning with PaddleOCR
- 💰 Expense categorization and tracking
- 📊 Analytics and insights
- ☁️ Firebase backend for data storage
- 🚀 Deployed on Vercel

## Architecture

This project consists of two parts:

1. **Frontend** (React + Vite) - The main expense tracker app
2. **Backend** (FastAPI + PaddleOCR) - OCR processing API

## Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- Vercel CLI (optional, for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd expense-tracker
   ```

2. **Setup Frontend**
   ```bash
   # Install dependencies
   npm install

   # Copy environment file
   cp .env.example .env.local

   # Start development server
   npm run dev
   ```

3. **Setup Backend**
   ```bash
   cd backend

   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

   # Install dependencies (may take 10-15 minutes first time due to ML models)
   pip install -r requirements.txt

   # Start the API server
   python dev.py
   ```

4. **Configure Firebase**
   - Create a Firebase project
   - Enable Firestore and Authentication
   - Add your Firebase config to the environment variables

## Deployment

### Backend (OCR API)

1. **Deploy to Vercel**
   ```bash
   cd backend
   vercel --prod
   ```

2. **Get the deployment URL**
   - Copy the URL from Vercel dashboard
   - Update `VITE_OCR_API_URL` in your frontend environment

### Frontend (React App)

1. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

2. **Set Environment Variables**
   In Vercel dashboard, add:
   - `VITE_OCR_API_URL`: Your backend API URL

## API Endpoints

### OCR Processing
- `POST /api/ocr` - Process receipt image and extract data

**Request**: Multipart form with `file` field containing image
**Response**: Structured receipt data with items, totals, merchant, etc.

## OCR Features

- **EasyOCR Integration**: Modern OCR engine with excellent accuracy for receipts
- **Image Preprocessing**: Automatic image enhancement for better text extraction
- **Smart Parsing**: Extracts items, totals, dates, merchant names, and references
- **Fallback Handling**: Graceful degradation if OCR fails
- **Cross-Platform**: Works consistently across different operating systems

## Development

### Adding New Features

1. Frontend changes go in `src/`
2. Backend changes go in `backend/`
3. Update dependencies in respective `package.json` or `requirements.txt`

### Testing OCR

Upload receipt images through the app interface or test the API directly:

```bash
curl -X POST -F "file=@receipt.jpg" http://localhost:8000/api/ocr
```

## Troubleshooting

### Common Issues

1. **OCR API not responding**
   - Check if backend is running
   - Verify `VITE_OCR_API_URL` is correct
   - Check CORS settings in backend

2. **Poor OCR accuracy**
   - Ensure images are well-lit and clear
   - Try different angles or preprocessing
   - Check image format (JPG/PNG preferred)

3. **Deployment issues**
   - Verify all environment variables are set
   - Check Vercel function logs
   - Ensure proper Python version (3.11)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License