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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


this is my mini context of my project and these are code directories 

RULES: ALWAYS ASK DOUBT IF ANY,DONT RUSH TO GIVE CODE, ALWAYS ASK CODE FILES FIRST TO UNDERSTAND THE CODE FUNCTIONALITY THEN ADD THE NEW FEATURES WITHOUT AFFECTING THE EXISTING FETAURES ( tHIS IS MOST IMPORTANT OKAY). And do think like a CTO just dont blindly follow my instructions and scalability,so shall i proceed with my problem statement?

npx tsc --noEmit   
// for code error finding

Get-ChildItem -Path .\src -Recurse | Select-Object FullName > src_structure.txt  


PS C:\Users\ajkr9\OneDrive\Desktop\exam-platform-clean> npx ts-node --project tsconfig.scripts.json src/scripts/backfill-content-hashes.ts
═══════════════════════════════════════════
  Content Hash Backfill — Starting
═══════════════════════════════════════════
📊 Found 4920 questions needing hash computation
📦 Processing in batches of 100

Processing batch 1 (100 questions)...
  ✓ Batch done — 100/4920 (2%) | Hashed: 100 | Skipped: 0 | Failed: 0
Processing batch 2 (100 questions)...
  ✓ Batch done — 200/4920 (4%) | Hashed: 200 | Skipped: 0 | Failed: 0
Processing batch 3 (100 questions)...
  ✓ Batch done — 300/4920 (6%) | Hashed: 297 | Skipped: 3 | Failed: 0
Processing batch 4 (100 questions)...
  ✓ Batch done — 400/4920 (8%) | Hashed: 397 | Skipped: 3 | Failed: 0
Processing batch 5 (100 questions)...
  ✓ Batch done — 500/4920 (10%) | Hashed: 497 | Skipped: 3 | Failed: 0
Processing batch 6 (100 questions)...
  ✓ Batch done — 600/4920 (12%) | Hashed: 597 | Skipped: 3 | Failed: 0
Processing batch 7 (100 questions)...
  ✓ Batch done — 700/4920 (14%) | Hashed: 697 | Skipped: 3 | Failed: 0
Processing batch 8 (100 questions)...
  ✓ Batch done — 800/4920 (16%) | Hashed: 797 | Skipped: 3 | Failed: 0
Processing batch 9 (100 questions)...
  ✓ Batch done — 900/4920 (18%) | Hashed: 897 | Skipped: 3 | Failed: 0
Processing batch 10 (100 questions)...
  ✓ Batch done — 1000/4920 (20%) | Hashed: 997 | Skipped: 3 | Failed: 0
Processing batch 11 (100 questions)...
  ✓ Batch done — 1100/4920 (22%) | Hashed: 1097 | Skipped: 3 | Failed: 0
Processing batch 12 (100 questions)...
  ✓ Batch done — 1200/4920 (24%) | Hashed: 1197 | Skipped: 3 | Failed: 0
Processing batch 13 (100 questions)...
  ✓ Batch done — 1300/4920 (26%) | Hashed: 1297 | Skipped: 3 | Failed: 0
Processing batch 14 (100 questions)...
  ✓ Batch done — 1400/4920 (28%) | Hashed: 1397 | Skipped: 3 | Failed: 0
Processing batch 15 (100 questions)...
  ✓ Batch done — 1500/4920 (30%) | Hashed: 1497 | Skipped: 3 | Failed: 0
Processing batch 16 (100 questions)...
  ✓ Batch done — 1600/4920 (33%) | Hashed: 1597 | Skipped: 3 | Failed: 0
Processing batch 17 (100 questions)...
  ✓ Batch done — 1700/4920 (35%) | Hashed: 1697 | Skipped: 3 | Failed: 0
Processing batch 18 (100 questions)...
  ✓ Batch done — 1800/4920 (37%) | Hashed: 1797 | Skipped: 3 | Failed: 0
Processing batch 19 (100 questions)...
  ✓ Batch done — 1900/4920 (39%) | Hashed: 1897 | Skipped: 3 | Failed: 0
Processing batch 20 (100 questions)...
  ✓ Batch done — 2000/4920 (41%) | Hashed: 1997 | Skipped: 3 | Failed: 0
Processing batch 21 (100 questions)...
  ✓ Batch done — 2100/4920 (43%) | Hashed: 2096 | Skipped: 4 | Failed: 0
Processing batch 22 (100 questions)...
  ✓ Batch done — 2200/4920 (45%) | Hashed: 2192 | Skipped: 8 | Failed: 0
Processing batch 23 (100 questions)...
  ✓ Batch done — 2300/4920 (47%) | Hashed: 2291 | Skipped: 9 | Failed: 0
Processing batch 24 (100 questions)...
  ✓ Batch done — 2400/4920 (49%) | Hashed: 2384 | Skipped: 16 | Failed: 0
Processing batch 25 (100 questions)...
  ✓ Batch done — 2500/4920 (51%) | Hashed: 2484 | Skipped: 16 | Failed: 0

═══════════════════════════════════════════
  Backfill Complete
═══════════════════════════════════════════
  Total processed : 2500
  Hashed          : 2484
  Skipped (images): 16
  Failed          : 0

✅ All questions backfilled successfully.
PS C:\Users\ajkr9\OneDrive\Desktop\exam-platform-clean> 