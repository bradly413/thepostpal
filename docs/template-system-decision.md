# Template System Decision

## Decision

Keep templates code-backed through launch, then move to a database- and admin-managed system in the next phase.

## Why This Is The Right Call Now

The current code-backed approach in `src/lib/templates.ts` is still the fastest and safest way to ship the library while the product is changing quickly.

Right now we are still:

- expanding the cross-industry template catalog
- refining the template schema itself
- deciding how multi-location accounts should interact with templates
- defining approval workflow requirements
- proving which imported packs actually deserve promotion into the live library

A database-backed admin system is the right destination, but building it before the workflow and permission model settle would create more complexity than leverage.

## What Stays Code-Backed In This Phase

- live template definitions
- template field schema
- default copy and dimensions
- display grouping by pillar/category
- editor route behavior driven from template IDs

## What The Current Workflow Looks Like

1. source pack lives in the imported asset library
2. source pack is reviewed and shortlisted
3. normalization spec is written
4. app-ready template objects are created
5. approved templates are committed into `src/lib/templates.ts`
6. templates become immediately available in the library and editor

## Benefits Of Staying Here A Little Longer

- zero runtime migration risk
- easy review in source control
- predictable deploy behavior
- no admin UI to harden yet
- no new permission surface before multi-location and approvals are solved

## When To Migrate

Move to DB/admin-managed templates when at least three of these become true:

- more than ~75 live templates are active
- non-developers need to publish template changes regularly
- templates need account-level or location-level visibility rules
- templates need lifecycle state beyond “in code” vs “not in code”
- engagement/performance should automatically influence template promotion or retirement
- imported packs need in-product review rather than external normalization files

## Recommended Next-Phase Architecture

Phase 2 should introduce:

- `TemplateDefinition` for the live schema users can choose from
- `TemplateVariant` for aspect-ratio or vertical-specific variations
- `TemplatePromotion` for source-pack-to-live-library provenance
- template status such as `draft`, `review`, `live`, `retired`
- account/location scoping rules when multi-location launches

## Bottom Line

Do not rush the migration.

For launch, code-backed templates are a feature, not a flaw. They keep the system easy to reason about while the product is still defining its real library shape.
