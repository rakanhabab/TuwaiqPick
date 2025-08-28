# 🏪 TuwaiqPick - Smart Retail Management System

A comprehensive retail management system with AI-powered features, QR code tracking, and real-time inventory management. Built with modern web technologies and integrated with Supabase for robust data management.

## 🌟 Features

### 🎯 Core Features
- **Smart Inventory Management** - Real-time tracking with QR codes and database integration
- **AI-Powered Chatbot** - RAG (Retrieval-Augmented Generation) system for intelligent customer support
- **Admin Dashboard** - Comprehensive analytics with real-time data from Supabase
- **User Management** - Customer accounts with full database integration
- **Invoice System** - Automated invoice generation and management
- **Branch Management** - Multi-location support with real data
- **Complaint System** - Customer support ticket management with status tracking

### 🤖 AI & ML Features
- **YOLO Object Detection** - Real-time product tracking with QR codes
- **OpenAI Integration** - Advanced language processing for chatbot
- **RAG System** - Intelligent document retrieval and response generation
- **Multi-language Support** - Arabic and English interfaces

### 📱 User Interface
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Modern UI/UX** - Clean, intuitive interface with unified styling
- **Real-time Updates** - Live data synchronization with Supabase
- **Interactive Charts** - Visual analytics using Plotly.js
- **ES6 Modules** - Modern JavaScript architecture

## 🏗️ Project Structure

```
TuwaiqPick/
├── Front-End-new/          # Main frontend application
│   ├── admin/              # Admin dashboard pages (fully DB integrated)
│   │   ├── dashboard.html  # Analytics dashboard
│   │   ├── operations.html # Live operations monitoring
│   │   ├── inventory.html  # Inventory management
│   │   ├── branches.html   # Branch management
│   │   └── tickets.html    # Support ticket management
│   ├── pages/              # User-facing pages
│   │   ├── index.html      # Landing page
│   │   ├── login.html      # Authentication
│   │   ├── user.html       # User dashboard
│   │   ├── account.html    # User profile management
│   │   └── ...             # Other user pages
│   ├── css/                # Stylesheets
│   ├── js/                 # JavaScript modules (ES6)
│   │   ├── database.js     # Supabase integration
│   │   ├── auth.js         # Authentication service
│   │   └── ...             # Page-specific services
│   ├── img/                # Images and assets
│   └── database_schema.md  # Database documentation
├── Track-Model-with-QR/    # QR tracking system
├── rag_api.py             # RAG API server
├── rag_system.py          # RAG system implementation
├── start_server.py        # Server startup script
├── requirements.txt       # Python dependencies
├── config.env.example     # Environment configuration template
└── yolov8n.pt            # YOLO model weights
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 14+ (optional, for development)
- Supabase account
- OpenAI API key

### 1. Clone the Repository
```bash
git clone https://github.com/rakanhabab/TuwaiqPick.git
cd TuwaiqPick
```

### 2. Set Up Environment
```bash
# Copy environment template
cp config.env.example config.env

# Edit config.env with your credentials
# Add your OpenAI API key, Supabase URL, and Supabase key
```

### 3. Install Dependencies
```bash
# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### 4. Start the Server
```bash
# Start the RAG API server
python start_server.py
```

### 5. Open the Application
- Use Live Server in VS Code, or
- Run `python -m http.server` in the Front-End-new directory
- Open `http://localhost:5500/pages/index.html` in your browser

## 🔧 Configuration

### Environment Variables
Create a `config.env` file with the following variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here

# Server Configuration
HOST=0.0.0.0
PORT=8001
```

### Database Setup
The system uses Supabase as the backend database. All admin pages are now fully integrated with real data:
- Dashboard shows real revenue from paid invoices
- Inventory displays actual product quantities
- Operations shows live pending orders
- Branches displays real branch data
- Tickets shows actual support tickets

## 📖 Usage

### For Customers
1. **Browse Products** - View available products and inventory
2. **Create Account** - Sign up for personalized experience
3. **Place Orders** - Generate invoices and track orders
4. **Get Support** - Use AI chatbot for instant help
5. **Manage Profile** - Update personal information

### For Administrators
1. **Dashboard** - View real-time analytics and system overview
2. **Inventory Management** - Monitor actual product quantities and status
3. **Branch Management** - Manage multiple locations with real data
4. **Operations** - Track live orders and virtual carts
5. **Complaint Resolution** - Handle support tickets with status updates

### AI Chatbot
The RAG-powered chatbot can help with:
- Product information and availability
- Order status and tracking
- Branch locations and hours
- General inquiries and support

## 🛠️ Development

### Frontend Development
The frontend uses modern ES6 modules and Supabase integration:

```bash
cd Front-End-new
# All pages use ES6 modules for better organization
# Database integration through database.js
# Page-specific services in js/ directory
```

### Backend Development
The backend uses FastAPI for the RAG system:

```bash
# Start development server
python start_server.py

# API will be available at http://localhost:8001
```

### Database Development
- All database operations are handled through Supabase
- Real-time data synchronization
- Row Level Security (RLS) enabled
- Check `database_schema.md` for table structures

## 🔒 Security

- API keys stored in environment variables
- Supabase handles authentication and authorization
- Input validation on all forms
- CORS protection enabled
- No dummy data - all information comes from database

## 📊 Technologies Used

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Supabase JavaScript client
- Plotly.js for analytics
- Responsive design principles
- ES6 modules for better code organization

### Backend
- Python 3.8+
- FastAPI
- OpenAI API
- LangChain
- Supabase

### AI/ML
- YOLO v8 for object detection
- OpenAI GPT models
- RAG (Retrieval-Augmented Generation)
- Natural language processing

### Database
- Supabase (PostgreSQL)
- Real-time subscriptions
- Row Level Security (RLS)
- Full CRUD operations

## 🆕 Recent Updates

### Latest Changes
- ✅ Removed all dummy data from admin pages
- ✅ Full database integration for all admin features
- ✅ Unified admin interface styling
- ✅ Removed virtual assistant from all admin pages
- ✅ Enhanced user account management
- ✅ Improved file organization (pages/ folder)
- ✅ Fixed all path issues for Live Server
- ✅ Updated dependencies and requirements

### Admin Features
- **Dashboard**: Real revenue from paid invoices only
- **Inventory**: Live product quantities and status
- **Operations**: Active pending orders
- **Branches**: Real branch information (no editing)
- **Tickets**: Actual support tickets with refund tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation in `Front-End-new/database_schema.md`
- Review the code comments for implementation details
- Open an issue on GitHub for bugs or feature requests

## 🎯 Roadmap

- [x] Full database integration
- [x] Real-time data synchronization
- [x] Admin dashboard with live data
- [x] User account management
- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Multi-language support expansion
- [ ] Integration with payment gateways
- [ ] Advanced AI features
- [ ] Real-time notifications
- [ ] Advanced reporting tools

---

**Built with ❤️ for Tuwaiq Bootcamp**
