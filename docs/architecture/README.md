# Architecture Documentation

**Last Updated**: October 17, 2025

This section documents the system architecture, data models, API contracts, and technical decisions that form the foundation of the Artis Sales App.

---

## 📚 Contents

### Core Architecture
- **[SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)** - High-level system architecture and component diagram
- **[DATA_FLOW.md](DATA_FLOW.md)** - Event-driven architecture and data flow patterns
- **[SECURITY.md](SECURITY.md)** - Authentication, authorization, and security patterns

### Data & APIs
- **[FIRESTORE_SCHEMA.md](FIRESTORE_SCHEMA.md)** - Complete Firestore database schema with examples
- **[API_CONTRACTS.md](API_CONTRACTS.md)** - All API endpoints with request/response specifications
- **[NAVIGATION.md](NAVIGATION.md)** - Mobile app navigation architecture

---

## 🎯 Quick Start

### New to the Project?
1. Start with [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md) to understand the big picture
2. Review [FIRESTORE_SCHEMA.md](FIRESTORE_SCHEMA.md) to understand data models
3. Check [API_CONTRACTS.md](API_CONTRACTS.md) to see available endpoints
4. Read [NAVIGATION.md](NAVIGATION.md) to understand app structure

### Building a Feature?
1. Check [FIRESTORE_SCHEMA.md](FIRESTORE_SCHEMA.md) for data model
2. Review [API_CONTRACTS.md](API_CONTRACTS.md) for relevant endpoints
3. Understand [DATA_FLOW.md](DATA_FLOW.md) for event patterns
4. Follow [SECURITY.md](SECURITY.md) for auth requirements

### AI Agents
1. Read [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md) first for context
2. Reference [FIRESTORE_SCHEMA.md](FIRESTORE_SCHEMA.md) for collections
3. Check [API_CONTRACTS.md](API_CONTRACTS.md) before creating endpoints
4. Follow patterns in [DATA_FLOW.md](DATA_FLOW.md) for new features

---

## 🏛️ Architecture Principles

### 1. Event-Driven Design
- All state changes emit domain events
- Side effects handled by listeners/triggers
- Enables loose coupling and auditability

### 2. Offline-First
- All writes work offline and sync when online
- Firestore persistence enabled
- Local-first data access

### 3. Role-Based Access Control
- Firebase Authentication with custom claims
- Firestore Security Rules enforce permissions
- API endpoints validate user roles

### 4. Scalable Backend
- Cloud Functions for Firebase (serverless)
- Horizontal scaling built-in
- Event outbox pattern for reliability

### 5. Mobile-First Design
- Android-first with iOS compatibility
- React Native + Expo managed workflow
- Performance optimized (FlashList, memoization)

---

## 📊 System Stack

### Mobile (React Native + Expo SDK 53)
```
expo-location          → GPS tracking
expo-camera           → Photo capture
expo-av               → Audio/video
expo-image-manipulator → Image compression
@react-native-firebase/* → Firebase integration
react-navigation      → Navigation
```

### Backend (Firebase)
```
Firestore             → NoSQL database + offline sync
Cloud Functions       → Serverless compute
Firebase Auth         → Phone number authentication
Firebase Storage      → Photo/file storage
Cloud Scheduler       → Cron jobs
FCM                   → Push notifications
```

### Development Tools
```
TypeScript            → Type safety
ESLint + Prettier     → Code quality
Git                   → Version control
EAS                   → Build & deployment
```

---

## 🔗 Related Documentation

- **Implementation**: [/docs/features/](../features/) - Feature-by-feature documentation
- **Design**: [/docs/design/](../design/) - Design system and branding
- **Decisions**: [/docs/decisions/](../decisions/) - Why we made certain choices
- **Development**: [/docs/development/](../development/) - Dev setup and troubleshooting

---

## 📝 Contributing to Architecture Docs

When making architectural changes:

1. **Update relevant doc** - Keep architecture docs current
2. **Document decisions** - Create decision log in `/decisions/`
3. **Update diagrams** - Reflect changes in system diagrams
4. **Review security** - Ensure new patterns are secure
5. **Update STATUS.md** - Reflect completion in status doc

---

**Questions?** Check [/docs/DOCUMENTATION_MAP.md](../DOCUMENTATION_MAP.md) for navigation or ask in project chat.
