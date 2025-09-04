# Instant Quote

This project is a web application designed to provide instant quotes for 3D printing services. It allows users to upload 3D model files (STL, OBJ, STEP, IGES, 3MF), view them, and get an estimated quote based on material and process selections.

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
uvicorn main:app --reload
```

The backend server will typically run on `http://127.0.0.1:8000`.

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