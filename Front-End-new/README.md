# 🏪 TuwaiqPick - Smart Retail Management System

A comprehensive retail management system with AI-powered features, QR code tracking, and real-time inventory management.

## 🌟 Features

### 🎯 Core Features
- **Smart Inventory Management** - Real-time tracking with QR codes
- **AI-Powered Chatbot** - RAG (Retrieval-Augmented Generation) system for intelligent customer support
- **Admin Dashboard** - Comprehensive analytics and management tools
- **User Management** - Customer accounts with real database integration
- **Invoice System** - Automated invoice generation and management
- **Branch Management** - Multi-location support
- **Complaint System** - Customer support ticket management

### 🤖 AI & ML Features
- **YOLO Object Detection** - Real-time product tracking
- **OpenAI Integration** - Advanced language processing
- **RAG System** - Intelligent document retrieval and response generation
- **Multi-language Support** - Arabic and English interfaces

### 📱 User Interface
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Modern UI/UX** - Clean, intuitive interface
- **Real-time Updates** - Live data synchronization
- **Interactive Charts** - Visual analytics and reporting

## 🏗️ Project Structure

```
TuwaiqPick/
├── Front-End-new/          # Main frontend application
│   ├── admin/              # Admin dashboard pages
│   ├── pages/              # User-facing pages
│   ├── css/                # Stylesheets
│   ├── js/                 # JavaScript modules
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
- Node.js 14+
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
# Python dependencies
pip install -r requirements.txt

# Node.js dependencies (if needed)
npm install
```

### 4. Start the Server
```bash
# Start the RAG API server
python start_server.py
```

### 5. Open the Application
Open `Front-End-new/pages/index.html` in your browser or serve it using a local server.

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
The system uses Supabase as the backend database. Refer to `Front-End-new/database_schema.md` for detailed database structure and setup instructions.

## 📖 Usage

### For Customers
1. **Browse Products** - View available products and inventory
2. **Create Account** - Sign up for personalized experience
3. **Place Orders** - Generate invoices and track orders
4. **Get Support** - Use AI chatbot for instant help
5. **Manage Profile** - Update personal information

### For Administrators
1. **Dashboard** - View analytics and system overview
2. **Inventory Management** - Add, edit, and track products
3. **Branch Management** - Manage multiple locations
4. **User Management** - Monitor customer accounts
5. **Complaint Resolution** - Handle support tickets

### AI Chatbot
The RAG-powered chatbot can help with:
- Product information and availability
- Order status and tracking
- Branch locations and hours
- General inquiries and support

## 🛠️ Development

### Frontend Development
The frontend is built with vanilla HTML, CSS, and JavaScript with ES6 modules:

```bash
cd Front-End-new
# Edit HTML files in pages/ and admin/
# Modify styles in css/
# Update functionality in js/
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
- Check `database_schema.md` for table structures
- Use Supabase dashboard for data management

## 🔒 Security

- API keys are stored in environment variables
- Supabase handles authentication and authorization
- Input validation on all forms
- CORS protection enabled

## 📊 Technologies Used

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Supabase JavaScript client
- Chart.js for analytics
- Responsive design principles

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

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Multi-language support expansion
- [ ] Integration with payment gateways
- [ ] Advanced AI features
- [ ] Real-time notifications
- [ ] Advanced reporting tools

---

**Built with ❤️ for Tuwaiq Bootcamp**
