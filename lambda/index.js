'use strict';
/*
 * LUMEN Voice: an Alexa skill that hands what you say to LUMEN on your TV.
 *
 * Alexa understands the words; LUMEN (on the Fire TV / Android TV box) decides
 * what to do with them: Plexodus for shows and films, YouTube, or a LUMEN
 * channel. The two talk through ntfy.sh, a free public relay, on a private
 * topic made from this skill's Amazon user id, so nothing secret lives here.
 *
 * Pairing: LUMEN's Settings > Alexa shows a code. "Alexa, ask Plexodus to
 * pair 123456" sends this account's topic to the TV showing that code.
 *
 * No npm dependencies on purpose: this code is imported once into an
 * Alexa-hosted skill and should never need changing. New commands are
 * handled on the TV, which LUMEN's own updates reach.
 */
const https = require('https');
const crypto = require('crypto');

const RELAY = process.env.LUMEN_RELAY || 'ntfy.sh';
const ACK_WAIT_MS = 4000;

/** This Alexa account's private topic (the same every time for this account). */
const topicFor = (userId) => 'lumen-' + crypto.createHash('sha256').update('lumen-alexa|' + userId).digest('hex').slice(0, 32);

function publish(topic, message) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(message, 'utf8');
    const req = https.request(
      { host: RELAY, path: '/' + topic, method: 'POST', timeout: 4000, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': body.length } },
      (res) => {
        res.resume();
        res.on('end', () => (res.statusCode < 300 ? resolve() : reject(new Error('relay answered ' + res.statusCode))));
      },
    );
    req.on('timeout', () => req.destroy(new Error('relay timed out')));
    req.on('error', reject);
    req.end(body);
  });
}

/**
 * Listens on a topic for a reply the TV sends back. `ready` settles once the
 * subscription is open (so nothing sent after it can be missed); `reply` is
 * the first message whose id matches, or null after `ms`.
 */
function listen(topic, id, ms) {
  let req;
  let done;
  const reply = new Promise((resolve) => (done = resolve));
  let opened;
  const ready = new Promise((resolve) => (opened = resolve));
  const finish = (value) => {
    clearTimeout(timer);
    opened();
    done(value);
    if (req) req.destroy();
  };
  const timer = setTimeout(() => finish(null), ms);
  req = https.get({ host: RELAY, path: '/' + topic + '/json' }, (res) => {
    let buf = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        try {
          const ev = JSON.parse(line);
          if (ev.event === 'open') opened();
          if (ev.event === 'message') {
            const m = JSON.parse(ev.message);
            if (m && m.id === id) finish(m);
          }
        } catch (e) {
          /* not ours */
        }
      }
    });
    res.on('end', () => finish(null));
  });
  req.on('error', () => finish(null));
  return { ready, reply };
}

/** Sends a command to the TV and waits briefly for it to say what it's doing. */
async function tell(topic, command) {
  const sub = listen(topic + '-ack', command.id, ACK_WAIT_MS);
  await Promise.race([sub.ready, new Promise((r) => setTimeout(r, 1500))]);
  await publish(topic, JSON.stringify(command));
  return sub.reply;
}

const say = (text, end = true, reprompt) => ({
  version: '1.0',
  response: {
    outputSpeech: { type: 'PlainText', text },
    ...(reprompt ? { reprompt: { outputSpeech: { type: 'PlainText', text: reprompt } } } : {}),
    shouldEndSession: end,
  },
});

const HELP = 'You can say things like: continue Mobland, play lofi on YouTube, or put BBC One on. What would you like to watch?';
const NOT_PAIRED = "I couldn't reach your TV. Check it's on. If it's not paired yet, open LUMEN, then Settings, then Alexa, and tell me the code you see.";

function slotValues(intent) {
  const out = {};
  for (const [name, slot] of Object.entries((intent && intent.slots) || {})) {
    if (slot && slot.value != null && slot.value !== '?') out[name] = String(slot.value);
  }
  return out;
}

exports.handler = async (event) => {
  const request = event.request || {};
  const system = (event.context && event.context.System) || {};
  const userId = (system.user && system.user.userId) || (event.session && event.session.user && event.session.user.userId) || '';
  const id = String(request.requestId || Date.now()).slice(-24);

  if (request.type === 'LaunchRequest') return say('What would you like to watch?', false, HELP);
  if (request.type === 'SessionEndedRequest') return { version: '1.0', response: {} };
  if (request.type !== 'IntentRequest' || !userId) return say('Sorry, I missed that.');

  const intent = request.intent || {};
  const name = intent.name || '';
  switch (name) {
    case 'AMAZON.HelpIntent':
      return say(HELP, false, HELP);
    case 'AMAZON.StopIntent':
    case 'AMAZON.CancelIntent':
    case 'AMAZON.NavigateHomeIntent':
      return say('Okay.');
    case 'AMAZON.FallbackIntent':
      return say("Sorry, I didn't get that. " + HELP, false, HELP);
    default:
  }

  const slots = slotValues(intent);
  const topic = topicFor(userId);
  try {
    if (name === 'PairIntent') {
      const code = (slots.code || '').replace(/\D/g, '');
      if (code.length < 4) return say('Tell me the code on your TV, like: pair 4 8 2 1 7 3.', false, 'What is the code on your TV?');
      const ack = await tell('lumen-pair-' + code, { v: 1, id, pair: topic });
      return say(ack ? ack.say || 'Paired with your TV.' : "I couldn't find a TV showing that code. Open LUMEN, then Settings, then Alexa, and try again.");
    }
    const ack = await tell(topic, { v: 1, id, intent: name, query: slots.query || '', slots, locale: request.locale || '', at: Date.now() });
    return say(ack ? ack.say || 'Okay.' : NOT_PAIRED);
  } catch (e) {
    console.log('relay failed', e && e.message);
    return say("Sorry, I couldn't reach your TV just now. Please try again.");
  }
};

// For tests.
exports._topicFor = topicFor;
