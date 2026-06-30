# Online Queue System

A fully loaded, real-time queue management application built to optimize scheduling and user flow.

## Live Demo
Check out the live application: [Render Deployment / Supabase Link]

## 📱 Android Prototype
Click below to directly download and install the Android APK:
[![Download APK](https://img.shields.io/badge/Download_APK-100000?style=for-the-badge&logo=android&logoColor=white&labelColor=303030&color=3DDC84)](https://github.com/prakharsri1211-sys/healthtech-queue-prototype/releases/download/v1.0.0/HealthTech.Queue.apk)

## Tech Stack
- **Backend**: Java, Spring Boot, REST APIs
- **Frontend**: React.js
- **Database**: MongoDB Cluster (Patient Records), Supabase (Users, Appointments, Queues)
- **DevOps**: Docker, Render, Linux

## Architecture & Features
- **Real-Time Synchronization**: Instant queue updates powered by WebSockets.
- **Database Clustering**: Segregated and clustered databases utilizing MongoDB for clinical records and PostgreSQL (Supabase) for structured scheduling data.
- **Operational Guardrails**: Hardcoded fail-safes including 10-minute queue offsets and strict date-locking for schedule integrity.

## Local Setup & Deployment
To run this application locally using Docker:

1. Clone the repository and navigate to the root directory.
2. Ensure Docker Desktop (or your Docker daemon) is running.
3. Build and spin up the backend API, frontend, and database containers seamlessly:
```bash
docker-compose up --build
```
4. Access the frontend at `http://localhost:5173` and the backend at `http://localhost:8080`.
