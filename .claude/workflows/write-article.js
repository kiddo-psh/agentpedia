export const meta = {
  name: 'write-article',
  description: 'Research, write, review and revise Agentpedia draft articles with independent agents',
  whenToUse: 'Writing new articles or rewriting existing drafts to docs/writing-guide.md. args: [{ slug, topic, category, mode?, people?, sources? }]',
  phases: [
    { title: 'Research', detail: 'one researcher per article: primary sources, dates, quotes, people, licensed photos' },
    { title: 'People', detail: 'one agent registers new people in content/people.yaml (shared file)' },
    { title: 'Write', detail: 'one writer per article directory' },
    { title: 'Review', detail: 'three reviewers per article: facts, story, kit' },
    { title: 'Revise', detail: 'apply fixes until every score is 4+ (max 2 rounds)' },
  ],
}

// args: [{ slug, topic, category: 'people'|'trends'|'startup'|'security', mode?: 'new'|'revise', people?: string[], sources?: string[] }]
const items = (Array.isArray(args) ? args : [args]).filter(Boolean)
if (items.length === 0) throw new Error('args must be a list of { slug, topic, category }')

const MAX_ROUNDS = 2

const SHARED_RULES = `
Project: Agentpedia (Next.js). Read docs/writing-guide.md and docs/review-rubric.md first; they are the standard.
Rules for every agent in this workflow:
- Never commit, push, or run git commands that change history. The orchestrator reviews and commits.
- Never download files. Record image URLs only.
- Never invent facts, dates, or quotes. If you cannot verify something from the source itself, say so and leave it out.
- Write Korean article text in 합니다체.`

const SOURCE = {
  type: 'object',
  properties: {
    id: { type: 'string' }, title: { type: 'string' }, url: { type: 'string' }, author: { type: 'string' },
    kind: { type: 'string', enum: ['video', 'podcast', 'talk', 'blog', 'paper', 'thread'] },
    publishedAt: { type: 'string', description: 'YYYY-MM-DD as read on the source page' },
    dateVerified: { type: 'boolean', description: 'true only if the date was read on the source itself' },
    dateNote: { type: 'string' },
    primary: { type: 'boolean', description: 'false for summaries/reports about the original' },
  },
  required: ['id', 'title', 'url', 'author', 'kind', 'publishedAt', 'dateVerified', 'primary'],
}

const RESEARCH = {
  type: 'object',
  properties: {
    sources: { type: 'array', items: SOURCE },
    claims: {
      type: 'array',
      items: {
        type: 'object',
        properties: { claim: { type: 'string' }, sourceId: { type: 'string' }, where: { type: 'string', description: 'section, paragraph or timestamp' } },
        required: ['claim', 'sourceId', 'where'],
      },
    },
    quotes: {
      type: 'array',
      description: 'Only quotes whose exact wording you read in the source (transcript or text).',
      items: {
        type: 'object',
        properties: { text: { type: 'string' }, sourceId: { type: 'string' }, at: { type: 'string', description: 'mm:ss for video/podcast/talk' } },
        required: ['text', 'sourceId'],
      },
    },
    people: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' }, name: { type: 'string' }, nameKo: { type: 'string' }, role: { type: 'string' },
          photo: {
            type: 'object',
            description: 'Omit unless the license was confirmed on the Wikimedia Commons file page (or equivalent).',
            properties: { url: { type: 'string' }, credit: { type: 'string' }, license: { type: 'string' }, sourceUrl: { type: 'string' } },
            required: ['url', 'credit', 'license', 'sourceUrl'],
          },
        },
        required: ['id', 'name', 'nameKo', 'role'],
      },
    },
    storyAngle: { type: 'string', description: 'The scene to open with and the tension the article resolves' },
    gaps: { type: 'array', items: { type: 'string' }, description: 'What could not be verified' },
  },
  required: ['sources', 'claims', 'quotes', 'people', 'storyAngle', 'gaps'],
}

const REVIEW = {
  type: 'object',
  properties: {
    scores: { type: 'object', additionalProperties: { type: 'integer', minimum: 1, maximum: 5 } },
    blocking: { type: 'array', items: { type: 'string' } },
    fixes: {
      type: 'array',
      items: {
        type: 'object',
        properties: { where: { type: 'string' }, problem: { type: 'string' }, suggestion: { type: 'string' } },
        required: ['where', 'problem', 'suggestion'],
      },
    },
  },
  required: ['scores', 'blocking', 'fixes'],
}

const REVIEWERS = [
  {
    key: 'facts',
    rubric: 'A (facts) and E (people/images)',
    lens: 'You are a skeptical fact-checker. Open every source URL yourself. Check each claim, date, quote wording and timestamp against the source, and verify every photo license on its file page. Treat anything you cannot confirm as a problem.',
  },
  {
    key: 'story',
    rubric: 'B (story/readability) and C (timing clarity)',
    lens: 'You are a demanding Korean magazine editor. Judge whether the piece opens with a scene, builds tension, reads as one flow, states when things were said, and avoids hype and translationese.',
  },
  {
    key: 'kit',
    rubric: 'D (kit clarity and safety)',
    lens: 'You are a cautious senior engineer about to run this kit on your own repo. Check that frontmatter apply.goal/changes/doesNotDo match kit/prompt.md and kit/checklist.md exactly, that the prompt stops when unfit, asks for approval before changes, verifies by running commands, and actually implements this article\'s idea.',
  },
]

const label = (it) => it.slug

// Phase 1: research every article in parallel (read-only).
phase('Research')
const research = await parallel(items.map((it) => () =>
  agent(`${SHARED_RULES}

Research for the article "${it.topic}" (slug: ${it.slug}, category: ${it.category}, mode: ${it.mode ?? 'new'}).
${it.mode === 'revise' ? `An existing draft is at content/articles/${it.slug}/. Re-verify everything in it.` : ''}
${it.sources?.length ? `Start from these sources: ${it.sources.join(', ')}` : 'Find the primary sources yourself (original talk, post, thread, paper).'}
${it.people?.length ? `People involved: ${it.people.join(', ')}` : ''}
Already registered people (do not re-research their roles unless wrong): see content/people.yaml.

Prefer primary sources. Read dates on the source page itself. Collect only quotes whose exact wording you saw.
For each person not yet in content/people.yaml, look for a photo on Wikimedia Commons and include it only if the file page shows a reuse license from: CC0, CC BY 2.0/3.0/4.0, CC BY-SA 2.0/3.0/4.0, Public domain. Use the upload.wikimedia.org image URL and the Commons file page as sourceUrl.`,
    { label: `research:${label(it)}`, phase: 'Research', schema: RESEARCH }),
))

// Phase 2: one agent edits the shared people registry (barrier: avoids concurrent edits of one file).
phase('People')
const newPeople = research.filter(Boolean).flatMap((r) => r.people)
if (newPeople.length > 0) {
  await agent(`${SHARED_RULES}

Update content/people.yaml with these people researched by other agents. Add entries whose id is missing; fix an existing entry only if the research shows its role is wrong. Keep existing entries and comments. Drop any photo whose license is not in the PHOTO_LICENSES list in src/content/schema.ts.
${JSON.stringify(newPeople, null, 2)}
Then run \`npm run validate:content\` (errors about articles that do not exist yet are fine; people.yaml errors are not) and report the ids now registered.`,
    { label: 'people-registry', phase: 'People' })
}

// Phases 3-5 per article, pipelined: write -> review panel -> revise loop.
const results = await pipeline(
  items.map((it, i) => ({ it, research: research[i] })),

  async ({ it, research: r }) => {
    if (!r) return { it, skipped: 'research failed' }
    await agent(`${SHARED_RULES}

${it.mode === 'revise' ? `Rewrite the existing draft in content/articles/${it.slug}/` : `Create content/articles/${it.slug}/`} following docs/writing-guide.md exactly:
index.mdx (frontmatter incl. apply, people ids, sources with dateNote where dateVerified is false, draft: true), kit/prompt.md, kit/checklist.md.
Look at content/articles/boris-cherny-claude-code-workflow/ for the file format, but write a far better story than it.
Use only these verified facts and quotes; anything not here must not appear:
${JSON.stringify(r, null, 2)}
Open with this angle: ${r.storyAngle}
Only <Quote> the quotes listed above, with their source id and at. Only use KeyIdea, Quote, TryIt, Compare, Steps.
Only edit files inside content/articles/${it.slug}/. Run \`npm run validate:content\` and fix until it passes for this article.`,
      { label: `write:${label(it)}`, phase: 'Write' })
    return { it, research: r }
  },

  async (state) => {
    if (state.skipped) return state
    const { it } = state
    let round = 0
    let reviews = []
    while (true) {
      reviews = (await parallel(REVIEWERS.map((rv) => () =>
        agent(`${SHARED_RULES}

${rv.lens}
Review content/articles/${it.slug}/ (index.mdx and kit/) against docs/review-rubric.md sections ${rv.rubric}.
Score only those sections, using keys from: facts, people, story, timing, kit. Do not edit any files.
Every fix must name the exact place and a concrete rewrite.`,
          { label: `review:${rv.key}:${label(it)}#${round}`, phase: 'Review', schema: REVIEW }),
      ))).filter(Boolean)

      const low = reviews.flatMap((rv) => Object.entries(rv.scores).filter(([, s]) => s < 4).map(([k, s]) => `${k}=${s}`))
      const blocking = reviews.flatMap((rv) => rv.blocking)
      if (low.length === 0 && blocking.length === 0) break
      if (round >= MAX_ROUNDS) {
        log(`${it.slug}: still below bar after ${MAX_ROUNDS} revisions (${[...low, ...blocking].join('; ')})`)
        break
      }
      round++
      await agent(`${SHARED_RULES}

Revise content/articles/${it.slug}/ to address these reviews. Blocking items first. If a fix needs a fact that is not verifiable, remove the claim instead of guessing.
${JSON.stringify(reviews, null, 2)}
Only edit files inside content/articles/${it.slug}/. Keep draft: true. Run \`npm run validate:content\` until it passes.`,
        { label: `revise:${label(it)}#${round}`, phase: 'Revise' })
    }
    return {
      slug: it.slug,
      rounds: round,
      scores: Object.assign({}, ...reviews.map((rv) => rv.scores)),
      blocking: reviews.flatMap((rv) => rv.blocking),
      openFixes: reviews.flatMap((rv) => rv.fixes).length,
      gaps: state.research.gaps,
    }
  },
)

return results
