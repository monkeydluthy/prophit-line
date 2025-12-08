This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

### Anthropic API Key (Optional)

To enable LLM-based market matching verification for improved accuracy:

1. **Get your API key:**
   - Go to [Anthropic Console](https://console.anthropic.com/)
   - Sign up or log in
   - Navigate to "API Keys" section
   - Create a new API key
   - Copy the key (starts with `sk-ant-...`)

2. **Add to your environment:**
   - Create a `.env.local` file in the root directory
   - Add: `ANTHROPIC_API_KEY=your_api_key_here`
   - Restart your dev server

**Note:** The app works without this key using rule-based matching only. LLM verification is only used for edge cases (scores 60-85%) to improve accuracy and reduce false positives.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
