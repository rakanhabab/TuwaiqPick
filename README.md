# Tuwaiq Pick Platform

A modern e-commerce platform built with HTML, CSS, and JavaScript, featuring QR code functionality, user authentication, and an intelligent virtual assistant powered by OpenAI and Supabase.

## Features

### 🛍️ E-commerce Features
- Product catalog with real-time inventory
- Shopping cart functionality
- QR code generation and scanning
- Invoice management
- Payment method integration

### 👤 User Management
- User registration and authentication
- Admin panel with special privileges
- User profile management
- Order history tracking

### 🤖 Intelligent Assistant
- AI-powered virtual assistant using OpenAI
- Real-time product information from Supabase
- Natural language query processing
- Dynamic response generation

### 📱 Modern UI/UX
- Responsive design for all devices
- Modern gradient-based styling
- Smooth animations and transitions
- Intuitive navigation

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Database**: Supabase (PostgreSQL)
- **AI Integration**: OpenAI API
- **QR Code**: qrcode.min.js library
- **Styling**: Custom CSS with modern design patterns

## Project Structure

```
Front-End-new/
├── index.html              # Landing page
├── login.html              # User login
├── signup.html             # User registration
├── user.html               # Main user dashboard
├── qr.html                 # QR code functionality
├── admin.html              # Admin panel
├── css/
│   ├── base.css           # Base styles
│   ├── user.css           # User page styles
│   ├── qr.css             # QR page styles
│   └── dashboard.css      # Dashboard styles
├── js/
│   ├── auth.js            # Authentication logic
│   ├── user.js            # User functionality
│   ├── qr.js              # QR code logic
│   ├── admin.js           # Admin functionality
│   └── dashboard.js       # Dashboard logic
├── rag-system.js          # AI assistant system
└── supabase-config.js     # Database configuration
```

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/tuwaiq-pick.git
cd tuwaiq-pick
```

### 2. Configure Supabase
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Update `supabase-config.js` with your credentials:
   ```javascript
   const SUPABASE_URL = "your-supabase-url";
   const SUPABASE_ANON_KEY = "your-supabase-anon-key";
   ```

### 3. Configure OpenAI
1. Get an OpenAI API key from [openai.com](https://openai.com)
2. Update the API key in `rag-system.js`:
   ```javascript
   this.apiKey = 'your-openai-api-key';
   ```

### 4. Run the Application
1. Start a local server (required for proper functionality):
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

2. Open your browser and navigate to `http://localhost:8000`

## Database Schema

The application uses the following Supabase tables:

- **users**: User accounts and profiles
- **products**: Product catalog
- **branches**: Store locations
- **inventory**: Product stock levels
- **invoices**: Order records
- **payment_methods**: User payment information
- **tickets**: Refund and support tickets

## Admin Access

Default admin credentials:
- Email: `admin@admin.com`
- Password: `admin123`

## Features in Detail

### QR Code System
- Generate QR codes for products
- Scan QR codes to add items to cart
- Mobile-friendly QR scanning interface

### Virtual Assistant
- Ask questions about products, branches, and services
- Get real-time inventory information
- Natural language processing for queries

### User Dashboard
- View order history
- Manage payment methods
- Track account balance
- Access QR code functionality

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions, please open an issue in the GitHub repository or contact the development team.

## Acknowledgments

- Supabase for the backend infrastructure
- OpenAI for AI capabilities
- The Tuwaiq Pick development team
