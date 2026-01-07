# CaseTools v2.0 Frontend

A modern, production-ready frontend for the Revenue Assurance Alert Management Platform built with Next.js 14, TypeScript, and Ant Design.

## 🚀 Features

### Core Functionality
- **Real-time Dashboard** with live statistics and charts
- **Alert Rules Management** with visual SQL query builder  
- **Case Management** with comprehensive workflow and timeline
- **User Management** with role-based access control
- **System Administration** with health monitoring and settings

### Real-time Features
- **WebSocket Integration** for live notifications
- **Live Data Updates** across all components
- **Real-time Alerts** with sound and visual notifications
- **Connection Status Monitoring** with auto-reconnection
- **Live Activity Feed** with user presence indicators

### User Experience
- **Responsive Design** optimized for all screen sizes
- **Dark/Light Theme** with automatic system detection
- **Multi-language Support** (English, French, Arabic with RTL)
- **Accessibility** compliant with WCAG 2.1 standards
- **Progressive Web App** capabilities

## 🛠 Technology Stack

- **Next.js 14** - React framework with App Router
- **TypeScript 5** - Static type checking
- **Ant Design 5** - UI component library
- **TailwindCSS 4** - Utility-first CSS framework
- **Zustand** - Lightweight state management
- **React Query** - Server state management
- **WebSocket/STOMP** - Real-time communication

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Backend API running on port 8080
- Grafana instance on port 9000 (optional)

### Installation & Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) to view the application.

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Testing  
npm run test         # Run unit tests
npm run test:e2e     # Run E2E tests with Playwright
npm run test:ui      # Interactive test runner

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## 📁 Project Structure

```
frontend/src/
├── app/                    # Next.js 14 App Router pages
│   ├── dashboard/         # Analytics dashboard
│   ├── alerts/            # Alert management
│   ├── cases/             # Case management  
│   ├── admin/             # Administration
│   ├── analytics/         # Advanced analytics
│   ├── profile/           # User profile
│   └── login/             # Authentication
├── components/            # Reusable components
│   ├── antd/             # Ant Design layouts
│   ├── providers/        # Context providers
│   └── common/           # Common utilities
├── lib/                   # Utility libraries
│   ├── api-client.ts     # API client
│   ├── types.ts          # TypeScript definitions
│   └── websocket-stomp.ts # WebSocket service
└── store/                 # State management
```

## ⚙️ Configuration

### Environment Variables

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_WS_URL=ws://localhost:8080/api/ws
NEXT_PUBLIC_GRAFANA_URL=http://localhost:9000

# Application Settings
NEXT_PUBLIC_APP_NAME="CaseTools"
NEXT_PUBLIC_APP_VERSION="2.0.0"

# Feature Flags
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

## 🔌 API Integration

### Authentication
- JWT-based authentication with automatic token refresh
- Role-based access control (Admin, Manager, Analyst, Viewer)
- Secure session management

### Real-time Communication  
- WebSocket connection with STOMP protocol
- User-specific notification channels
- Auto-reconnection with exponential backoff
- Connection status monitoring

### Core APIs
- **Alert Rules**: CRUD operations with visual query builder
- **Case Management**: Full lifecycle management with workflow
- **Analytics**: Performance metrics and trend analysis
- **System Health**: Monitoring and configuration

## 🎨 UI/UX Features

### Design System
- Ant Design 5 component library
- Consistent 8px grid spacing system
- WCAG 2.1 AA accessibility compliance
- Custom theme with brand colors

### Responsive Design
- Mobile-first approach
- Flexible grid system for all screen sizes
- Touch-friendly controls
- Optimized performance across devices

### Internationalization
- English, French, Arabic language support
- RTL (Right-to-Left) layout for Arabic
- Dynamic language switching
- Localized date/time formatting

## 🚀 Deployment

### Docker Deployment
```bash
# Build image
docker build -t casetools-frontend .

# Run container
docker run -p 3001:3001 casetools-frontend
```

### Production Build
```bash
npm run build
npm start
```

## 🔒 Security Features

- JWT token management with secure storage
- Content Security Policy (CSP) headers
- XSS and CSRF protection
- Input validation and sanitization
- Secure cookie configuration

## 📊 Performance Features

- Code splitting at route and component level
- Image optimization with Next.js Image
- Bundle size optimization
- React Query caching and background updates
- WebSocket connection pooling

## 🧪 Testing Strategy

- **Unit Tests**: Component and utility testing
- **Integration Tests**: API interaction testing  
- **E2E Tests**: Critical user journey testing with Playwright
- **Accessibility Tests**: WCAG compliance validation

## 📈 Monitoring & Analytics

- Core Web Vitals tracking
- Error boundary with detailed error reporting
- Performance metrics dashboard
- User activity analytics
- API response time monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes and add tests
4. Commit using conventional commits
5. Push and create a Pull Request

### Code Standards
- TypeScript strict mode
- ESLint + Prettier configuration
- Comprehensive test coverage
- Accessibility compliance
- Performance optimization

## 📝 License

Proprietary software owned by Elite Business Solutions. All rights reserved.

## 🆘 Support

- **Issues**: Create GitHub issue with detailed description
- **Email**: contact@elite-business.com
- **Documentation**: Check `/docs` folder for detailed guides

---

Built with ❤️ by the Elite Business Solutions team.
