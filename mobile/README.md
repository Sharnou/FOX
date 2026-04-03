# FOX Mobile Apps

This directory contains mobile applications for the FOX marketplace.

## Apps

### React Native (`/react-native/`)
Expo-based React Native app with full marketplace features.

#### Setup & Run
```bash
cd react-native
npm install
npx expo start
```

#### Features
- Authentication (email, phone, social)
- Browse and search listings
- Post new listings with AI classification
- Favorites & saved searches
- In-app chat

#### Backend Connection
The app connects to: `https://xtox-production.up.railway.app`
To change: Update the default URL in `App.js`:
```js
const [base, setBase] = useState("https://xtox-production.up.railway.app");
```
Or update it directly in the Home screen's input field at runtime.

---

### Flutter (`/flutter/`)
Dart/Flutter app with image upload support and full API integration.

#### Setup & Run
```bash
cd flutter
flutter pub get
flutter run
```

#### Features
- Authentication (all methods)
- Taxonomy/category browsing
- Listing creation with image upload
- Search with pagination
- Favorites & saved searches
- Chat

#### Backend Connection
API base URL is set in your app's initialization. 
Update `lib/api.dart` or pass the URL when creating `FoxApi`:
```dart
final api = FoxApi('https://xtox-production.up.railway.app');
```

---

## Backend API (xtox-production.up.railway.app)

Base URL: `https://xtox-production.up.railway.app`

### Key Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/ads` | Create listing |
| GET | `/api/ads` | List ads |
| POST | `/api/favorites` | Add favorite |
| GET | `/api/favorites` | List favorites |
| GET | `/api/notifications` | Get notifications |
| POST | `/api/chat` | Send message |

### Authentication
All authenticated requests use `Authorization: Bearer <token>` header.
