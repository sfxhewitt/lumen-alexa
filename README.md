# LUMEN Voice (Alexa skill)

Say what you want to watch and LUMEN puts it on your TV. The skill is called **Plexodus**:

- "Alexa, play Mobland using Plexodus" (or "in Plexodus", "with Plexodus", "ask Plexodus to play Mobland"):
  shows and films play in **Plexodus**, from where you left off
- "Alexa, ask Plexodus to play Mobland from the start"
- "Alexa, ask Plexodus to play lofi on YouTube": plays the top **YouTube** result
- "Alexa, ask Plexodus to put BBC One on" or "…to put Sky Sports on IPTV": tunes a **LUMEN** channel

Alexa only hands a request to a skill named at the end after "using", "in", "with", "from" or "by".
"Play Mobland **on** Plexodus" is not one of Alexa's linking words, so it may go to Alexa's music
player instead. Saying a show's name with no skill name ("Alexa, play Mobland") needs name-free
interaction (only for published skills with a usage history) or a Fire TV video skill (needs the app
in Amazon's Appstore with a catalogue), so neither fits a private skill.

## How it works

Alexa turns speech into an intent and this skill (`lambda/index.js`, no dependencies) passes it to
LUMEN on the TV through [ntfy.sh](https://ntfy.sh), on a private topic made from your Alexa account's
id. LUMEN keeps a small background link open, decides where the request goes, and answers with what
Alexa should say. Nothing secret is stored in this repo.

## Set up (once)

1. In the [Alexa developer console](https://developer.amazon.com/alexa/console/ask), **Create Skill**.
2. Name **LUMEN Voice**, language **English (UK)**, type **Other** > **Custom**, hosting
   **Alexa-hosted (Node.js)**, region **EU (Ireland)**.
3. Template: **Import skill**, URL `https://github.com/sfxhewitt/lumen-alexa.git`, then create it.
   The import only works while this repo is **public** (a private repo fails with "please check the
   provided URL").
4. The import can replace the invocation name with a placeholder ("change me"; the console says
   "Your skill name cannot be used as an invocation name"). Open **Build > Invocations**, set it to
   `plexodus`, **Save** and **Build skill**. Until then Alexa answers every phrase with "I'm not quite
   sure how to help you with that".
5. Open the **Test** tab and set testing to **Development**.
6. On the TV open LUMEN > Settings > Alexa > Pair with Alexa and say "Alexa, ask Plexodus to pair" and the
   code shown (or type `ask plexodus to pair 123456` in the console's Test tab).

The invocation name ("plexodus") can be changed under Build > Invocations, then **Build skill**.
Changing it keeps the pairing: the TV link is tied to the skill, not its name.

## Test without Alexa

`node test/sim.js` plays the skill and a fake TV against the real relay.
