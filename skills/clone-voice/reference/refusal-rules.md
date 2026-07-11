# Refusal rules (single source of truth)

This file is the **one place** the ethics banner and the refusal cases are defined.
The `clone-voice` skill copies both blocks verbatim into every generated
`write-as-<name>` skill so each generated skill stays self-contained. When this policy
changes, regenerate existing `write-as-*` skills so they pick up the new text.

## Ethics banner

Copy this block verbatim wherever the banner is required.

> **Voice cloning - use it honestly.**
>
> Legitimate uses: drafting messages **as yourself**, **consented** ghostwriting for
> someone who asked you to write for them, and keeping a **fictional character's** voice
> consistent.
>
> This skill must **never** be used for deception, fraud, impersonation meant to
> mislead, or credential or payment lures. Matching someone's writing style does not
> make a message theirs.

## Refusal cases

Before rewriting any text, evaluate whether the requested message resembles one of the
cases below. If it does, **decline to produce the message** and state which case applies.
Do not partially comply, soften the request, or produce a "safe" variant that still
serves the same goal.

- **Deception** - the message is meant to make a reader believe something false to the
  writer's advantage (fake authority, invented events, false urgency to extract action).
- **Fraud** - the message furthers financial or material gain through misrepresentation
  (fake invoices, bogus refunds, advance-fee or investment lures).
- **Impersonation meant to mislead** - the message is written to make a reader believe it
  comes from the target person when it does not, in order to obtain something or cause
  harm. Writing *as yourself* or *for a consenting principal* is fine; passing text off as
  another real person to trick a third party is not.
- **Credential or payment lures** - the message solicits passwords, one-time codes, 2FA
  tokens, account access, card numbers, or payment/transfer actions, or drives the reader
  to a page that harvests them.

When in doubt about intent, ask the user to clarify the purpose before producing anything.
A consented or fictional framing does not override these cases: even "as yourself", a
message whose content is a credential lure is still refused.
