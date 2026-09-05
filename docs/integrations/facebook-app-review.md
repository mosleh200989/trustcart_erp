# Going public: Meta App Review for the Messenger bot

Everything is built. What stands between the bot and real customers is Meta's
permission system, not our code.

While the app is in **Development mode**, Facebook simply does not deliver a
message from anyone who lacks a role on the app. That is why testing works and
customers see nothing. To reach real customers you need **Advanced Access** to
`pages_messaging`, and that means App Review, and App Review for a messaging
permission means **Business Verification** first.

There is no way around this and no code that substitutes for it.

---

## The three gates, in order

### 1. Business Verification

Meta Business Suite → **Business settings → Security Centre → Start
verification**, for the business that owns the app.

Typically wanted:

- Trade licence or business registration for the legal entity
- A document showing the business name and address (utility bill, bank statement)
- A phone number and email at the business domain, for the confirmation code

This is the slow gate — days to weeks, and rejections are usually a mismatch
between the name on the document and the name on the business account. Make
those identical before submitting.

### 2. App Review for `pages_messaging`

App Dashboard → **App Review → Permissions and Features** → `pages_messaging` →
**Request Advanced Access**.

Before the form will submit, the app's **Settings → Basic** needs:

| Field | Value |
|---|---|
| Privacy Policy URL | `https://trustcart.com.bd/privacy` |
| User Data Deletion | `https://trustcart.com.bd/data-deletion` |
| App Icon | 1024×1024, no transparency |
| Category | Business and Pages (or Shopping) |
| App Domain + Site URL | the domain the page links to |

Both URLs exist and are live. Use the domain matching the page being reviewed —
`kasrioil.com` serves the same pages if that is the better fit for Kasri.

### 3. Switch the app to Live

Only after Advanced Access is granted. Development → Live is the toggle at the
top of the App Dashboard.

---

## What to write in the submission

Meta rejects vague submissions. Reviewers want to know exactly what the
permission is used for and exactly how to see it working.

### "How will you use this permission?"

> We use `pages_messaging` to answer customer questions on our own Facebook Page
> for our retail business in Bangladesh.
>
> When a customer messages our Page asking about a product, delivery time, or how
> to order, our system replies with information taken from our own product
> catalogue and a set of answers written by our support team. Prices come from
> our live inventory system, so the customer is never quoted a stale figure.
>
> Customers can also place an order in the conversation. We collect the product,
> quantity, name, phone number and delivery address, show the complete order back
> to the customer, and create the order only after they confirm it in writing.
> Orders are cash on delivery — we never request payment details in Messenger.
>
> Anything the system is not confident about — a complaint, a refund request, a
> question about an existing order — is handed to a human agent instead of
> answered automatically.
>
> We only message people who have messaged our Page first, and only within the
> conversation they started. We do not send promotional broadcasts.

### Reviewer instructions

Write these as numbered steps a stranger can follow. A reviewer who cannot
reproduce the flow rejects the submission.

> 1. Open our Facebook Page: `https://facebook.com/<page>`
> 2. Click **Send message**.
> 3. Send: `আসসালামু আলাইকুম, দাম কত?` (or in English: `what is the price?`)
>    → The system replies with the product name and current price.
> 4. Send: `delivery koto din lagbe?` (`how long does delivery take?`)
>    → The system replies with our delivery timeframe.
> 5. Send: `ami order korte chai` (`I want to order`)
>    → The system asks for the product, quantity, your name, mobile number and
>    address, one question at a time.
> 6. Answer each question. The system then shows the complete order back to you
>    with the total, and asks you to reply `কনফার্ম` (confirm) to place it.
> 7. Reply `কনফার্ম`. The system confirms the order with an order number.
>
> No login is required. Any Facebook account can do this.

### Screencast

One continuous, unedited recording, no more than a couple of minutes:

- Start on the Page, so it is obvious which Page is involved
- Show the whole flow from step 2 to step 7 above
- Keep the replies on screen long enough to read
- If the conversation is in Bangla, add English subtitles or say what each
  message means

Record it with the app in Development mode and your own account as a tester —
that is a genuine demonstration of the permission in use, and it is the only way
to record it before the permission is granted.

---

## Before you flip the switch

Going Live means every customer who messages the Page reaches the bot. Worth
having in place first:

- [ ] Watch a week in **shadow mode** and read the drafts. Shadow decides and
      stores but sends nothing, so this costs nothing and catches wording
      problems before customers see them.
- [ ] Fill in the **FAQ** for the questions the bot currently escalates. Each
      empty answer is a conversation handed to a person.
- [ ] Decide whether the **order flow** is on. It creates real orders at status
      `processing`. It is independent of everything else and can stay off.
- [ ] Check the **per-thread reply cap** (Channels → max replies per hour). It is
      the backstop against a rule that misfires in a loop.
- [ ] Know where the **kill switch** is: Overview → Kill switch. It stops all
      sending immediately without changing any other setting.

The kill switch and shadow mode are the two controls that matter once this is
public. Neither depends on Meta.

---

## If the review is rejected

The common reasons, in order:

1. **The reviewer could not reproduce the flow.** Usually the Page was
   unreachable, or the steps assumed knowledge the reviewer did not have.
2. **The screencast did not show the permission in use** — it showed the admin
   panel rather than a real conversation.
3. **Business Verification incomplete**, which blocks the whole submission.
4. **Privacy policy did not mention Messenger data.** Ours now does.

Rejections are re-submittable. Fix the specific point and send it again.

---

## One thing worth checking first

App ID `1045665091632294` — the app this integration originally used — has had
its **API access blocked** by Facebook. Find out why before submitting a new app
from the same business: if it was a policy action, the same reason can apply
again. The App Dashboard's **Alerts** tab for that app is where the reason will
be.
