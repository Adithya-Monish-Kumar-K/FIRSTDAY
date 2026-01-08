# LogiFlow - Logistics & Transportation Management Platform

A comprehensive full-stack logistics application for managing freight transportation, route optimization, and cargo-vehicle matching.

## 🚀 Features

### For Shippers
- **Create Shipments**: Multi-step wizard to create shipment requests with route visualization
- **Track Shipments**: Real-time tracking with checkpoint updates
- **Price Calculator**: Estimate shipping costs based on distance, weight, and cargo type
- **Analytics Dashboard**: View shipment statistics and performance metrics

### For Transporters
- **Available Loads**: Browse and accept shipments matching your vehicle capacity
- **Vehicle Management**: Manage your fleet with capacity tracking
- **Route Planner**: Plan and optimize delivery routes with Google Maps integration
- **Return Trip Matching**: Reduce empty miles by finding loads for return trips
- **Earnings Tracking**: Monitor your earnings and completed deliveries

### Core Features
- 🗺️ **Google Maps Integration**: Route visualization, geocoding, and ETA calculation
- 🚛 **Cargo-Vehicle Matching**: Smart matching based on vehicle type and capacity
- ⚡ **Route Optimization**: Google OR-Tools VRP solver for optimal delivery order
- 📍 **Real-time Checkpoints**: Track shipment progress with photo verification
- 💰 **Dynamic Pricing**: Fuel cost and shipping price calculations
- ⭐ **Rating System**: Build trust with user reviews and ratings
- 📧 **Email Notifications**: Automated notifications for shipment updates

## 🛠️ Technology Stack

### Frontend
- **React 19** with Vite
- **React Router** for navigation
- **Zustand** for state management
- **Axios** for API calls
- **Lucide React** for icons
- **Google Maps API** for route visualization

### Backend
- **Node.js** with Express
- **Supabase** for database and authentication
- **JWT** for token-based authentication
- **Nodemailer** for email notifications
- **Multer** for file uploads

### Route Optimization
- **Python** with Google OR-Tools
- Vehicle Routing Problem (VRP) solver
- Greedy fallback algorithm

## 📦 Project Structure

```
FIRSTDAY/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   │   ├── Layout.jsx  # Main app layout
│   │   │   └── RouteMap.jsx # Google Maps component
│   │   ├── pages/          # Page components
│   │   │   ├── Landing.jsx
│   │   │   ├── Auth.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CreateShipment.jsx
│   │   │   ├── AvailableShipments.jsx
│   │   │   ├── MyShipments.jsx
│   │   │   ├── ShipmentDetail.jsx
│   │   │   ├── Vehicles.jsx
│   │   │   ├── RoutePlanner.jsx
│   │   │   ├── Tracking.jsx
│   │   │   └── Pricing.jsx
│   │   ├── api.js          # API client
│   │   ├── store.js        # Zustand stores
│   │   ├── App.jsx         # Root component with routes
│   │   └── index.css       # Global styles
│   ├── .env                # Environment variables
│   └── package.json
│
├── server/                 # Node.js backend
│   ├── config/
│   │   ├── database.js     # Supabase client
│   │   └── email.js        # Nodemailer setup
│   ├── middleware/
│   │   └── auth.js         # JWT authentication
│   ├── routes/
│   │   ├── auth.js         # Authentication routes
│   │   ├── vehicles.js     # Vehicle management
│   │   ├── shipments.js    # Shipment CRUD
│   │   ├── checkpoints.js  # Checkpoint tracking
│   │   ├── routes.js       # Google Maps integration
│   │   ├── pricing.js      # Price calculations
│   │   ├── ratings.js      # Rating system
│   │   ├── returnTrips.js  # Return trip matching
│   │   └── optimize.js     # Route optimization
│   ├── index.js            # Express server
│   ├── .env                # Environment variables
│   └── package.json
│
└── optimization/           # Python VRP solver
    ├── vrp_solver.py       # OR-Tools implementation
    └── requirements.txt
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Python 3.8+ (for route optimization)
- Google Maps API key
- Supabase account (optional, mock mode available)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd FIRSTDAY
```

2. **Install backend dependencies**
```bash
cd server
npm install
```

3. **Configure backend environment**
Create/update `server/.env`:
```env
# Database (comment out for mock mode)
# SUPABASE_URL=your-supabase-url
# SUPABASE_KEY=your-supabase-key

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-at-least-32-characters
JWT_EXPIRY_DAYS=7

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Google Maps
GOOGLE_MAP_API=your-google-maps-api-key
```

4. **Install frontend dependencies**
```bash
cd ../client
npm install
```

5. **Configure frontend environment**
Create/update `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

6. **Start the servers**

Terminal 1 - Backend:
```bash
cd server
npm run dev
```

Terminal 2 - Frontend:
```bash
cd client
npm run dev
```

7. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

## 🔐 Demo Credentials

The app includes demo users in mock mode:

| Role | Email | Password |
|------|-------|----------|
| Transporter | transporter@test.com | password123 |
| Shipper | shipper@test.com | password123 |

## 📊 Database Schema

When using Supabase, create these tables:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('transporter', 'shipper')) NOT NULL,
  phone TEXT,
  address TEXT,
  rating DECIMAL(2,1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Vehicles table
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id),
  vehicle_number TEXT NOT NULL,
  type TEXT NOT NULL,
  capacity_tons DECIMAL(10,2) NOT NULL,
  capacity_volume DECIMAL(10,2),
  current_load DECIMAL(10,2) DEFAULT 0,
  current_location JSONB,
  status TEXT DEFAULT 'available',
  features TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Shipments table
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipper_id UUID REFERENCES users(id),
  transporter_id UUID REFERENCES users(id),
  vehicle_id UUID REFERENCES vehicles(id),
  origin JSONB NOT NULL,
  destination JSONB NOT NULL,
  cargo_type TEXT NOT NULL,
  weight DECIMAL(10,2) NOT NULL,
  volume DECIMAL(10,2),
  vehicle_type_required TEXT,
  pickup_date TIMESTAMP,
  delivery_date TIMESTAMP,
  price DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  description TEXT,
  distance_km DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Checkpoints table
CREATE TABLE checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES shipments(id),
  transporter_id UUID REFERENCES users(id),
  location TEXT NOT NULL,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  status TEXT,
  notes TEXT,
  image_url TEXT,
  is_handoff BOOLEAN DEFAULT false,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Ratings table
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES shipments(id),
  rater_id UUID REFERENCES users(id),
  rated_user_id UUID REFERENCES users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Vehicles
- `GET /api/vehicles` - Get user vehicles
- `GET /api/vehicles/available` - Get available vehicles
- `POST /api/vehicles` - Add vehicle
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle

### Shipments
- `GET /api/shipments` - Get shipments
- `GET /api/shipments/available` - Get available shipments
- `POST /api/shipments` - Create shipment
- `POST /api/shipments/:id/accept` - Accept shipment
- `PUT /api/shipments/:id/status` - Update status

### Routes & Pricing
- `POST /api/routes/directions` - Get directions
- `POST /api/routes/eta` - Calculate ETA
- `GET /api/routes/geocode` - Geocode address
- `POST /api/pricing/calculate` - Calculate fuel cost
- `POST /api/pricing/shipping-price` - Get price suggestion

### Optimization
- `POST /api/optimize/vrp` - Solve VRP problem
- `POST /api/optimize/optimize-order` - Optimize delivery order

## 🎨 Design System

The app uses a modern dark theme with:
- **Primary Color**: Indigo (#6366f1)
- **Accent Color**: Fuchsia (#d946ef)
- **Typography**: Inter font family
- **Glass effects** and subtle gradients
- **Smooth animations** and micro-interactions

## 📱 Responsive Design

The application is fully responsive with:
- Mobile-first approach
- Collapsible sidebar navigation
- Adaptive grid layouts
- Touch-friendly interactions

## 🔮 Future Improvements

- [ ] Real-time tracking with WebSocket
- [ ] Push notifications
- [ ] Document verification
- [ ] Payment integration
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support

## 📄 License

MIT License - feel free to use this project for learning and development.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
