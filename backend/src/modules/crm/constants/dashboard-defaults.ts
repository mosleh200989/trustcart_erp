/**
 * Default call scripts and training role-play content (Bangla).
 * These serve as fallback values when no saved configuration exists in the dashboard_configs table.
 * Team Leaders can override these via the Edit buttons on the dashboard UI.
 */

export const DEFAULT_SCRIPTS = {
  commonOpening: {
    title: 'Common Call Opening (সব কলের শুরুতে)',
    lines: [
      'আসসালামু আলাইকুম। আমি TrustCart Organic Grocery থেকে বলছি।',
      'আমি কি [Customer Name] ভাই/আপু কথা বলছি?',
      '(Yes হলে) ধন্যবাদ। ১ মিনিট সময় দিলে ভালো লাগবে।',
    ],
  },
  A: {
    title: '1) New Customer (১ম অর্ডার)',
    goal: 'Trust build + 2nd order',
    style: ['Friendly', 'Educative', 'No pressure'],
    script: [
      'আপনি সম্প্রতি আমাদের থেকে [Product Name] নিয়েছিলেন।',
      'জানতে চাইছিলাম—প্রোডাক্টের কোয়ালিটি কেমন লেগেছে?',
      '(Positive হলে) আলহামদুলিল্লাহ। আমরা খাঁটি অর্গানিক প্রোডাক্ট নিয়ে কাজ করি, যেন বাজারের ভেজাল থেকে পরিবারকে নিরাপদ রাখা যায়।',
      'আপনি যেহেতু নতুন কাস্টমার, আপনার জন্য একটা ছোট বিশেষ ছাড় চালু আছে। চাইলে আজই আবার অর্ডার করতে পারেন।',
    ],
  },
  B: {
    title: '2) Second-Time Customer (২য় অর্ডার)',
    goal: 'Habit build + reminder',
    style: ['Solution based', 'Consumption reminder'],
    script: [
      'আপনি গতবার [Product + Quantity] নিয়েছিলেন। সাধারণত এই পরিমাণে প্রায় [X] দিন ব্যবহার হয়।',
      'তাই ভাবলাম সময়মতো মনে করিয়ে দেই, যেন হঠাৎ শেষ হয়ে না যায়।',
      'এই প্রোডাক্টের সাথে অনেক কাস্টমার [Related Product] নিচ্ছেন। চাইলে আপনাকে কম্বো অফার দিতে পারি।',
    ],
  },
  C: {
    title: '3) Third-Time Customer (৩য় অর্ডার)',
    goal: 'Loyalty entry + membership intro',
    style: ['Benefit driven', 'Membership intro'],
    script: [
      'আপনি আমাদের নিয়মিত কাস্টমার হয়ে যাচ্ছেন, এজন্য আপনাকে ধন্যবাদ।',
      'আমরা এমন কাস্টমারদের জন্য Membership সুবিধা দেই।',
      'মেম্বার হলে নিয়মিত ডিসকাউন্ট, বিশেষ অফার আর অগ্রাধিকার ডেলিভারি পাবেন।',
      'আজকের অর্ডারের সাথে এই সুবিধাটা নিতে চান?',
    ],
  },
  D: {
    title: '4) Regular / Medium Customer',
    goal: 'Upsell + combo',
    style: ['Value comparison', 'Combo offer'],
    script: [
      'আপনি নিয়মিত আমাদের থেকে কেনাকাটা করেন, এজন্য আমরা আপনাকে আলাদা করে গুরুত্ব দেই।',
      'বাজারে যেসব পণ্যে ভেজাল বেশি, আমরা সেগুলো নিয়েই বেশি কাজ করছি।',
      'এই মাসে আপনার জন্য একটা Save More Combo আছে। একসাথে নিলে খরচ কম পড়বে।',
    ],
  },
  E: {
    title: '5) VIP / Permanent Customer',
    goal: 'Retention + exclusivity',
    style: ['Respectful', 'Exclusive'],
    script: [
      'আপনি আমাদের প্রিমিয়াম কাস্টমার, এজন্য ধন্যবাদ। এই অফারটা সাধারণ কাস্টমারের জন্য না।',
      'আপনার জন্য আমরা Early Access দিচ্ছি নতুন প্রোডাক্টে।',
      'আপনি চাইলে আজকেই অর্ডার কনফার্ম করে রাখছি।',
    ],
  },
  winBack: {
    title: '6) Inactive / Lost Customer (Win-back)',
    goal: 'Re-engage',
    style: ['Empathy', 'Service recovery', 'Win-back offer'],
    script: [
      'কিছুদিন ধরে আপনার কোনো অর্ডার পাইনি। ভাবলাম খোঁজ নিই—কোনো সমস্যা হয়েছিল কি?',
      'আমরা চাই আপনি ভালো সার্ভিস পান।',
      'এই সপ্তাহে আপনার জন্য একটা Comeback Discount আছে। চাইলে আজকেই অর্ডার করতে পারেন।',
    ],
  },
  permanentDeclaration: {
    title: '7) Permanent Customer Declaration Call',
    goal: 'Celebrate + retention lock-in',
    style: ['Celebratory', 'Respectful', 'Emotional close'],
    script: [
      'অভিনন্দন! আপনি এখন TrustCart Permanent Customer।',
      'এর মানে আপনি আজীবন বিশেষ ছাড়, প্রাইওরিটি ডেলিভারি আর এক্সক্লুসিভ অফার পাবেন।',
      'আমরা আপনাকে শুধু কাস্টমার না, পরিবারের একজন মনে করি।',
    ],
  },
  objectionHandling: {
    title: 'Objection Handling (কমন আপত্তি)',
    items: [
      {
        objection: 'দাম বেশি',
        reply: 'বুঝতে পারছি। তবে আমরা ভেজালমুক্ত অর্গানিক দেই—লং টার্মে এটা আসলে সাশ্রয়ী।',
      },
      {
        objection: 'পরে নিব',
        reply: 'সমস্যা নেই। আমি আপনার জন্য রিমাইন্ডার সেট করে দিচ্ছি।',
      },
    ],
  },
  callEnding: {
    title: 'Call Ending (সব কলের শেষে)',
    lines: [
      'ধন্যবাদ আপনার সময় দেওয়ার জন্য।',
      'কোনো প্রশ্ন থাকলে যেকোনো সময় TrustCart-এ কল করতে পারেন।',
    ],
  },
  universal: {
    title: 'Universal Call Flow (AIDA)',
    flow: ['Relationship opener', 'Need/usage reminder', 'Problem awareness', 'Solution offer', 'Soft close'],
  },
};

export const DEFAULT_TRAINING_ROLE_PLAYS = {
  title: 'Agent Training – Role Play Scripts (Bangla)',
  format: 'Trainer (TL) + Agent + Customer',
  rolePlays: [
    {
      id: 'RP1',
      title: 'ROLE PLAY–1 : New Customer (1st Order)',
      trainingGoal: ['কাস্টমারকে চাপ না দেওয়া', 'Trust build করা', '2nd order-এর দরজা খোলা'],
      script: [
        { speaker: 'TL (Customer)', line: 'হ্যালো, কে বলছেন?' },
        {
          speaker: 'Agent',
          line: 'আসসালামু আলাইকুম। আমি TrustCart Organic Grocery থেকে বলছি। আমি কি মোহাম্মদ রাশেদ ভাইয়ের সাথে কথা বলছি?',
        },
        { speaker: 'TL (Customer)', line: 'হ্যাঁ, বলুন।' },
        { speaker: 'Agent', line: 'আপনি সম্প্রতি আমাদের থেকে অর্গানিক চাল নিয়েছিলেন। জানতে চাইছিলাম—কোয়ালিটি কেমন লেগেছে?' },
        { speaker: 'TL (Customer)', line: 'ভালোই ছিল।' },
        {
          speaker: 'Agent (Correct Tone)',
          line: 'আলহামদুলিল্লাহ। আমরা খাঁটি পণ্য দেওয়ার চেষ্টা করি, যেন পরিবার নিরাপদ থাকে।',
        },
        {
          speaker: 'Agent',
          line: 'আপনি যেহেতু নতুন কাস্টমার, আপনার জন্য একটা ছোট ডিসকাউন্ট আছে। চাইলে আমি ডিটেইলস জানাতে পারি।',
        },
      ],
      notes: ['❌ এখনই দাম বা অর্ডার চাপ দিবে না'],
    },
    {
      id: 'RP2',
      title: 'ROLE PLAY–2 : Second-Time Customer (Reminder Call)',
      trainingGoal: ['Natural reminder', 'Helpful tone'],
      script: [
        { speaker: 'TL (Customer)', line: 'হ্যালো।' },
        { speaker: 'Agent', line: 'আপনি গতবার ৫ কেজি চাল নিয়েছিলেন। সাধারণত এই পরিমাণে প্রায় ২৫–৩০ দিন ব্যবহার হয়।' },
        { speaker: 'TL (Customer)', line: 'হ্যাঁ।' },
        { speaker: 'Agent', line: 'তাই সময়মতো মনে করিয়ে দিচ্ছি, যেন হঠাৎ শেষ হয়ে না যায়।' },
        { speaker: 'Agent', line: 'এই চালের সাথে অনেকেই তেল নিচ্ছেন। চাইলে কম্বো অফার দিতে পারি।' },
      ],
      notes: ['✔️ "মনে করিয়ে দিচ্ছি" — এটা কাস্টমার পছন্দ করে'],
    },
    {
      id: 'RP3',
      title: 'ROLE PLAY–3 : Third-Time Customer (Membership Intro)',
      trainingGoal: ['কাস্টমারকে Special feel করানো', 'Membership explain করা'],
      script: [
        { speaker: 'TL (Customer)', line: 'আবার অর্ডার?' },
        { speaker: 'Agent', line: 'না না, আজ অর্ডারের জন্য চাপ দিচ্ছি না। আপনাকে শুধু জানাতে চাচ্ছি—আপনি এখন আমাদের রেগুলার কাস্টমার।' },
        { speaker: 'TL (Customer)', line: 'ও আচ্ছা।' },
        { speaker: 'Agent', line: 'এই পর্যায়ে আমরা Membership সুবিধা দেই—ডিসকাউন্ট, ফ্রি ডেলিভারি, আলাদা অফার।' },
        { speaker: 'Agent', line: 'আপনি চাইলে পরের অর্ডার থেকেই এই সুবিধা নিতে পারবেন।' },
      ],
      notes: ['❌ "আজই নিতেই হবে" বলা যাবে না'],
    },
    {
      id: 'RP4',
      title: 'ROLE PLAY–4 : Regular / Medium Customer (Upsell)',
      trainingGoal: ['Value based selling', 'Comparison without badmouthing market'],
      script: [
        { speaker: 'TL (Customer)', line: 'দাম একটু বেশি না?' },
        { speaker: 'Agent', line: 'বুঝতে পারছি। কিন্তু বাজারের অনেক পণ্যে ভেজাল থাকে—যা ধীরে ধীরে ক্ষতি করে।' },
        { speaker: 'TL (Customer)', line: 'হুম।' },
        { speaker: 'Agent', line: 'আমাদের প্রোডাক্ট লং টার্মে আসলে সাশ্রয়ী। এই মাসে আপনার জন্য একটা কম্বো আছে—নিলে দাম কম পড়বে।' },
      ],
    },
    {
      id: 'RP5',
      title: 'ROLE PLAY–5 : VIP / Permanent Customer',
      trainingGoal: ['Respect', 'Exclusivity', 'Relationship'],
      script: [
        { speaker: 'TL (Customer)', line: 'বলুন।' },
        { speaker: 'Agent', line: 'আপনি আমাদের প্রিমিয়াম কাস্টমার, এজন্য ধন্যবাদ। এই অফারটা সাধারণ কাস্টমারের জন্য না।' },
        { speaker: 'TL (Customer)', line: 'কী অফার?' },
        { speaker: 'Agent', line: 'নতুন অর্গানিক পণ্য এসেছে। আপনি চাইলে আগে এক্সেস পাবেন।' },
      ],
      notes: ['✔️ VIP কল = কম কথা, বেশি সম্মান'],
    },
    {
      id: 'RP6',
      title: 'ROLE PLAY–6 : Inactive Customer (Win Back)',
      trainingGoal: ['Blame না করা', 'Empathy'],
      script: [
        { speaker: 'TL (Customer)', line: 'এতদিন পর কেন কল?' },
        { speaker: 'Agent', line: 'আসলে বিক্রির জন্য না। আপনি ভালো আছেন কিনা, সেটাই জানতে চাচ্ছি।' },
        { speaker: 'TL (Customer)', line: 'ব্যস্ত ছিলাম।' },
        { speaker: 'Agent', line: 'বুঝতে পারছি। এই সপ্তাহে আপনার জন্য একটা comeback ডিসকাউন্ট আছে—চাইলে জানাবো।' },
      ],
    },
  ],
  commonMistakes: ['জোর করে অর্ডার নেওয়া', 'বেশি কথা বলা', 'দাম নিয়ে তর্ক', '"আজই শেষ" বলে ভয় দেখানো'],
  goldenRules: ['আগে সম্পর্ক, পরে বিক্রি', 'কাস্টমারের সমস্যা বলাতে দাও', 'নিজের মতামত চাপিও না', 'CRM নোট অবশ্যই আপডেট করো'],
};
