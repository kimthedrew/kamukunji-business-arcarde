# Kamukunji Business Arcade (KBA)

A digital marketplace platform for Kamukunji Business Arcade, connecting customers with local shoe vendors.

## Features

- **Shop Management**: Shop owners can register, manage products, and track orders
- **Product Search**: Customers can search and filter products by category, price, and size
- **Order System**: Customers can place orders directly with shop owners
- **Admin Dashboard**: Administrators can manage shops, view analytics, and control shop status
- **Push Notifications**: Real-time notifications for new orders
- **Image Management**: Cloudinary integration for product image storage
- **Database**: Supabase PostgreSQL for data storage

## Tech Stack

- **Frontend**: React, TypeScript, CSS3
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Image Storage**: Cloudinary
- **Authentication**: JWT tokens
- **Deployment**: Docker, Koyeb

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `JWT_SECRET`: Secret key for JWT tokens
- `SUPABASE_PROJECT_URL`: Your Supabase project URL
- `SUPABASE_API_KEY`: Your Supabase API key
- `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Your Cloudinary API key
- `CLOUDINARY_API_SECRET`: Your Cloudinary API secret
- `VAPID_PUBLIC_KEY`: VAPID public key for push notifications
- `VAPID_PRIVATE_KEY`: VAPID private key for push notifications
- `VAPID_SUBJECT`: Email subject for VAPID keys

## Local Development

1. Install dependencies:
```bash
npm run install-all
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your actual values
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000` (frontend) and `http://localhost:8000` (backend).

## Production Build

1. Build the React app:
```bash
npm run build
```

2. Start the production server:
```bash
npm run start:prod
```

## Docker Deployment

1. Build the Docker image:
```bash
docker build -t kba-app .
```

2. Run with Docker Compose:
```bash
docker-compose up -d
```

## Koyeb Deployment

1. Push your code to GitHub
2. Connect your GitHub repository to Koyeb
3. Deploy using the `koyeb.yaml` configuration
4. Set your environment variables in the Koyeb dashboard

## Database Setup

The application uses Supabase as the primary database. You have two options:

### Option 1: Use Supabase (Recommended)
1. Create a Supabase project at https://supabase.com
2. Run the SQL schema from `server/supabase-schema.sql` in your Supabase SQL editor
3. Update your environment variables with Supabase credentials

### Option 2: Use SQLite (Fallback)
1. The application will automatically create a SQLite database if Supabase is not configured
2. Database file will be created at `server/database.sqlite`

## API Endpoints

### Public Endpoints
- `GET /api/products/search` - Search products
- `POST /api/orders` - Create order
- `GET /api/shops` - Get active shops

### Shop Endpoints (Authentication required)
- `POST /api/shops/login` - Shop login
- `GET /api/shops/profile` - Get shop profile
- `GET /api/orders/my-orders` - Get shop orders
- `GET /api/products/my-products` - Get shop products
- `POST /api/products` - Add product

### Admin Endpoints (Authentication required)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/shops` - Get all shops
- `PUT /api/admin/shops/:id/status` - Update shop status

## License

MIT License