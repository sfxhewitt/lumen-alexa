# LUMEN Voice (Alexa skill)

Say what you want to watch and LUMEN puts it on your TV:

- "Alexa, ask my telly to continue Mobland": shows and films play in **Plexodus**, from where you left off
- "Alexa, ask my telly to play Mobland from the start"
- "Alexa, ask my telly to play lofi on YouTube": plays the top **YouTube** result
- "Alexa, ask my telly to put BBC One on" or "…to put Sky Sports on IPTV": tunes a **LUMEN** channel

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
4. When it has built, open the **Test** tab and set testing to **Development**.
5. On the TV open LUMEN > Settings > Alexa and say "Alexa, ask my telly to pair" and the code shown.

The invocation name ("my telly") can be changed under Build > Invocations.

## Test without Alexa

`node test/sim.js` plays the skill and a fake TV against the real relay.
