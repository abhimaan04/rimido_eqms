#!/bin/bash

# Remidio eQMS Setup Script

echo "🚀 Remidio eQMS Setup"
echo "===================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed. Please install PostgreSQL 14+ first."
    echo "   Database setup will be skipped."
    SKIP_DB=true
else
    echo "✅ PostgreSQL detected"
    SKIP_DB=false
fi

# Install root dependencies
echo ""
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Setup environment file
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your database credentials and secrets"
else
    echo "✅ .env file already exists"
fi

# Database setup
if [ "$SKIP_DB" = false ]; then
    echo ""
    echo "🗄️  Database setup..."
    echo "   Please ensure PostgreSQL is running and create the database:"
    echo "   createdb eqms"
    echo ""
    echo "   Then run migrations:"
    echo "   cd backend && npm run migrate"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Create PostgreSQL database: createdb eqms"
echo "3. Run migrations: cd backend && npm run migrate"
echo "4. Start development: npm run dev"
echo ""
echo "For detailed instructions, see docs/SETUP.md"
