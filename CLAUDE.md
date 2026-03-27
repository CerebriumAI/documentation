# Mintlify documentation

## Working relationship

- You can push back on ideas-this can lead to better documentation. Cite sources and explain your reasoning when you do so
- ALWAYS ask for clarification rather than making assumptions
- NEVER lie, guess, or make up information

## Project context

- Format: MDX files with YAML frontmatter
- Config: docs.json for navigation, theme, settings
- Components: Mintlify components

## Content strategy

- Document just enough for user success - not too much, not too little
- Prioritize accuracy and usability of information
- Make content evergreen when possible
- Search for existing information before adding new content. Avoid duplication unless it is done for a strategic reason
- Check existing patterns for consistency
- Start by making the smallest reasonable changes

## docs.json

- Refer to the [docs.json schema](https://docs.cerebrium.ai/docs.json) when building the docs.json file and site navigation

## Frontmatter requirements for pages

- title: Clear, descriptive page title
- description: Concise summary for SEO/navigation

## Voice and tone

- Direct, matter-of-fact tone — write reference material, not a tutorial blog post
- Lead with imperative verbs: "Configure scaling in the TOML file" not "You can configure scaling by editing the TOML file"
- State facts declaratively: "Cerebrium uses container images to package apps" not "You'll notice that Cerebrium uses container images"
- Drop filler and hedging: "To use a custom domain, add a CNAME record" not "If you want to use a custom domain, you'll need to add a CNAME record"
- Use "you/your" only when it adds clarity — e.g. distinguishing the reader's action from system behavior
- Never use "we", "let's", "our", or "simply"

## Writing standards

- Prerequisites at start of procedural content
- Test all code examples before publishing
- Match style and formatting of existing pages
- Include both basic and advanced use cases
- Language tags on all code blocks
- Alt text on all images
- Relative paths for internal links

## Git workflow

- NEVER use --no-verify when committing
- Ask how to handle uncommitted changes before starting
- Create a new branch when no clear branch exists for changes
- Commit frequently throughout development
- NEVER skip or disable pre-commit hooks

## Do not

- Skip frontmatter on any MDX file
- Use absolute URLs for internal links
- Include untested code examples
- Make assumptions - always ask for clarification
