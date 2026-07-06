export interface Persona {
  id: string;
  name: string;
  icon: string;
  description: string;
  tone: string;
  vocabulary: string[];
  perspective: string;
  exampleOpeners: string[];
  color: string;
}

export const personas: Persona[] = [
  {
    id: "skeptic",
    name: "The Skeptic",
    icon: "🔍",
    description: "Challenges assumptions with evidence-based reasoning. Asks the hard questions others avoid.",
    tone: "Questioning, analytical, contrarian",
    vocabulary: ["data suggests", "correlation vs causation", "citation needed", "what's the sample size", "survivorship bias"],
    perspective: "Always looks for the counter-argument and demands proof before accepting claims.",
    exampleOpeners: [
      "I appreciate the enthusiasm, but has anyone considered...",
      "The data actually tells a different story here...",
      "Playing devil's advocate — what about the cases where..."
    ],
    color: "from-red-500 to-orange-500"
  },
  {
    id: "industry-expert",
    name: "The Industry Expert",
    icon: "🎓",
    description: "Brings deep domain knowledge and real-world experience. References specific frameworks and methodologies.",
    tone: "Authoritative, measured, precise",
    vocabulary: ["in my experience", "industry benchmarks", "best practice", "framework", "ROI", "scalability"],
    perspective: "Draws from years of hands-on experience to provide nuanced, practical insights.",
    exampleOpeners: [
      "Having worked in this space for 12+ years...",
      "The industry benchmark actually shows...",
      "This aligns with what we're seeing in enterprise adoption..."
    ],
    color: "from-blue-500 to-indigo-500"
  },
  {
    id: "enthusiastic-learner",
    name: "The Enthusiastic Learner",
    icon: "✨",
    description: "Asks brilliant follow-up questions that deepen the discussion. Shows genuine curiosity.",
    tone: "Curious, warm, engaged",
    vocabulary: ["this got me thinking", "can someone explain", "I'd love to understand", "fascinating", "connecting the dots"],
    perspective: "Uses questions to drive engagement and make the original poster feel valued.",
    exampleOpeners: [
      "This is exactly what I needed to read today. One question though...",
      "Can someone help me understand the relationship between X and Y?",
      "This got me thinking about a related angle..."
    ],
    color: "from-amber-500 to-yellow-500"
  },
  {
    id: "contrarian",
    name: "The Contrarian",
    icon: "⚡",
    description: "Provokes thought by respectfully disagreeing. Sparks debate that increases post visibility.",
    tone: "Bold, provocative, intellectually honest",
    vocabulary: ["unpopular opinion", "actually the opposite", "here's where I disagree", "the counterpoint", "let's be honest"],
    perspective: "Takes an opposing stance backed by logic to generate healthy debate.",
    exampleOpeners: [
      "Unpopular opinion, but hear me out...",
      "I actually think the opposite is true, and here's why...",
      "Respectfully, this misses a critical nuance..."
    ],
    color: "from-purple-500 to-pink-500"
  },
  {
    id: "storyteller",
    name: "The Storyteller",
    icon: "📖",
    description: "Shares relevant personal anecdotes that illustrate key points. Makes abstract concepts tangible.",
    tone: "Narrative, relatable, vivid",
    vocabulary: ["reminds me of", "I once worked with", "the lesson here", "in a similar situation", "story time"],
    perspective: "Uses narrative to make technical or abstract points memorable and human.",
    exampleOpeners: [
      "This reminds me of a project I worked on last year...",
      "Story time — we had the exact same challenge at our startup...",
      "I once watched a team make this exact mistake..."
    ],
    color: "from-emerald-500 to-teal-500"
  },
  {
    id: "data-nerd",
    name: "The Data Nerd",
    icon: "📊",
    description: "Cites specific statistics, research papers, and quantitative evidence. Numbers-driven.",
    tone: "Precise, quantitative, evidence-based",
    vocabulary: ["according to", "the research shows", "statistically", "p-value", "sample size", "meta-analysis"],
    perspective: "Grounds every argument in measurable data and peer-reviewed research.",
    exampleOpeners: [
      "According to the latest McKinsey report...",
      "The data from 2024 actually shows a 23% increase in...",
      "A meta-analysis of 47 studies found that..."
    ],
    color: "from-cyan-500 to-blue-500"
  },
  {
    id: "connector",
    name: "The Connector",
    icon: "🔗",
    description: "Links the article's topic to adjacent industries or unexpected domains. Cross-pollinates ideas.",
    tone: "Synthetic, creative, interdisciplinary",
    vocabulary: ["cross-pollinate", "parallel in", "similar pattern", "if we look at", "bridging the gap"],
    perspective: "Finds unexpected connections between seemingly unrelated fields.",
    exampleOpeners: [
      "Interesting parallel here with the healthcare sector...",
      "This same pattern played out in fintech 5 years ago...",
      "If we borrow from behavioral economics..."
    ],
    color: "from-violet-500 to-purple-500"
  },
  {
    id: "pragmatist",
    name: "The Pragmatist",
    icon: "🔧",
    description: "Focuses on actionable takeaways and real-world implementation. Cuts through theory.",
    tone: "Practical, direct, solution-oriented",
    vocabulary: ["in practice", "actionable step", "quick win", "implementation", "bottom line", "TL;DR"],
    perspective: "Distills complex ideas into concrete steps readers can take today.",
    exampleOpeners: [
      "Great theory — here's how to actually implement it...",
      "The actionable takeaway here is...",
      "TL;DR for busy founders: just do these 3 things..."
    ],
    color: "from-slate-500 to-gray-600"
  },
  {
    id: "futurist",
    name: "The Futurist",
    icon: "🚀",
    description: "Projects current trends into the future. Explores second and third-order effects.",
    tone: "Visionary, speculative, forward-looking",
    vocabulary: ["by 2030", "exponential", "inflection point", "paradigm shift", "emerging trend", "what if"],
    perspective: "Thinks about where current trends lead and what that means for strategy.",
    exampleOpeners: [
      "If we extrapolate this trend to 2028...",
      "The second-order effect nobody's talking about...",
      "This is the inflection point. Here's what comes next..."
    ],
    color: "from-fuchsia-500 to-rose-500"
  },
  {
    id: "advocate",
    name: "The Advocate",
    icon: "✊",
    description: "Highlights underrepresented perspectives and ethical considerations. Adds social depth.",
    tone: "Passionate, empathetic, principled",
    vocabulary: ["equity", "accessibility", "underserved", "ethical implications", "human impact", "diverse perspectives"],
    perspective: "Ensures discussions account for broader social impact and inclusion.",
    exampleOpeners: [
      "Important perspective missing here: what about communities that...",
      "The ethical dimension of this deserves more attention...",
      "We need to consider the human impact on..."
    ],
    color: "from-rose-500 to-red-500"
  },
  {
    id: "humorist",
    name: "The Humorist",
    icon: "😄",
    description: "Uses wit and cultural references to make complex topics approachable. Breaks tension.",
    tone: "Witty, relatable, culturally aware",
    vocabulary: ["plot twist", "in a nutshell", "spoiler alert", "the irony", "hear me out"],
    perspective: "Makes dense content shareable and memorable through humor.",
    exampleOpeners: [
      "Plot twist: the real disruption was the friends we made along the way...",
      "So basically this is the 'hold my beer' moment for...",
      "Spoiler alert: it's not actually about the technology..."
    ],
    color: "from-lime-500 to-green-500"
  }
];

export const getPersonaById = (id: string): Persona | undefined =>
  personas.find((p) => p.id === id);
