# Instant Quote

This project is a web application designed to provide instant quotes for 3D printing services. It allows users to upload 3D model files (STL, OBJ, STEP, IGES, 3MF), view them, and get an estimated quote based on material and process selections.

## Features

- **File Upload**: Support for multiple 3D file formats (STL, OBJ, STEP, etc.)
- **Persistent Storage**: Configurable local or cloud (S3) file storage with automatic cleanup
- **Geometry Analysis**: Automatic calculation of volume, surface area, and dimensions
- **Multiple File Support**: Upload and analyze multiple files simultaneously
- **Instant Quotes**: Real-time pricing based on material, process, and quantity
- **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS
- **Fast Processing**: Efficient geometry parsing and analysis
- **Auto-Cleanup**: Automatic deletion of old files to manage storage space
- **Duplicate Detection**: Session-based duplicate file detection to prevent re-uploading the same files

## Project Structure

The project is divided into two main parts:

- **Frontend**: Built with Next.js and React, responsible for the user interface and interaction.
- **Backend**: Built with Python (FastAPI), responsible for handling file uploads, 3D model analysis, and quote generation.

## Setup Instructions

### Prerequisites

- Node.js (LTS version recommended)
- Python 3.8+
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/instant-quote.git
cd instant-quote
```

### 2. Backend Setup

Navigate to the `backend` directory, create a virtual environment, install dependencies, and run the server.

```bash
cd backend
python -m venv venv
./venv/Scripts/activate  # On Windows
source venv/bin/activate # On macOS/Linux
pip install -r requirements.txt
```

#### Configure Storage

Choose your storage configuration:

```bash
# For local development (default)
python setup_env.py local

# For production with S3 storage
python setup_env.py production
```

#### Start the Server

```bash
uvicorn main:app --reload
```

The backend server will typically run on `http://127.0.0.1:8000`.

## Storage Configuration

The application supports both local and cloud storage for uploaded files:

### Local Storage (Development)
- Files stored in local `uploads/` directory
- Automatic cleanup after 24 hours (configurable)
- Best for development and testing

### S3 Storage (Production)
- Files stored in AWS S3 bucket
- Automatic cleanup with configurable retention
- Scalable for production deployments
- Requires AWS credentials

### Configuration Files
- `.env.local` - Local development settings
- `.env.production` - Production settings with S3
- Use `python setup_env.py <environment>` to switch

For detailed storage setup instructions, see `backend/STORAGE_SETUP.md`

## Duplicate Detection

The system includes advanced session-based duplicate file detection:

- **Session Tracking**: Upload files with a `session_id` parameter to track duplicates within the same session (e.g., cart)
- **Hash-Based Detection**: Uses SHA256 file hashing to detect identical files regardless of filename
- **Same-Name Different-Content Handling**: Detects when files have the same name but different content, allowing users to choose which version to keep
- **Cross-Session Support**: Files with the same name can be uploaded in different sessions without conflict
- **Smart Error Messages**: Provides clear feedback for duplicate hash detection vs. same-name different-content scenarios
- **API Endpoints**: 
  - `POST /upload?session_id=your-session` - Upload with duplicate detection
  - `GET /session/{session_id}/info` - Get session file count
  - `POST /session/clear?session_id=your-session` - Clear session data

For detailed documentation, see `backend/DUPLICATE_DETECTION.md`.

### 3. Frontend Setup

Open a new terminal, navigate to the `frontend` directory, install dependencies, and start the development server.

```bash
cd ../frontend
npm install
npm run dev
```

The frontend development server will typically run on `http://localhost:3000`.

## Usage

1. Ensure both the backend and frontend servers are running.
2. Open your web browser and navigate to `http://localhost:3000`.
3. Upload your 3D model files using the provided interface.
4. Select your desired process and material to get an instant quote.

## Deployment

- **Frontend**: Can be deployed on platforms like Netlify or Vercel.
- **Backend**: Can be deployed on cloud providers such as DigitalOcean (e.g., using DigitalOcean App Platform or Droplets).

Refer to the respective platform documentation for detailed deployment instructions.

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.