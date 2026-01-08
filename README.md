# 🚛 ChainFreight: Intelligent Logistics Aggregation Platform

![Status](https://img.shields.io/badge/Status-Hackathon_MVP-success)
![Domain](https://img.shields.io/badge/Domain-LogiTech-blue)
![Stack](https://img.shields.io/badge/Stack-MERN_%2B_Python_%2B_Supabase-orange)

> **Build2Break Hackathon Submission for LogiTech Domain**  
> An AI-powered platform connecting shippers with transporters through intelligent route chaining, load consolidation, and security-verified handoffs.

---

## 📖 Table of Contents
- [Problem Statement](#-problem-statement)
- [Solution Overview](#-solution-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Installation & Setup](#-installation--setup)
- [API Documentation](#-api-documentation)
- [Security & Design Decisions](#-security--design-decisions)
- [Future Roadmap](#-future-roadmap)

---

## 🚩 Problem Statement

Small and medium-scale businesses struggle to find cost-effective road transportation solutions. The logistics industry faces critical inefficiencies:

- **Fragmented Networks:** No unified platform for coordinating multi-leg journeys (e.g., Lorry → Hub → Mini Truck)
- **Empty Return Trips:** Vehicles run empty on return routes, wasting fuel and capacity
- **Trust Deficits:** Lack of standardized verification for cargo handoffs between different transporters
- **Opacity:** Shippers have limited visibility into their shipment's journey across multiple carriers

---

## 💡 Solution Overview

**ChainFreight** is a unified logistics aggregation platform that revolutionizes road transportation by:

1. **Intelligent Route Chaining:** Advanced algorithms stitch together multiple transporters to complete single shipment routes efficiently
2. **Trust Through Verification:** Mandatory photo-verified checkpoints at every handoff create a digital "Chain of Custody"
3. **Capacity Optimization:** AI matches shipments to trucks with available capacity and fills empty return trips
4. **Real-time Tracking:** End-to-end visibility for all stakeholders throughout the shipment lifecycle

---

## 🚀 Key Features

### 1. 🧠 Multi-Leg Route Optimization
ChainFreight uses **Google OR-Tools** to solve the Vehicle Routing Problem (VRP). The system intelligently splits long-distance shipments into optimal segments handled by different vehicles based on:
- Vehicle capacity and type
- Geographic coverage zones
- Cost efficiency
- Delivery time constraints

**Example:** *Coimbatore → Salem (32-ft Lorry)* → *Salem → Chennai (Mini Tempo)*

### 2. 📸 Security-Verified Handoffs
Our proprietary "Chain of Custody" protocol requires drivers to upload **geotagged photo proof** at every critical point:
- **Pickup Verification:** Photo + GPS at origin
- **Transporter Handoffs:** Both drivers verify cargo transfer
- **Security Checkpoints:** Random verification points
- **Final Delivery:** Proof of delivery with recipient confirmation

### 3. 📉 Dynamic Pricing & Load Consolidation
The platform automatically:
- Calculates costs based on vehicle fuel efficiency, distance, and urgency
- Identifies "Return Trip" opportunities to offer discounted rates
- Consolidates multiple small loads into shared capacity
- Reduces empty miles for transporters while lowering costs for shippers

### 4. 🎯 Marketplace for Transporters
Open marketplace where transporters can:
- Browse available route legs matching their vehicle type
- Accept jobs that fit their existing routes
- Build reputation through verified deliveries
- Maximize vehicle utilization

---

## 🏗 System Architecture

The project follows a **Microservice-style Monorepo** architecture orchestrated via Docker for seamless deployment.

```mermaid
graph TD
    User[Client - React] -->|HTTP/REST| Server[Node.js API Gateway]
    Server -->|Read/Write| DB[(Supabase PostgreSQL)]
    Server -->|Route Optimization Request| Opt[Python Optimizer Service]
    Opt -->|VRP Algorithm| ORTools[Google OR-Tools]
    Opt -->|Distance Calculation| GMap[Google Maps API]
    Server -->|Authentication| SupabaseAuth[Supabase Auth]
    Server -->|Image Storage| SupabaseBucket[Supabase Storage]
    Server -->|Real-time Updates| Realtime[Supabase Realtime]
```

### Project Structure

```
chainfreight/
├── client/                 # Frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── store/         # Zustand state management
│   │   └── utils/         # Helper functions
│   └── package.json
├── server/                 # Backend API
│   ├── routes/            # API endpoints
│   ├── controllers/       # Business logic
│   ├── middleware/        # Auth & validation
│   └── package.json
├── optimizer/             # AI optimization service
│   ├── vrp_solver.py     # OR-Tools VRP implementation
│   ├── app.py            # Flask API
│   └── requirements.txt
├── docker-compose.yml     # Container orchestration
└── README.md
```

---

## 🛠 Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | React 18, Vite, Tailwind CSS | Fast, responsive dashboard for all user roles |
| **State Management** | Zustand | Lightweight state management |
| **Backend** | Node.js 20, Express | RESTful API handling business logic |
| **AI Engine** | Python 3.11, Flask, Google OR-Tools | VRP solver for multi-leg route optimization |
| **Database** | Supabase (PostgreSQL 15) | Relational data with Row Level Security |
| **Authentication** | Supabase Auth + JWT | Secure role-based access control |
| **Storage** | Supabase Storage | Encrypted hosting for checkpoint images |
| **Maps** | Google Maps API | Geocoding, Distance Matrix, Directions |
| **Containerization** | Docker, Docker Compose | Consistent deployment environment |

---

## ⚡ Installation & Setup

### Prerequisites

- **Docker** (v24.0+) & **Docker Compose** (v2.20+)
- **Node.js** (v20+) *(optional, for local development)*
- **Python** (v3.11+) *(optional, for local development)*
- **Supabase Account** (free tier works)
- **Google Maps API Key** with Distance Matrix API enabled

---

### 🚀 Quick Start (Docker - Recommended)

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/chainfreight.git
cd chainfreight
```

#### 2. Configure Environment Variables

Create `.env` file in the `server/` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Security
JWT_SECRET=your_jwt_secret_here
HANDOFF_SECRET_KEY=hackathon_secret_123

# Optimizer Service
OPTIMIZER_URL=http://optimizer:5001
```

Create `.env` file in the `client/` directory:

```env
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Create `.env` file in the `optimizer/` directory:

```env
FLASK_ENV=production
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

#### 3. Build and Run with Docker

```bash
# Build and start all services
docker-compose up --build

# Run in detached mode (background)
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

#### 4. Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Optimizer Service:** http://localhost:5001
- **API Health Check:** http://localhost:5000/health

---

### 💻 Local Development Setup (Without Docker)

#### Backend Setup

```bash
cd server
npm install
npm run dev
```

#### Frontend Setup

```bash
cd client
npm install
npm run dev
```

#### Optimizer Setup

```bash
cd optimizer
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

---

### 🗄️ Database Setup

Run the following SQL in your Supabase SQL Editor:

```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('shipper', 'transporter')),
  company_name TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create shipments table
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipper_id UUID REFERENCES users(id),
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  cargo_weight DECIMAL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create route_legs table
CREATE TABLE route_legs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID REFERENCES shipments(id),
  transporter_id UUID REFERENCES users(id),
  start_location TEXT NOT NULL,
  end_location TEXT NOT NULL,
  distance_km DECIMAL,
  price DECIMAL,
  status TEXT DEFAULT 'available',
  sequence_number INT
);

-- Create checkpoints table
CREATE TABLE checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_leg_id UUID REFERENCES route_legs(id),
  type TEXT NOT NULL,
  image_url TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  verified_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
```

---

## 📡 API Documentation

### 🔐 Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register new user (shipper/transporter) | No |
| `POST` | `/api/auth/login` | Login and receive JWT token | No |
| `GET` | `/api/auth/me` | Get current user profile | Yes |
| `PUT` | `/api/auth/profile` | Update user profile | Yes |

### 🚚 Shipment Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/shipments` | Create new shipment request | Shipper |
| `GET` | `/api/shipments` | List all user's shipments | Yes |
| `GET` | `/api/shipments/:id` | Get shipment details with route legs | Yes |
| `PUT` | `/api/shipments/:id` | Update shipment status | Shipper |
| `DELETE` | `/api/shipments/:id` | Cancel shipment | Shipper |

### 🤖 AI Optimization

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/optimize/chain` | **Trigger multi-leg route optimization** | Shipper |
| `POST` | `/api/optimize/consolidate` | Find load consolidation opportunities | System |

### 🗺️ Route Legs & Marketplace

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/route-legs/available` | Browse available legs (marketplace) | Transporter |
| `POST` | `/api/route-legs/:id/accept` | Accept a route leg | Transporter |
| `GET` | `/api/route-legs/:id/tracking` | Real-time tracking for leg | Yes |

### 📸 Checkpoint Verification

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/checkpoints/pickup` | Upload pickup verification | Transporter |
| `POST` | `/api/checkpoints/handoff` | **Upload handoff verification (requires secret)** | Transporter |
| `POST` | `/api/checkpoints/delivery` | Upload delivery proof | Transporter |
| `POST` | `/api/checkpoints/security` | Random security checkpoint | Transporter |

### Example Request: Create Shipment with Optimization

```bash
curl -X POST http://localhost:5000/api/shipments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "Coimbatore, Tamil Nadu",
    "destination": "Chennai, Tamil Nadu",
    "cargo_weight": 5000,
    "cargo_type": "electronics",
    "urgency": "medium",
    "optimize": true
  }'
```

---

## 🛡️ Security & Design Decisions

### Row Level Security (RLS)

Supabase RLS policies enforce strict data access control:

- **Shippers** can only view/edit their own shipments
- **Transporters** can only update checkpoints for assigned route legs
- **Public Read** enabled for tracking URLs (with token)
- **Write Operations** require authentication and role verification

### The "Handoff Secret" Protocol

Critical cargo transfers require an additional security layer:

```javascript
// Handoff endpoint requires custom header
headers: {
  'Authorization': 'Bearer JWT_TOKEN',
  'x-handoff-secret': 'hackathon_secret_123'
}
```

This simulates a hardware key or QR code scan that both drivers must present during physical cargo transfer.

### Image Verification

All checkpoint photos are:
- Stored in encrypted Supabase buckets
- Geotagged with GPS coordinates
- Timestamped with server-side verification
- Linked to specific route legs for audit trails

---

## 🎯 Future Roadmap

- [ ] **Blockchain Integration:** Immutable audit trail for high-value cargo
- [ ] **ML Price Prediction:** Dynamic pricing based on market conditions
- [ ] **Mobile Apps:** Native iOS/Android apps for drivers
- [ ] **IoT Integration:** Real-time temperature/humidity monitoring
- [ ] **Carbon Tracking:** Calculate and offset CO2 emissions per shipment
- [ ] **Insurance API:** Automated cargo insurance quotes and claims

---

## 🤝 Contributing

This is a hackathon project, but we welcome feedback and suggestions! Please open an issue or reach out to the team.

---

## 📄 License

MIT License - See LICENSE file for details

---

<div align="center">

**Built with ❤️ for Build2Break Hackathon 2026**

[Live Demo](#) • [Video Walkthrough](#) • [Presentation Slides](#)

</div>

---

This README provides comprehensive documentation that judges will appreciate, with clear setup instructions, architecture diagrams, and detailed API documentation. The setup commands are preserved and enhanced with additional context for both Docker and local development workflows.
