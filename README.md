# MarketIntel — Financial News & Market Intelligence Dashboard

MarketIntel is a real-time financial market analytics dashboard that tracks market indices, institutional capital flows, large whale transactions, stock delivery spikes, and daily price breakouts. It is built as a split-architecture application with a Python FastAPI backend and a Next.js (React) frontend.

---

## 🎯 Project Objectives
*   **Institutional Data Tracking**: Retrieve and process FII/DII flow statistics and flag high-value block/bulk deals, automatically predicting parent entities and identifying potential shell entities.
*   **Automated Market Scan**: Periodically analyze market symbols for technical breakout alerts (such as 52-week highs/lows and volume multipliers) on a continuous loop.
*   **Intelligent News Categorization**: Aggregate live news feeds via Google RSS and classify them into *Market Catalysts* (bullish signals) or *Market Risks* (bearish signals) using key sentiment criteria.
*   **Institutional Momentum (IMI) & Derivatives Indexing**: Rank equities based on a composite Institutional Momentum Index and track Derivatives condition overlays (like Put-Call Ratio indicators).

---

## 🏗️ Architecture

```
├── backend/                  # FastAPI Web API
│   ├── app/
│   │   ├── api/v1/endpoints/ # REST Routers (news, analytics, stocks)
│   │   ├── core/             # Settings configuration & Database connectors
│   │   └── services/         # Scrapers, predictors, and yfinance integrations
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # Next.js Application
│   ├── src/
│   │   ├── app/              # Dashboard pages and layout routes
│   │   ├── components/       # UI dashboard elements (sparklines, heatmaps)
│   │   └── lib/              # API connections and helper models
│   └── package.json          # Node dependencies
│
├── run_app.py                # Unified local server runner
└── docker-compose.yml        # Multi-container local execution setup
```

---

## ⚙️ Prerequisites
Before running the project locally, ensure you have installed:
1.  **Python** (v3.11 or higher)
2.  **Node.js** (v20 or higher) & **npm**
3.  **Git**
4.  *(Optional)* **Docker & Docker-Compose** (if running via container)

---

## 🚀 Local Installation & Setup

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd news-tracker
```

### 2. Configure Environment Files
*   **Backend**: Copy the environment template inside `/backend` and create a [backend/.env](file:///c:/Users/Aryan/Desktop/news%20tracker/backend/.env) file:
    ```env
    # Optional: Configure database connection string to point to your cloud PostgreSQL instance.
    # If left blank, the application automatically defaults to a local SQLite database (data/users.db).
    DATABASE_URL=
    ```
*   **Frontend**: Ensure [frontend/.env.local](file:///c:/Users/Aryan/Desktop/news%20tracker/frontend/.env.local) has the correct local endpoints configured:
    ```env
    NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    ```

---

## 🏃 Running the Project Locally

You can run the project in three different ways:

### Method A: Unified Runner Script (Easiest)
From the project root directory, run the Python runner helper [run_app.py](file:///c:/Users/Aryan/Desktop/news%20tracker/run_app.py):
```bash
python run_app.py
```
*This script automatically creates a Python virtual environment (`.venv`), installs all backend dependencies, downloads frontend packages, and launches both local servers simultaneously.*

---

### Method B: Manual Split Launch (For Developers)

#### 1. Start the FastAPI Backend
```bash
cd backend
# Create and activate python virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Start the uvicorn API server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
*The backend API is now running on [http://127.0.0.1:8000](http://127.0.0.1:8000)*

#### 2. Start the Next.js Frontend
Open a new terminal window:
```bash
cd frontend
# Install npm packages
npm install

# Start Next.js development server
npm run dev
```
*The user dashboard is now running on [http://localhost:3000](http://localhost:3000)*

---

### Method C: Run via Docker Compose (Isolated Container)
Ensure you have Docker Desktop installed, then build and run the services from the project root:
```bash
# Build and run containers in background
docker-compose up --build -d

# View log outputs
docker-compose logs -f
```
*   Frontend: [http://localhost:3000](http://localhost:3000)
*   Backend: [http://localhost:8000](http://localhost:8000)
