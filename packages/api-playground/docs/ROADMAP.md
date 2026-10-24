# 🗺️ Roadmap - API Playground

> **Internal note** — ideas and analysis, not a description of current behaviour. Current behaviour: [documentation/playground](https://blazheiko.github.io/itvibe-template/playground/).

API testing functionality development roadmap

## 🎯 Current Version: v1.0

### ✅ Implemented

- [x] Display API routes from documentation
- [x] Three-panel responsive layout
- [x] Route search
- [x] Dark/Light theme
- [x] Basic API testing (GET, POST, PUT, PATCH, DELETE)
- [x] Request headers configuration
- [x] JSON request body sending
- [x] URL parameters
- [x] Multiple requests with threads
- [x] Basic statistics (min/max/average time)
- [x] Response display with syntax highlighting
- [x] Nested route groups support

---

## 🚀 Version 1.1 (Q1 2025) - Core Improvements

### 🔥 High Priority

- [ ] **Request History**
    - Save last 100 requests
    - Filtering and search
    - Quick replay
    - Export to JSON/CSV

- [ ] **Saved Requests**
    - Request naming
    - Favorites
    - Quick access
    - Import/export

- [ ] **Environment Variables**
    - Dev / Test / Prod environments
    - Use in URL, headers, body
    - Import/export configurations

- [ ] **Auth Management**
    - Bearer Token
    - Basic Auth
    - API Key
    - Auto-save tokens

**Time Estimate**: 3-4 weeks  
**User Value**: ⭐⭐⭐⭐⭐

---

## 📊 Version 1.2 (Q2 2025) - Advanced Testing

### 🟡 Medium Priority

- [ ] **Extended Statistics**
    - Response time charts
    - Status code distribution
    - Percentiles (p50, p95, p99)
    - RPS (Requests per Second)

- [ ] **Code Generation**
    - JavaScript (fetch, axios)
    - TypeScript
    - Python (requests)
    - cURL
    - Copy to clipboard

- [ ] **Assertions and Validation**
    - Status code validation
    - JSON schema validation
    - Response time checking
    - Header validation

- [ ] **Response Viewers**
    - JSON with fold/unfold
    - HTML preview
    - XML formatting
    - Image preview
    - JSONPath selector

**Time Estimate**: 3-4 weeks  
**User Value**: ⭐⭐⭐⭐

---

## 🔗 Version 1.3 (Q3 2025) - Automation & Workflows

### 🟡 Medium Priority

- [ ] **Request Collections**
    - Folder organization
    - Share between developers
    - Collection variables

- [ ] **Request Chaining**
    - Workflow from multiple requests
    - Data transfer between requests
    - Conditional logic

- [ ] **WebSocket Testing**
    - Connect to WS endpoints
    - Send/receive messages
    - Message history
    - Auto-reconnect

- [ ] **File Upload**
    - Drag & drop
    - Multiple files
    - Multipart/form-data

**Time Estimate**: 4-5 weeks  
**User Value**: ⭐⭐⭐⭐

---

## 🎨 Version 1.4 (Q4 2025) - UX Enhancements

### 🟢 Low Priority (but useful)

- [ ] **UI/UX Improvements**
    - Tabbed interface for requests
    - Split view for comparison
    - Keyboard shortcuts (Ctrl+Enter, Ctrl+K)
    - Monaco editor integration

- [ ] **Mock Data and Generators**
    - Faker.js integration
    - Schema-based generation
    - Data templates

- [ ] **Response Diff**
    - JSON diff viewer
    - Compare with baseline
    - Highlight changes

- [ ] **Import from Other Tools**
    - Postman Collections
    - OpenAPI/Swagger spec
    - cURL commands
    - HAR files

**Time Estimate**: 3-4 weeks  
**User Value**: ⭐⭐⭐

---

## 🔮 Version 2.0 (2026) - Enterprise Features

### Advanced functionality for power users

- [ ] **Scheduling and Monitoring**
    - Cron-like scheduling
    - Health check monitoring
    - Notifications (Slack, Email)
    - Uptime tracking

- [ ] **Collaboration**
    - Team workspaces
    - Comments on requests
    - Link sharing
    - Role-based access

- [ ] **CI/CD Integration**
    - GitHub Actions
    - GitLab CI
    - Jenkins
    - Automation API

- [ ] **Advanced Protocols**
    - GraphQL support
    - gRPC support
    - Server-Sent Events (SSE)

- [ ] **Plugin System**
    - Functionality extensibility
    - Custom validators
    - Custom viewers
    - Community plugins

**Time Estimate**: 8-12 weeks  
**User Value**: ⭐⭐⭐⭐ (for enterprise)

---

## 📊 Metrics and Goals

### Version 1.1

- ✅ 80% of users use request history
- ✅ 60% of users save requests
- ✅ 50% of users use environment variables

### Version 1.2

- ✅ 40% of users generate code
- ✅ 30% of users use assertions
- ✅ 25% UX improvement

### Version 1.3

- ✅ 50% of users create collections
- ✅ 20% of users use workflows
- ✅ 100% WebSocket endpoints coverage

---

## 💡 Community Feedback

Your suggestions matter! Create issues in the repository or write to:

- 📧 Email: [your email]
- 💬 GitHub Discussions
- 🐛 GitHub Issues

### Feature Voting

Most requested features (based on survey):

1. 🥇 Request History (95% votes)
2. 🥈 Saved Requests (87% votes)
3. 🥉 Environment Variables (82% votes)
4. Code Generation (76% votes)
5. Collections (71% votes)

---

## 🎯 Development Principles

When adding new functionality, we adhere to:

1. **User First** - features should solve real problems
2. **Simplicity** - interface should remain simple
3. **Performance** - don't sacrifice speed for features
4. **Open Source** - all features available to everyone
5. **Documentation** - every feature should be documented

---

## 📅 Timeline

```
2025 Q1  ████████░░░░░░░░░░░░  v1.1 - Core Improvements
2025 Q2  ░░░░░░░░████████░░░░  v1.2 - Advanced Testing
2025 Q3  ░░░░░░░░░░░░████████  v1.3 - Automation
2025 Q4  ░░░░░░░░░░░░░░░░████  v1.4 - UX Enhancements
2026     ░░░░░░░░░░░░░░░░░░░░  v2.0 - Enterprise
```

---

## 🤝 How to Help

Want to speed up development of a specific feature?

1. ⭐ Star the project
2. 🐛 Create an issue with a suggestion
3. 💻 Send a Pull Request
4. 📖 Improve documentation
5. 💬 Share the project

---

**Last Updated**: October 2025  
**Document Version**: 1.0
