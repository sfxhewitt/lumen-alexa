// Plays both sides once against the real relay: a fake TV answers, the skill speaks its answer.
// node test/sim.js
const https = require('https');
const skill = require('../lambda/index.js');
const user = 'amzn1.ask.account.TEST-' + Date.now();
const topic = skill._topicFor(user);

function fakeTv(t, answer) {
  return new Promise((ready) => {
    https.get({ host: 'ntfy.sh', path: '/' + t + '/json' }, (res) => {
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        for (const line of chunk.split('\n').filter(Boolean)) {
          const ev = JSON.parse(line);
          if (ev.event === 'open') ready();
          if (ev.event !== 'message') continue;
          const cmd = JSON.parse(ev.message);
          const body = JSON.stringify({ id: cmd.id, say: answer(cmd) });
          const req = https.request({ host: 'ntfy.sh', path: '/' + t + '-ack', method: 'POST' }, (r) => r.resume());
          req.end(body);
        }
      });
    });
  });
}

const ev = (intent, slots) => ({
  version: '1.0',
  session: { user: { userId: user } },
  context: { System: { user: { userId: user } } },
  request: { type: 'IntentRequest', requestId: 'amzn1.echo-api.request.' + Math.random().toString(36).slice(2), locale: 'en-GB',
    intent: { name: intent, slots: Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, { name: k, value: v }])) } },
});

(async () => {
  let t0 = Date.now();
  let r = await skill.handler(ev('ContinueIntent', { query: 'mobland' }));
  console.log('unpaired:', r.response.outputSpeech.text, Date.now() - t0, 'ms');
  await fakeTv(topic, (c) => `${c.intent} ${c.query}`);
  t0 = Date.now();
  r = await skill.handler(ev('ContinueIntent', { query: 'mobland' }));
  console.log('paired:', r.response.outputSpeech.text, Date.now() - t0, 'ms');
  const code = String(100000 + Math.floor(Math.random() * 899999));
  await fakeTv('lumen-pair-' + code, (c) => (c.pair === topic ? 'Paired.' : 'wrong topic'));
  r = await skill.handler(ev('PairIntent', { code }));
  console.log('pair:', r.response.outputSpeech.text);
  r = await skill.handler({ ...ev('x', {}), request: { type: 'LaunchRequest', requestId: 'x' } });
  console.log('launch:', r.response.outputSpeech.text, r.response.shouldEndSession);
  process.exit(0);
})();
