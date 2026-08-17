#!/usr/bin/env node
// Generic Chrome DevTools Protocol driver. Requires: npm install chrome-remote-interface
// Usage: node cdp.js <tabs|goto|eval|shot|click|type|key|waitfor> [args...]
const fs = require('fs');
const CDP = require('chrome-remote-interface');

const PORT = parseInt(process.env.CDP_PORT || '9222', 10);
const [cmd, ...args] = process.argv.slice(2);

function die(msg, code = 1) { console.error(msg); process.exit(code); }

async function main() {
  if (!cmd) die('usage: cdp.js <tabs|goto|eval|shot|click|type|key|waitfor> [args...]');

  if (cmd === 'tabs') {
    const targets = await CDP.List({ port: PORT });
    for (const t of targets.filter(t => t.type === 'page'))
      console.log(`${t.id}\t${t.url}`);
    return;
  }

  const client = await CDP({ port: PORT });
  const { Runtime, Page, Input } = client;
  await Runtime.enable(); await Page.enable();

  const evalJson = async (expr) => {
    const r = await Runtime.evaluate({ expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
    return r.result.value;
  };

  switch (cmd) {
    case 'goto': {
      if (!args[0]) die('goto <url>');
      await Page.navigate({ url: args[0] });
      await new Promise(res => { const t = setTimeout(res, 15000); Page.loadEventFired(() => { clearTimeout(t); res(); }); });
      console.log(await evalJson('location.href'));
      break;
    }
    case 'eval': {
      if (!args[0]) die("eval '<js>'");
      const v = await evalJson(args[0]);
      console.log(typeof v === 'string' ? v : JSON.stringify(v));
      break;
    }
    case 'shot': {
      const file = args[0] || 'shot.png';
      const shot = await Page.captureScreenshot({ format: 'png' });
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      console.log(file);
      break;
    }
    case 'click': {
      const [x, y] = args.map(Number);
      if (!Number.isFinite(x) || !Number.isFinite(y)) die('click <x> <y>  (CSS pixels)');
      await Input.dispatchMouseEvent({ type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await Input.dispatchMouseEvent({ type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
      console.log(`clicked ${x},${y} on: ` + await evalJson(
        `(()=>{const e=document.elementFromPoint(${x},${y});return e?(e.innerText||e.tagName).slice(0,80):'nothing'})()`));
      break;
    }
    case 'type': {
      if (args[0] === undefined) die("type '<text>'");
      await Input.insertText({ text: args.join(' ') });
      console.log('typed');
      break;
    }
    case 'key': {
      if (!args[0]) die('key <Enter|Tab|Escape|ArrowDown|...>');
      const key = args[0];
      const codes = { Enter: 13, Tab: 9, Escape: 27, Backspace: 8, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39 };
      const opts = { key, code: key, windowsVirtualKeyCode: codes[key] || 0, nativeVirtualKeyCode: codes[key] || 0 };
      await Input.dispatchKeyEvent({ type: 'rawKeyDown', ...opts });
      await Input.dispatchKeyEvent({ type: 'keyUp', ...opts });
      console.log(`pressed ${key}`);
      break;
    }
    case 'waitfor': {
      if (!args[0]) die("waitfor '<js-predicate>' [timeoutMs]");
      const timeout = parseInt(args[1] || '45000', 10);
      const t0 = Date.now();
      for (;;) {
        let v = false;
        try { v = await evalJson(`!!(${args[0]})`); } catch (e) { /* page mid-navigation */ }
        if (v) { console.log('ok'); break; }
        if (Date.now() - t0 > timeout) die(`timeout after ${timeout}ms waiting for: ${args[0]}`, 2);
        await new Promise(s => setTimeout(s, 2000));
      }
      break;
    }
    default:
      die(`unknown command: ${cmd}`);
  }
  await client.close();
}

main().catch(e => die(e.message));
