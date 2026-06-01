import { normalizePagePath, type PageContext } from './pageContext'

type PageProfile = {
  id: string
  match: (ctx: PageContext) => boolean
  welcome: [string, string, string]
  followUp: [string, string, string]
  welcomeHeading?: string
}

const DEFAULT_WELCOME: [string, string, string] = [
  'What does Srini do and where does he work?',
  'What projects is Srini most proud of?',
  "What's Srini's design philosophy?",
]

const DEFAULT_FOLLOW_UP: [string, string, string] = [
  'What does Srini focus on at Intuit?',
  "Tell me about Srini's design systems work",
  'How can I contact Srini?',
]

function pathKey(ctx: PageContext): string {
  return normalizePagePath(ctx.page_path)
}

function titleLower(ctx: PageContext): string {
  return (ctx.page_title || '').toLowerCase()
}

function pathOrTitle(ctx: PageContext, paths: string[], titleNeedles: string[]): boolean {
  const key = pathKey(ctx)
  const title = titleLower(ctx)
  if (paths.some((p) => key === p || (p.length > 3 && key.includes(p)))) return true
  return titleNeedles.some((n) => title.includes(n))
}

const PROFILES: PageProfile[] = [
  {
    id: 'google',
    match: (ctx) => pathOrTitle(ctx, ['google'], ['google', 'ad manager']),
    welcome: [
      'What did Srini build for Google Ad Manager?',
      'How did Srini approach this design system?',
      'What was the impact of this component library?',
    ],
    followUp: [
      'Which components were hardest to standardize?',
      'How did Srini work with engineers on this system?',
      'What should I explore next in Srini\'s portfolio?',
    ],
    welcomeHeading: 'Ask about Srini\'s Google design system work',
  },
  {
    id: 'holachef',
    match: (ctx) => pathOrTitle(ctx, ['holachef'], ['holachef', 'food ordering']),
    welcome: [
      'What was the Holachef product ecosystem?',
      'What design challenges did Srini solve here?',
      'How did Srini design for multiple Holachef apps?',
    ],
    followUp: [
      'What was Srini\'s role in the Holachef MVP?',
      'How did Srini balance speed and craft on this project?',
      'What other FoodTech work has Srini done?',
    ],
    welcomeHeading: 'Ask about Srini\'s Holachef work',
  },
  {
    id: 'zoho',
    match: (ctx) => pathOrTitle(ctx, ['zoho sheet', 'zoho-sheet'], ['zoho sheet', 'spreadsheet']),
    welcome: [
      'What did Srini design for Zoho Sheet?',
      'How did Srini approach mobile spreadsheet UX?',
      'What features did Srini ship on iOS and Android?',
    ],
    followUp: [
      'Tell me about the smart bar and custom keyboard ideas',
      'What did Srini learn designing at spreadsheet scale?',
      'How does this project compare to Srini\'s later work?',
    ],
    welcomeHeading: 'Ask about Srini\'s Zoho Sheet work',
  },
  {
    id: 'intuit',
    match: (ctx) => pathOrTitle(ctx, ['intuit'], ['intuit assist', 'genai']),
    welcome: [
      'What is Srini designing at Intuit?',
      'How does Srini approach GenAI developer experiences?',
      'What problems does Intuit Assist solve for developers?',
    ],
    followUp: [
      'Tell me about Srini\'s API platform design work',
      'How does Srini design for developer workflows?',
      'What else has Srini built at Intuit?',
    ],
    welcomeHeading: 'Ask about Srini\'s Intuit and GenAI work',
  },
  {
    id: 'api',
    match: (ctx) => pathOrTitle(ctx, ['api-case-study-plain', 'api'], ['api experience', 'developer platform']),
    welcome: [
      'What API platform work did Srini lead?',
      'How did Srini design developer portal experiences?',
      'What makes Srini\'s API design approach distinctive?',
    ],
    followUp: [
      'How did Srini simplify complex developer workflows?',
      'Tell me about integration tools Srini designed',
      'How does this connect to Intuit Assist?',
    ],
    welcomeHeading: 'Ask about Srini\'s API platform work',
  },
  {
    id: 'norton',
    match: (ctx) => pathOrTitle(ctx, ['norton'], ['norton', 'spam protection', '360']),
    welcome: [
      'What did Srini design at Norton?',
      'Tell me about the Norton 360 design system',
      'How did Srini approach spam protection UX?',
    ],
    followUp: [
      'How did Srini build a white-label iOS design system?',
      'What security UX patterns did Srini establish?',
      'What should I read next about Srini\'s work?',
    ],
    welcomeHeading: 'Ask about Srini\'s Norton work',
  },
  {
    id: 'zeta',
    match: (ctx) => pathOrTitle(ctx, ['zeta'], ['zeta', 'tax benefits']),
    welcome: [
      'What was the Zeta project about?',
      'What UX problems did Srini solve for employee tax benefits?',
      'What was Srini\'s end-to-end role on Zeta?',
    ],
    followUp: [
      'How did Srini design for digitizing tax benefits?',
      'What did Srini learn from this fintech project?',
      'What other startup work has Srini done?',
    ],
    welcomeHeading: 'Ask about Srini\'s Zeta project',
  },
  {
    id: 'about',
    match: (ctx) => pathOrTitle(ctx, ['about'], ['about me', 'about srini']),
    welcome: [
      'Tell me about Srini\'s background and journey',
      'What kind of designer is Srini?',
      'Where is Srini based and what does he enjoy outside work?',
    ],
    followUp: [
      'What companies has Srini worked at?',
      'What is Srini\'s design philosophy?',
      'How can I get in touch with Srini?',
    ],
    welcomeHeading: 'Ask about Srini\'s background',
  },
  {
    id: 'home',
    match: (ctx) => {
      const key = pathKey(ctx)
      return !key || key === 'index' || key === 'index-experiments'
    },
    welcome: DEFAULT_WELCOME,
    followUp: DEFAULT_FOLLOW_UP,
  },
]

function findProfile(ctx: PageContext): PageProfile | undefined {
  return PROFILES.find((p) => p.match(ctx))
}

export function hasPageProfile(ctx: PageContext): boolean {
  const profile = findProfile(ctx)
  return !!profile && profile.id !== 'home'
}

export function getWelcomeSuggestions(ctx: PageContext): string[] {
  const profile = findProfile(ctx)
  if (profile && profile.id !== 'home') {
    return [profile.welcome[0], DEFAULT_WELCOME[1], DEFAULT_WELCOME[2]]
  }
  return [...DEFAULT_WELCOME]
}

export function getFollowUpSuggestions(ctx: PageContext): string[] {
  const profile = findProfile(ctx)
  return [...(profile?.followUp ?? DEFAULT_FOLLOW_UP)]
}

export function getWelcomeHeading(ctx: PageContext): string {
  void ctx
  const h = new Date().getHours()
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return `${part}, what would you like to know about Srini?`
}

export function resolveSuggestions(apiSuggestions: string[], ctx: PageContext): string[] {
  if (hasPageProfile(ctx)) return getFollowUpSuggestions(ctx)
  if (apiSuggestions.length > 0) return apiSuggestions.slice(0, 3)
  return getFollowUpSuggestions(ctx)
}
