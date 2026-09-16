# Amharic screening content — what is still needed

Generated from the `*_am_1.0.0.json` bundles. Both are currently **draft**
and every value in them is still English.

There are two kinds of text here and they are **not** filled in the same way.

| | Who fills it | How |
|---|---|---|
| **Free copy** | You | Translate in place, the same way you did `frontend/src/locales/am.json`. |
| **Instrument wording** | The clinical lead | Paste the *validated* Amharic instrument. Never a translation of the English. |

The reason for the split: a hand translation of a validated instrument is no
longer that instrument. Its scores stop being comparable to any published
cut-off, and these scores decide whether a mother is routed to Stage 2.
Both English bundles say this in their own `notes`.

## The guard

Neither bundle can be published while its questions are in English.
`publish()` refuses, and a file declaring `"status": "active"` is downgraded
to draft on boot with an error in the log. So an accidental publish now
fails loudly instead of showing a mother English questions labelled Amharic.
Once the real Amharic wording is in, the guard passes and publishing works
normally.

## Stage 1 triage — `stage1_triage_am_1.0.0.json`

Instrument: **PHQ-4 (items 1-4) and PHQ-9 item 9 (item 5)**. 13 strings ready for you now, 0 waiting on English, 26 for the clinical lead.

### Free copy — translate these in place (13)

| JSON path | English |
|---|---|
| `title` | A few questions about how you have been |
| `intro` | There are no right or wrong answers. This is only about how things have really been for you. |
| `results.green.title` | Thank you for sharing this |
| `results.green.body` | It sounds like the past two weeks have been fairly steady for you. Things can change, and if they do, you can come back to these questions any time. Everything else here is still open to you. |
| `results.amber.title` | Thank you for being honest |
| `results.amber.body` | Some of what you have been carrying lately sounds heavy, and you do not have to sort it out alone. There are a few more questions next, so we can understand a little better how you have been feeling. |
| `results.orange.title` | Thank you for telling us |
| `results.orange.body` | It sounds like the past two weeks have been really hard. That matters, and so do you. There are a few more questions next, so we can understand how best to support you. |
| `safety_response.title` | Thank you for telling us this |
| `safety_response.body` | Thoughts like these can feel frightening and lonely, and saying so takes courage. You do not have to carry this by yourself. There are people ready to talk with you right now. |
| `safety_response.action_label` | Talk to someone now |
| `continue_label` | Continue |
| `back_label` | Back |

### Instrument wording — validated Amharic required (26)

Do not translate these. The English is shown only so the clinical lead
can map each line to the validated Amharic source.

| JSON path | English (reference only) |
|---|---|
| `instruction` | Over the last 2 weeks, how often have you been bothered by the following problems? |
| `items[0].text  (phq4_1)` | Feeling nervous, anxious or on edge |
| `items[0].options[0].label  (value 0)` | Not at all |
| `items[0].options[1].label  (value 1)` | Several days |
| `items[0].options[2].label  (value 2)` | More than half the days |
| `items[0].options[3].label  (value 3)` | Nearly every day |
| `items[1].text  (phq4_2)` | Not being able to stop or control worrying |
| `items[1].options[0].label  (value 0)` | Not at all |
| `items[1].options[1].label  (value 1)` | Several days |
| `items[1].options[2].label  (value 2)` | More than half the days |
| `items[1].options[3].label  (value 3)` | Nearly every day |
| `items[2].text  (phq4_3)` | Little interest or pleasure in doing things |
| `items[2].options[0].label  (value 0)` | Not at all |
| `items[2].options[1].label  (value 1)` | Several days |
| `items[2].options[2].label  (value 2)` | More than half the days |
| `items[2].options[3].label  (value 3)` | Nearly every day |
| `items[3].text  (phq4_4)` | Feeling down, depressed, or hopeless |
| `items[3].options[0].label  (value 0)` | Not at all |
| `items[3].options[1].label  (value 1)` | Several days |
| `items[3].options[2].label  (value 2)` | More than half the days |
| `items[3].options[3].label  (value 3)` | Nearly every day |
| `items[4].text  (phq9_9)` | Thoughts that you would be better off dead, or of hurting yourself in some way |
| `items[4].options[0].label  (value 0)` | Not at all |
| `items[4].options[1].label  (value 1)` | Several days |
| `items[4].options[2].label  (value 2)` | More than half the days |
| `items[4].options[3].label  (value 3)` | Nearly every day |

## Stage 2 (EPDS) — `epds_am_1.0.0.json`

Instrument: **Edinburgh Postnatal Depression Scale**. 4 strings ready for you now, 9 waiting on English, 51 for the clinical lead.

### Free copy — translate these in place (4)

| JSON path | English |
|---|---|
| `title` | How you have been feeling |
| `intro` | As you are pregnant or have recently had a baby, we would like to know how you are feeling. |
| `continue_label` | Continue |
| `back_label` | Back |

### Not yet translatable — the English is still a placeholder (9)

Do not translate these yet. The English copy itself has not been
written; the bundle notes list it as pending the clinical lead,
along with the band boundaries these titles describe.

| JSON path | Current English |
|---|---|
| `results.PLACEHOLDER_band_low.title` | PLACEHOLDER - low band result title |
| `results.PLACEHOLDER_band_low.body` | PLACEHOLDER - what she reads when her total falls in the low band. Band boundaries pending the clinical lead. |
| `results.PLACEHOLDER_band_mid.title` | PLACEHOLDER - mid band result title |
| `results.PLACEHOLDER_band_mid.body` | PLACEHOLDER - what she reads when her total falls in the mid band. Band boundaries pending the clinical lead. |
| `results.PLACEHOLDER_band_high.title` | PLACEHOLDER - high band result title |
| `results.PLACEHOLDER_band_high.body` | PLACEHOLDER - what she reads when her total falls in the high band. Band boundaries pending the clinical lead. |
| `safety_response.title` | PLACEHOLDER - safety response title |
| `safety_response.body` | PLACEHOLDER - what she reads immediately after answering item 10 above threshold. Must not contain an unverified phone number. Route her to the crisis hub, which already holds the verified contacts. |
| `safety_response.action_label` | PLACEHOLDER - safety action label |

### Instrument wording — validated Amharic required (51)

Do not translate these. The English is shown only so the clinical lead
can map each line to the validated Amharic source.

| JSON path | English (reference only) |
|---|---|
| `instruction` | Please choose the answer that comes closest to how you have felt in the past 7 days, not just how you feel today. |
| `items[0].text  (epds_1)` | I have been able to laugh and see the funny side of things |
| `items[0].options[0].label  (value 0)` | As much as I always could |
| `items[0].options[1].label  (value 1)` | Not quite so much now |
| `items[0].options[2].label  (value 2)` | Definitely not so much now |
| `items[0].options[3].label  (value 3)` | Not at all |
| `items[1].text  (epds_2)` | I have looked forward with enjoyment to things |
| `items[1].options[0].label  (value 0)` | As much as I ever did |
| `items[1].options[1].label  (value 1)` | Rather less than I used to |
| `items[1].options[2].label  (value 2)` | Definitely less than I used to |
| `items[1].options[3].label  (value 3)` | Hardly at all |
| `items[2].text  (epds_3)` | I have blamed myself unnecessarily when things went wrong |
| `items[2].options[0].label  (value 3)` | Yes, most of the time |
| `items[2].options[1].label  (value 2)` | Yes, some of the time |
| `items[2].options[2].label  (value 1)` | Not very often |
| `items[2].options[3].label  (value 0)` | No, never |
| `items[3].text  (epds_4)` | I have been anxious or worried for no good reason |
| `items[3].options[0].label  (value 0)` | No, not at all |
| `items[3].options[1].label  (value 1)` | Hardly ever |
| `items[3].options[2].label  (value 2)` | Yes, sometimes |
| `items[3].options[3].label  (value 3)` | Yes, very often |
| `items[4].text  (epds_5)` | I have felt scared or panicky for no very good reason |
| `items[4].options[0].label  (value 3)` | Yes, quite a lot |
| `items[4].options[1].label  (value 2)` | Yes, sometimes |
| `items[4].options[2].label  (value 1)` | No, not much |
| `items[4].options[3].label  (value 0)` | No, not at all |
| `items[5].text  (epds_6)` | Things have been getting on top of me |
| `items[5].options[0].label  (value 3)` | Yes, most of the time I haven't been able to cope at all |
| `items[5].options[1].label  (value 2)` | Yes, sometimes I haven't been coping as well as usual |
| `items[5].options[2].label  (value 1)` | No, most of the time I have coped quite well |
| `items[5].options[3].label  (value 0)` | No, I have been coping as well as ever |
| `items[6].text  (epds_7)` | I have been so unhappy that I have had difficulty sleeping |
| `items[6].options[0].label  (value 3)` | Yes, most of the time |
| `items[6].options[1].label  (value 2)` | Yes, sometimes |
| `items[6].options[2].label  (value 1)` | Not very often |
| `items[6].options[3].label  (value 0)` | No, not at all |
| `items[7].text  (epds_8)` | I have felt sad or miserable |
| `items[7].options[0].label  (value 3)` | Yes, most of the time |
| `items[7].options[1].label  (value 2)` | Yes, quite often |
| `items[7].options[2].label  (value 1)` | Not very often |
| `items[7].options[3].label  (value 0)` | No, not at all |
| `items[8].text  (epds_9)` | I have been so unhappy that I have been crying |
| `items[8].options[0].label  (value 3)` | Yes, most of the time |
| `items[8].options[1].label  (value 2)` | Yes, quite often |
| `items[8].options[2].label  (value 1)` | Only occasionally |
| `items[8].options[3].label  (value 0)` | No, never |
| `items[9].text  (epds_10)` | The thought of harming myself has occurred to me |
| `items[9].options[0].label  (value 3)` | Yes, quite often |
| `items[9].options[1].label  (value 2)` | Sometimes |
| `items[9].options[2].label  (value 1)` | Hardly ever |
| `items[9].options[3].label  (value 0)` | Never |

## When it is ready

1. Fill both files. Leave every `code`, `value`, `index`, `min`, `max`,
   `status` and `next` untouched — identifiers and scoring, not text.
2. Confirm `attribution` with the clinical lead: the validated Amharic
   source usually has its own citation requirement.
3. Delete the `translation_note` key and rewrite `notes` to describe what
   was actually used.
4. Publish with `scripts/publish_screening_content.py`, or by setting
   `"status": "active"` in the file and deploying. The second survives a
   database reset; the first does not.
