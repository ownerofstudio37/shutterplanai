# ShutterPlan AI - Photography Planning Web Application

A modern, AI-powered photography planning and project management web application built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

- **User Authentication**: Secure signup, login, and session management
- **Project Management**: Create and organize photography projects
- **Shot Planning**: Plan and organize individual shots for projects
- **Dashboard**: Overview of your projects and recent activity
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Updates**: Live project and shot status tracking

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **API**: Next.js API Routes
- **Authentication**: JWT (Mock implementation)
- **Testing**: ESLint

## 📦 Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open browser
# Navigate to http://localhost:3000
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── dashboard/         # Dashboard pages
├── components/            # Reusable React components
│   ├── auth/             # Authentication components
│   ├── layout/           # Layout components
│   ├── common/           # Common components
│   └── ui/               # UI components (Button, Card, Modal)
├── contexts/             # React Context (Auth)
├── lib/                  # Utility functions
│   ├── auth/            # Authentication utilities
│   ├── utils/           # Helper functions
│   └── db/              # Database utilities
├── types/               # TypeScript type definitions
└── hooks/               # Custom React hooks
```

## 🔐 Authentication

The app includes a complete authentication system:

### Signup Page (`/auth/signup`)
Create a new account with email, password, and name.

### Login Page (`/auth/login`)
Sign in with your email and password.

### Dashboard (`/dashboard`)
Access your projects and shots after authentication.

## 📚 Key Components

### Button Component
Reusable button component with multiple variants and sizes.

```tsx
<Button variant="primary" size="md">
  Click me
</Button>
```

### Card Component
Container component for content organization.

```tsx
<Card>
  <h3>Card Title</h3>
  <p>Card content</p>
</Card>
```

### Modal Component
Dialog component for user interactions.

```tsx
<Modal isOpen={isOpen} onClose={handleClose} title="Confirm">
  <p>Are you sure?</p>
</Modal>
```

## 🔄 State Management

### useAuth Hook
Access authentication state and methods throughout the app.

```tsx
const { user, isLoading, error, login, logout } = useAuth();
```

## 🚦 Available Scripts

```bash
# Development
npm run dev

# Production build
npm run build

# Run production
npm start

# Linting
npm run lint

# Linting with fix
npm run lint -- --fix
```

## 🗄️ Database Models

### User
- id
- email
- name
- role (admin, user, guest)
- createdAt
- updatedAt

### Project
- id
- title
- description
- userId
- status (draft, planning, in-progress, completed, archived)
- startDate
- endDate
- tags
- createdAt
- updatedAt

### Shot
- id
- projectId
- title
- description
- location
- plannedTime
- status (planned, taken, approved, rejected)
- notes
- imageUrl
- createdAt
- updatedAt

## 🔮 Future Enhancements

- [ ] AI-powered shot suggestions
- [ ] Image upload and processing
- [ ] Real database integration (PostgreSQL, MongoDB)
- [ ] Advanced project analytics
- [ ] Collaboration features
- [ ] Weather integration for planning
- [ ] Location mapping
- [ ] Export projects to PDF
- [ ] Mobile app
- [ ] Real-time notifications
- [ ] AI image enhancement

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open http://localhost:3000

# 4. Create an account and start planning!
```

## 📝 Next Steps

1. **Connect Database**: Update API routes to use PostgreSQL or MongoDB
2. **Implement Projects Page**: Build full CRUD for projects
3. **Add Image Upload**: Implement image handling
4. **AI Integration**: Add AI-powered shot suggestions
5. **Deploy**: Push to production (Vercel recommended)

## 🐛 Troubleshooting

### Port Already in Use
```bash
npm run dev -- -p 3001
```

### Dependencies Issues
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📄 License

MIT License

## 📧 Support

For support, email support@shutterpland.ai

---

**Happy planning! 📸**
