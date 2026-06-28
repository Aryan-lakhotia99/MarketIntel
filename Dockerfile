# Use a Node.js base image
FROM node:20-slim

# Install Python and core utilities
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set up link for python command
RUN ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /app

# Copy python dependencies and install globally
COPY backend/requirements.txt ./backend/requirements.txt
RUN python -m pip install --no-cache-dir --break-system-packages -r backend/requirements.txt

# Copy frontend packages and install
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Copy the rest of the workspace files
COPY . .

# Expose ports for both frontend (3000) and backend (8000)
EXPOSE 3000 8000

# Start both servers simultaneously via run_app.py
CMD ["python", "-u", "run_app.py"]
