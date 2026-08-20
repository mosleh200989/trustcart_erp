# TrustCart ERP documentation

Everything here describes how the system **is**. What someone *did* belongs in a
commit message or a pull request — see [Conventions](#conventions) below.

## Operations

Running the thing. Start here when something is on fire.

| Document | What it covers |
| --- | --- |
| [operations/deployment.md](operations/deployment.md) | The VPS, pm2 processes, how to deploy and roll back |
| [operations/migrations.md](operations/migrations.md) | Changing the database schema; the migration ledger |
| [operations/backups.md](operations/backups.md) | Nightly backups, pulling a copy locally, restoring |
| [operations/security.md](operations/security.md) | Rate limiting, security headers, CORS, and what is still missing |

## Modules

How each part of the product behaves.

**Sales and customers**
[orders](modules/orders.md) ·
[offers](modules/offers.md) ·
[deal of the day](modules/deal-of-the-day.md) ([admin](modules/deal-of-the-day-admin.md)) ·
[loyalty](modules/loyalty.md) ·
[wallet](modules/wallet.md) ·
[referral](modules/referral.md) ·
[tagging](modules/tagging.md)

**CRM and call centre**
[CRM overview](modules/crm.md) ·
[automation](modules/crm-automation.md) ·
[lead flow](modules/crm-lead-flow.md) ·
[lead management](modules/lead-management.md) ·
[tiers](modules/crm-tiers.md) ·
[commission](modules/commission.md) ·
[CDM](modules/cdm.md) ([user guide](modules/cdm-user-guide.md))

**Operations and staff**
[inventory](modules/inventory.md) ·
[recruitment](modules/recruitment.md) ·
[RBAC](modules/rbac.md) ·
[RBAC panels and roles](modules/rbac-panels-and-roles.md) ·
[permissions checklist](modules/permissions-checklist.md)

**Storefront**
[homepage](modules/homepage.md) ·
[landing pages](modules/landing-pages.md) ·
[blog](modules/blog.md) ·
[slugs](modules/slugs.md)

**Research**
[referral systems in Bangladesh](modules/referral-bd-research.md)

## Integrations

External systems and their contracts. Often the only record of how a third
party actually behaves, as opposed to what its own docs claim.

| Document | System |
| --- | --- |
| [integrations/steadfast.md](integrations/steadfast.md) | Steadfast courier API |
| [integrations/steadfast-webhook.md](integrations/steadfast-webhook.md) | Steadfast delivery-status webhook |
| [integrations/sapi.md](integrations/sapi.md) | SAPI plugin |
| [integrations/hoorin.md](integrations/hoorin.md) | Hoorin |
| [integrations/automas.md](integrations/automas.md) | Automas CRM and call centre |
| [integrations/bracknet-crm-api.bn.md](integrations/bracknet-crm-api.bn.md) | Bracknet CRM API contract (Bengali) |
| [integrations/cloudinary.md](integrations/cloudinary.md) | Cloudinary media hosting |

Captured vendor material — PDFs, screenshots, saved pages — is under
`integrations/assets/`.

> **Pathao** is integrated in code but has no document here. Its webhook
> contract is unusually strict about header handling and the response body; see
> `backend/src/common/constants/pathao-webhook.constants.ts` and the guard
> beside it before changing anything.

## Call centre (Bengali)

Operational material used by agents and team leads — not developer
documentation, and not safe to delete because it looks old.

[master guide](callcenter/master-guide.bn.md) ·
[agent call script](callcenter/agent-call-script.bn.md) ·
[training roleplay](callcenter/agent-training-roleplay.bn.md) ·
[12-month offer pipeline](callcenter/offer-pipeline-12-month.bn.md) ·
[team operations](callcenter/team-operations.bn.md) ·
[WebRTC softphone](callcenter/webrtc-softphone.bn.md)

## Frontend

[Electro theme](frontend/electro-theme.md) ·
[Argon admin panel](frontend/admin-panel-argon.md) ·
[product details](frontend/product-details.md)

## Development

[Developer guidelines](development/guidelines.md)

## API reference

There is no hand-written API documentation, deliberately. Swagger is generated
from the controllers and cannot drift:

```
http://localhost:3001/api/docs
```

The previous hand-maintained API documents — about 3,200 lines of it — are in
[archive/](archive/) and were already wrong when they were filed.

## Archive

[archive/](archive/) holds completion reports, daily updates, status snapshots
and superseded guides. They are history, not documentation. Nothing there is
maintained and none of it should be trusted as a description of the system
today. See [archive/README.md](archive/README.md).

## Conventions

**Documents describe the present tense.** If a file needs a date or a phase
number in its name to make sense, it is a report, and it belongs in the archive
or in a pull request description.

**One entry point.** The root [README](../README.md) orients; this index routes.
Resist adding a third `START_HERE`.

**Links are checked.** `node scripts/check-doc-links.js` fails on any broken
relative link outside the archive. Run it after moving or renaming anything.
