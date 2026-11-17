# UniPro demo

**One conversation, not four forms.**

UniPro is a research prototype of a chatbot check-in for postpartum pain and physical recovery. Instead of a fixed questionnaire, the patient has a short conversation. When she uses a word like "moderate" or a number like "6", UniPro asks what that makes harder in her day, so the care team gets her words, her number and what they mean for her.

> **Research prototype. Dummy data only. Not for real patients.**
> This public demo uses a **scripted** chat, not live AI, so it costs nothing to run and anyone can try it.

Built by Rutha Borse (MS Health Informatics, UT Austin iSchool) with Dr. Ying Ding and Dr. Jiawei Zhou.

## What you can try

Use the switch at the top right to move between three views.

**Patient (Jane Doe, a demo patient)**
- Her home page: delivery details, care team, a pain trend chart, and two buttons, **Emergency** and **Log symptoms**
- The check-in chat: one question at a time, with soft checkmarks as topics are covered (pain, daily life, healing, bladder and bowel, what she tried)
- After the chat: a "Report sent to your care team" page with what was logged and the transcript, plus two quick feedback questions

**Care team (signed in as Dr. Maria Lopez, a demo clinician)**
- A patient list with urgent patients first, count tiles, and tags such as *Urgent flag*, *Pain went up*, *Affects baby care* and *Word and number don't match*
- A plain sentence explaining why each patient is flagged
- Patient pages with her exact words next to each rating, a pain trend, and **Mark reviewed** with an action (called patient, scheduled visit, sent to ER, no action needed)
- **Copy as chart note**

**Research**
- The full v2 prompt (read and edit), test-run marking, a run log with simple metrics, and **Reset demo**

### Suggested demo
1. **Patient view:** tap **Log symptoms** and try one of the scripts below.
2. Switch to **Care team.** Jane's row now shows the new check-in. Open her page and mark it reviewed.
3. Switch back to **Patient.** Jane's home page now says her care team reviewed her check-in.

### Scripts to type as Jane
**Normal check-in:** "Honestly, still pretty sore." → "Down there mostly. And my lower back." → "Kind of tight and pulling." → "Maybe a 5? Moderate." → "I can't sit for more than 20 minutes." → "Like a 3. Just achy." → "Standing a long time." → "No, that's it." → "Lighter than last week." → "They look okay." → "A little when I laugh." → "A donut pillow." → "It helps a little." → "Is it normal that it still hurts?" → "No, I think that's it." → "Yes, that's right."

**Emergency:** "Sore down there, maybe a 4." → "Sitting." → "Actually, I've been soaking through a pad every hour since this morning and I feel dizzy." → "Yes, right now." → "Can I just take ibuprofen?"

The scripted chat reacts to what you type (areas, numbers, severity words, red flags, questions about medicine), but it can't handle everything a live AI could. Off-script answers may get a generic follow-up.

## How the demo differs from the live version

| | Live version (inside Claude) | This public demo |
|---|---|---|
| Chat | Live AI following the v2 prompt | Scripted conversation |
| Summary for the care team | Written by AI with the summary rules | Built from the script's answers |
| Test patients (automated checks) | Yes | Not available |
| Data | Saved to the owner's private Claude space | Saved only in your own browser (clear it with **Reset demo**) |
| Voice | Claude's microphone and read-aloud | Your browser's speech features (Chrome or Edge) |
| Cost | Uses the owner's Claude plan | Free |

## The prompt
- [`prompt/unipro_checkin_prompt_v2.txt`](prompt/unipro_checkin_prompt_v2.txt): the check-in prompt
- [`prompt/unipro_summary_rules.txt`](prompt/unipro_summary_rules.txt): the rules for the care-team summary

## Publish it free with GitHub Pages
1. Create a new **public** repository on GitHub (for example `unipro-demo`).
2. Upload everything in this folder: `index.html`, `shim.js`, `.nojekyll`, `README.md` and the `prompt` folder.
3. In the repository, go to **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, pick **main** and **/ (root)**, and click **Save**.
5. After a minute or two, your site is at `https://<your-username>.github.io/unipro-demo/`.

## Files
- `index.html`: the whole app (one page)
- `shim.js`: the free demo layer (scripted chat, browser storage, browser speech)
- `.nojekyll`: tells GitHub Pages to serve the files as they are

## Moving to live AI later
The app calls `claude.use("sample")` for AI replies. To use live AI outside Claude, replace the scripted `sample` in `shim.js` with a call to a small server function that holds an API key (for example on Azure Static Web Apps or Vercel). Never put an API key in this repository.
