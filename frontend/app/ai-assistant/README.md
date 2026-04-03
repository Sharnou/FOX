# FOX AI Components

This directory contains all AI-powered components for the FOX marketplace.

## Components Overview

### 1. `AIAssistant` (`/components/ai/AIAssistant.js`)
A floating chat widget that provides context-aware marketplace assistance.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `detectedCountry` | string | Country name detected by AICountryDetector |
| `user` | object | Current logged-in user (from auth context) |

**Usage:**
```jsx
'use client';
import AIAssistant from '@/components/ai/AIAssistant';

// In your layout or page:
<AIAssistant detectedCountry="Egypt" user={currentUser} />
```

**API calls:** Calls `FOX.integrations.Core.InvokeLLM()` → routes through AI provider chain.

---

### 2. `AIAdImprover` (`/components/ai/AIAdImprover.js`)
Analyzes an ad listing and suggests improvements with a quality score.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `title` | string | Current ad title |
| `description` | string | Current ad description |
| `price` | number | Ad price |
| `category` | string | Ad category |
| `onApply` | function | Callback: `({ title?, description? }) => void` |

**Usage:**
```jsx
'use client';
import AIAdImprover from '@/components/ai/AIAdImprover';

<AIAdImprover
  title={formData.title}
  description={formData.description}
  price={formData.price}
  category={formData.category}
  onApply={(improved) => setFormData(prev => ({ ...prev, ...improved }))}
/>
```

---

### 3. `AIFraudAlert` (`/components/ai/AIFraudAlert.js`)
Scans a listing for fraud patterns and displays a risk indicator.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `title` | string | Listing title |
| `description` | string | Listing description |
| `price` | number | Listing price |
| `category` | string | Listing category |

**Integration in Ad Detail Page:**
```jsx
// In AdPageClient.js, add after the price display:
import AIFraudAlert from '../../components/AIFraudAlert';

// Inside the component, after price:
{ad?.price > 0.3 && (
  <AIFraudAlert
    title={ad.title}
    description={ad.description}
    price={ad.price}
    category={ad.category}
  />
)}
```

**Risk levels:** `low` (green) | `medium` (yellow) | `high` (red)

---

### 4. `AIListingGenerator` (`/components/sell/AIListingGenerator.js`)
Generates complete ad listings from a photo upload or text description.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `onGenerated` | function | Callback with generated listing data |

**Generated data shape:**
```js
{
  title: string,
  description: string,
  category: string,       // vehicles | electronics | real_estate | fashion | home | sports | other
  subcategory: string,
  estimated_price_usd: number,
  condition: string,      // new | like_new | good | fair | poor
  key_features: string[],
  images: string[],       // uploaded image URLs
  ai_generated: true
}
```

---

### 5. `AICountryDetector` (`/components/ai/AICountryDetector.js`)
Detects user's country from browser language and shows a banner.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `onDetected` | function | Callback: `(countryName: string) => void` |

---

### 6. `aiSelfHealer` (`/lib/aiSelfHealer.js`)
Background error monitoring system — initializes automatically on client-side.

**Usage:**
```js
'use client';
import { getAIHealer } from '@/lib/aiSelfHealer';

// In a useEffect:
useEffect(() => {
  getAIHealer(); // Initializes and starts monitoring
}, []);
```

---

## API Configuration

Add to `frontend/.env.local`:

```env
# At least one AI provider key required for real AI responses
NEXT_PUBLIC_GEMINI_API_KEY=AIza...
NEXT_PUBLIC_GROQ_API_KEY=gsk_...
NEXT_PUBLIC_OPENAI_API_KEY=sk-...

# Backend API
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

The client automatically tries providers in order: Gemini → Groq → OpenAI.
Without any key, components work in mock/demo mode.

---

## Adding a New AI Feature

1. Create `frontend/components/ai/AIYourFeature.js` with `'use client'` at top
2. Import `FOX` from `@/lib/XTOXClient`
3. Use `FOX.integrations.Core.InvokeLLM({ prompt: "..." })` for AI calls
4. Add a page in `frontend/app/` if needed
5. Add it to the AI tools grid in `frontend/app/ai-tools/page.js`

**Template:**
```jsx
'use client';
import { useState } from 'react';
import { FOX } from '@/lib/XTOXClient';

export default function AIYourFeature({ prop1, prop2 }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const response = await FOX.integrations.Core.InvokeLLM({
        prompt: `Your prompt here... Input: "${prop1}"`,
      });
      // Parse response.text (may contain JSON or plain text)
      setResult(response?.text || '');
    } catch {
      setResult('Error occurred');
    }
    setLoading(false);
  };

  return (
    <div>
      {/* Your UI here */}
    </div>
  );
}
```
