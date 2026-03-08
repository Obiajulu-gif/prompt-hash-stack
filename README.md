# PromptHash - AI Prompt Marketplace

PromptHash is a decentralized prompt marketplace built on the Stacks blockchain. Sellers can list and monetize their AI prompts, while buyers can discover and purchase premium prompt content with cryptocurrency (STX/sBTC). Premium content is protected by x402 payment challenges, ensuring creators get paid for their work.

## 🏗️ Architecture

**Frontend:**
- Next.js 16 (App Router) with React 19
- Tailwind CSS + shadcn/ui components
- TypeScript for type safety
- Responsive design (mobile & desktop)

**Blockchain:**
- Stacks blockchain for payments
- `@stacks/connect` for wallet integration (Leather, Xverse)
- `x402-stacks` for HTTP 402 payment challenges
- Facilitator-based settlement

**Backend:**
- Next.js API routes (serverless)
- Supabase (PostgreSQL with Row Level Security)
- x402 payment verification

## 📋 Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Vercel Deployment](#vercel-deployment)
- [Supabase Setup](#supabase-setup)
- [API Documentation](#api-documentation)
- [Wallet Integration](#wallet-integration)
- [Troubleshooting](#troubleshooting)
- [Security](#security)

## ✨ Features

- **Browse Prompts**: Public marketplace with search and filtering
- **Wallet Integration**: Connect with Leather or Xverse wallets
- **Create Listings**: Sellers can list prompts with metadata and pricing
- **x402 Payments**: Premium content gated behind cryptographic payment challenges
- **Purchase History**: Track your purchases and owned prompts
- **Chat Interface**: AI-powered chat for prompt assistance
- **Governance**: Community governance features
- **Responsive Design**: Works on mobile and desktop

## 🔌 Using the API

### For Buyers

1. **Browse Prompts** (no wallet needed):
   ```bash
   curl https://prompt-hash-x402.vercel.app/api/prompts
   ```

2. **Purchase Prompt** (requires Stacks wallet):
   - Copy a prompt `id` from step 1
   - Use the x402-stacks client library (see `API_TESTING_GUIDE.md`)
   - Or visit the web UI at https://prompt-hash-x402.vercel.app/browse

3. **Re-access Purchased Content** (free):
   - Once purchased, access anytime without additional payment
   - Include your wallet address in `x-buyer-wallet` header

### For AI Agents

1. Discover marketplace: https://scan.stacksx402.com
2. Read API schema: https://prompt-hash-x402.vercel.app/api/x402/schema  
3. Browse prompts: https://prompt-hash-x402.vercel.app/api/prompts
4. Purchase with x402 payment protocol automatically

See [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md) for detailed examples and working prompt IDs.

## 🔧 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ or 20+ installed
- **pnpm** (recommended) or npm
- **Supabase account** (free tier works)
- **Stacks wallet** (Leather or Xverse browser extension)
- **Git** for version control

## 🚀 Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/prompt-hash-x402.git
cd prompt-hash-x402
```

### 2. Install Dependencies

```bash
pnpm install
# or
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your actual values. See [Environment Variables](#environment-variables) section for details.

### 4. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migration script from `supabase/migrations/20260210_marketplace.sql`
3. Copy your project URL and keys to `.env`

See [Supabase Setup](#supabase-setup) for detailed instructions.

### 5. Run Development Server

```bash
pnpm dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Test Wallet Connection

1. Install [Leather Wallet](https://leather.io) or [Xverse Wallet](https://xverse.app) browser extension
2. Switch to testnet in your wallet settings
3. Get testnet STX from the [faucet](https://explorer.hiro.so/sandbox/faucet)
4. Click "Connect Wallet" in the app header

## 🔐 Environment Variables

PromptHash uses several environment variables for configuration. Variables prefixed with `NEXT_PUBLIC_` are **inlined at build time** and exposed to the browser.

### Required Variables

#### App Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_APP_URL` | Public URL of your app | `http://localhost:3000` (dev)<br/>`https://your-app.vercel.app` (prod) | ✅ |
| `NODE_ENV` | Environment mode | `development` or `production` | ✅ |

#### Supabase Database

| Variable | Description | Where to Find | Required |
|----------|-------------|---------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Project Settings → API | ✅ |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public anon key | Project Settings → API | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role secret | Project Settings → API (keep secret!) | ✅ |

#### Stacks Network

| Variable | Description | Values | Required |
|----------|-------------|--------|----------|
| `NETWORK` | Stacks network for server | `testnet` or `mainnet` | ✅ |
| `NEXT_PUBLIC_STACKS_NETWORK` | Stacks network for browser | `testnet` or `mainnet` | ✅ |
| `FACILITATOR_URL` | x402 facilitator endpoint | `https://facilitator.stacksx402.com` | ✅ |

#### Wallet Integration (CRITICAL FOR VERCEL)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_STACKS_WALLET_PROVIDERS` | Comma-separated wallet provider IDs | `LeatherProvider,XverseProviders.BitcoinProvider` | ✅ |

#### Optional Variables

| Variable | Description | When Needed |
|----------|-------------|-------------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect cloud project ID | Only if using WalletConnect provider |
| `SERVER_ADDRESS` | Server Stacks address | For x402 server-side operations |
| `SERVER_PRIVATE_KEY` | Server private key | For x402 server-side operations (never expose!) |
| `CLIENT_PRIVATE_KEY` | Test client private key | Local testing only (never use in production!) |

### Environment Variable Reference

See `.env.example` for a complete template with all variables and descriptions.

## 🌐 Vercel Deployment

### Prerequisites

- [Vercel account](https://vercel.com) (free tier works)
- GitHub repository for your project
- Supabase project set up

### Step-by-Step Deployment

#### 1. Prepare Your Repository

Ensure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

#### 2. Import Project to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Select "Import Git Repository"
3. Choose your `prompt-hash-x402` repository
4. Click "Import"

#### 3. Configure Environment Variables

**⚠️ CRITICAL**: Before deploying, set these environment variables in Vercel:

1. In Vercel dashboard, go to: **Project → Settings → Environment Variables**
2. Add the following variables for **Production** environment:

**Required Production Variables:**

```bash
# App URL (IMPORTANT: Use your Vercel URL)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Stacks Network
NEXT_PUBLIC_STACKS_NETWORK=testnet
NETWORK=testnet

# Wallet Providers (CRITICAL for Connect Wallet to work)
NEXT_PUBLIC_STACKS_WALLET_PROVIDERS=LeatherProvider,XverseProviders.BitcoinProvider

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# x402 Configuration
FACILITATOR_URL=https://facilitator.stacksx402.com
X402_DEFAULT_ASSET=STX
SBTC_CONTRACT_TESTNET=ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token

# Platform
NEXT_PUBLIC_PLATFORM_WALLET=ST2YTR47XFNCEC1VHF7T38ZSBTG6B7VYP8VH882H5
NEXT_PUBLIC_ENABLE_LISTING_FEE=false
PLATFORM_WALLET=ST2YTR47XFNCEC1VHF7T38ZSBTG6B7VYP8VH882H5
```

3. Click "Save" for each variable
4. Make sure to set them for the **Production** environment (you can also set for Preview if needed)

#### 4. Deploy

1. Click "Deploy" in Vercel
2. Wait for the build to complete (~3-5 minutes)
3. Once deployed, click "Visit" to open your live app

#### 5. Update NEXT_PUBLIC_APP_URL

After first deployment:

1. Note your production URL (e.g., `https://prompt-hash-x402.vercel.app`)
2. Go back to **Settings → Environment Variables**
3. Update `NEXT_PUBLIC_APP_URL` to your production URL
4. Trigger a new deployment: **Deployments → [latest] → Redeploy**

#### 6. Verify Wallet Connection

1. Open your production URL
2. Install Leather or Xverse wallet (if not already installed)
3. Switch wallet to testnet
4. Click "Connect Wallet" - the wallet selection popup should appear
5. Approve connection in your wallet
6. Your wallet address should appear in the header

### Troubleshooting Vercel Deployment

**Problem: "Connect Wallet" doesn't show wallet popup**

- **Cause**: `NEXT_PUBLIC_STACKS_WALLET_PROVIDERS` not set in Vercel
- **Fix**: Add the variable in Vercel Settings → Environment Variables, then redeploy

**Problem: Wrong network (mainnet instead of testnet)**

- **Cause**: `NEXT_PUBLIC_STACKS_NETWORK` not set or set to wrong value
- **Fix**: Set to `testnet` (or `mainnet` if intentional), then redeploy

**Problem: Module factory error in console**

- **Cause**: Turbopack bundling issue (should be fixed with `transpilePackages` in `next.config.mjs`)
- **Fix**: Ensure you're using the latest code with the dynamic import fix

**Problem: "Cannot connect to database" errors**

- **Cause**: Missing or incorrect Supabase credentials
- **Fix**: Double-check `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`

### Environment Variable Differences: Local vs. Vercel

| Variable | Local (.env) | Vercel (Production) |
|----------|--------------|---------------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://your-app.vercel.app` |
| `NODE_ENV` | `development` | `production` (auto-set) |
| `PORT` | `3000` | Auto-assigned by Vercel |

All other variables should be the same, unless you're using different databases/networks for production.

## 🗄️ Supabase Setup

### Create Tables

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `supabase/migrations/20260210_marketplace.sql`
5. Paste into the query editor
6. Click **Run** to execute

This creates:
- `prompts` table (for prompt listings)
- `purchases` table (for purchase records)
- Indexes for performance
- Row Level Security (RLS) policies

### Row Level Security (RLS)

The migration sets up RLS so that:
- **Public**: Can read `id`, `title`, `description`, `image_url`, `category`, `price_base_units`, `currency`, `seller_wallet`, `is_listed` from `prompts`
- **Public**: Cannot read `paid_content` (premium content)
- **Sellers**: Can update their own prompts
- **API**: Service role key bypasses RLS for paid content delivery after x402 verification

### Verify Tables

After running the migration:

1. Go to **Table Editor** in Supabase
2. You should see `prompts` and `purchases` tables
3. Click on each table to verify columns

## 📡 API Documentation

### Public Endpoints

#### `GET /api/prompts`

Browse all listed prompts (metadata only).

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Prompt Title",
    "description": "Prompt description",
    "image_url": "https://...",
    "category": "Code Generation",
    "price_base_units": "1000000",
    "currency": "STX",
    "seller_wallet": "ST...",
    "is_listed": true
  }
]
```

#### `GET /api/prompts/:id`

Get single prompt metadata (public data only).

**Response:**
```json
{
  "id": "uuid",
  "title": "Prompt Title",
  "description": "Prompt description",
  "image_url": "https://...",
  "category": "Code Generation",
  "price_base_units": "1000000",
  "currency": "STX",
  "seller_wallet": "ST...",
  "is_listed": true
}
```

### Protected Endpoints

#### `POST /api/prompts`

Create a new prompt listing.

**Headers:**
- `x-wallet-address`: Seller's Stacks address (required)

**Request Body:**
```json
{
  "title": "My Awesome Prompt",
  "description": "Description of the prompt",
  "category": "Code Generation",
  "price_base_units": "1000000",
  "currency": "STX",
  "paid_content": "The actual premium prompt content...",
  "image_url": "https://...",
  "is_listed": true
}
```

**Response:**
```json
{
  "id": "uuid",
  "message": "Prompt created successfully"
}
```

#### `PATCH /api/prompts/:id`

Update an existing prompt (seller only).

**Headers:**
- `x-wallet-address`: Seller's Stacks address (required)

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "is_listed": false
}
```

#### `GET /api/prompts/:id/content`

Get premium content (x402-protected).

**First Request (Unpaid):**

Response: `402 Payment Required`

Headers:
```
payment-required: <x402-challenge>
```

**Second Request (With Payment):**

Headers:
- `payment-signature`: <signed-challenge>

Response: `200 OK`
```json
{
  "paid_content": "The actual premium prompt content..."
}
```

### x402 Payment Flow

```
1. Client: GET /api/prompts/:id/content
   ← Server: 402 Payment Required + payment-required header with challenge

2. Client: Sign challenge with wallet → Get payment signature

3. Client: GET /api/prompts/:id/content
          Header: payment-signature: <signature>
   ← Server: 200 OK + premium content

4. Server: Records purchase in database
```

## 💰 Wallet Integration

### Supported Wallets

- **Leather Wallet**: Chrome/Firefox extension for Stacks/Bitcoin
- **Xverse Wallet**: Chrome/Firefox/Mobile wallet for Stacks/Bitcoin

### Connect Wallet Flow

```typescript
import { useStacksWallet } from "@/components/stacks-wallet-provider";

function MyComponent() {
  const { connectWallet, address, connected } = useStacksWallet();

  const handleConnect = async () => {
    const walletAddress = await connectWallet();
    console.log("Connected:", walletAddress);
  };

  return (
    <div>
      {connected ? (
        <p>Connected: {address}</p>
      ) : (
        <button onClick={handleConnect}>Connect Wallet</button>
      )}
    </div>
  );
}
```

### Wallet Provider Configuration

The wallet provider is configured in `src/components/stacks-wallet-provider.tsx` and uses these environment variables:

- `NEXT_PUBLIC_STACKS_NETWORK`: Network to connect to (testnet/mainnet)
- `NEXT_PUBLIC_STACKS_WALLET_PROVIDERS`: Which wallet providers to allow

Supported provider IDs:
- `LeatherProvider`: Leather wallet
- `XverseProviders.BitcoinProvider`: Xverse wallet
- `WalletConnectProvider`: WalletConnect (requires project ID)

## 🐛 Troubleshooting

### Common Issues

#### Issue: "Connect Wallet" button does nothing

**Symptoms**: Clicking Connect Wallet shows no popup, no error in console

**Causes & Solutions:**

1. **Environment variables not set on Vercel**
   - Check: Vercel → Settings → Environment Variables
   - Ensure `NEXT_PUBLIC_STACKS_WALLET_PROVIDERS` is set
   - Redeploy after adding

2. **Wallet extension not installed**
   - Install [Leather](https://leather.io) or [Xverse](https://xverse.app)
   - Refresh page after installation

3. **Module loading error (check browser console)**
   - Look for "module factory is not available" error
   - Ensure `transpilePackages` is in `next.config.mjs`
   - Ensure dynamic import is used in `navigation.tsx`

#### Issue: "Wallet connection error" in console

**Symptoms**: Error message logged when clicking Connect Wallet

**Solutions:**

1. Check browser console for specific error
2. Verify wallet extension is unlocked
3. Check network settings in wallet (testnet vs mainnet)
4. Try disconnecting and reconnecting wallet in extension settings

#### Issue: Wrong network (mainnet instead of testnet)

**Cause**: `NEXT_PUBLIC_STACKS_NETWORK` environment variable

**Solution:**
- Local: Update `.env` file
- Vercel: Update environment variable and redeploy

#### Issue: Cannot purchase prompts (x402 failing)

**Symptoms**: 402 Payment Required but payment doesn't work

**Check:**

1. Wallet has sufficient STX balance (check with faucet for testnet)
2. `FACILITATOR_URL` is set correctly
3. Network consistency (all env vars using same network)
4. Browser console for x402-specific errors

#### Issue: Supabase errors

**Symptoms**: "Cannot connect to database" or similar errors

**Solutions:**

1. Verify Supabase URL and keys in environment variables
2. Check Supabase project is active (not paused)
3. Run migration script if tables don't exist
4. Check RLS policies are set up correctly

### Debug Mode

To enable verbose logging:

1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests
4. Look for:
   - 402 responses (payment required)
   - 401 responses (authentication)
   - 500 responses (server errors)

## 🔒 Security

### Environment Variable Safety

**NEVER commit to git:**
- `.env` files (included in `.gitignore`)
- Private keys
- Supabase service role keys
- API secrets

**Server-only variables:**
- `SUPABASE_SERVICE_ROLE_KEY`: Only used in API routes, never exposed to browser
- `SERVER_PRIVATE_KEY`: Only used in server-side x402 operations
- `CLIENT_PRIVATE_KEY`: For local testing only, never use in production

**Browser-exposed variables:**
- All `NEXT_PUBLIC_*` variables are inlined at build time and visible in browser
- Never put secrets in `NEXT_PUBLIC_*` variables

### Supabase Row Level Security

- Public users can only read listed prompt metadata
- Premium `paid_content` is hidden by RLS
- Only accessible after x402 payment verification
- Service role key bypasses RLS for authorized operations

### Wallet Security

- Private keys never leave the wallet extension
- All transactions require explicit user approval
- Payment signatures verify ownership without exposing keys

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Stacks Documentation](https://docs.stacks.co/)
- [@stacks/connect](https://github.com/hirosystems/connect)
- [Supabase Documentation](https://supabase.com/docs)
- [x402 Protocol](https://github.com/xverse-lab/x402-stacks)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review [GitHub Issues](https://github.com/your-username/prompt-hash-x402/issues)
3. Create a new issue with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Browser console errors
   - Environment (local/Vercel, testnet/mainnet)

---

**Built with ❤️ on Stacks blockchain**
