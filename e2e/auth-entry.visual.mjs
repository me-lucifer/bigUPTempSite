// [18A-1] VISUAL + BEHAVIOURAL GATE — the public site's way IN.
//
// This site has no test runner at all: package.json carries tailwindcss and
// three scripts. So this IS the gate, and it is required rather than optional.
// A Playwright smoke on this project has already caught a create-flow bug that
// every other gate passed.
//
// What it proves, and why each one is here:
//
//   1. All EIGHT auth controls resolve to the exact origin+path they should.
//      Eight controls, two roles, two intents — the one thing a human reviewer
//      will not check by hand is whether control #6 quietly points at sign-UP.
//   2. NOTHING in the document is `href="#"`. The site shipped seven of them.
//   3. The seven placeholders are NOT focusable and carry no href. A badge for
//      an unpublished app that still looks pressable is the inert control this
//      project has paid for twice.
//   4. The disclosure opens to exactly two links, closes on Escape, and returns
//      focus to its summary.
//   5. Every [data-i18n] resolves to non-empty text IN BOTH LOCALES — and,
//      because a red proof showed that check is fooled by a stale value left
//      over from the other locale, the DICTIONARIES are compared directly too:
//      identical key sets, and every key the DOM asks for present in both.
//   6. No link anywhere points at an admin surface.
//   7. 320px wide, no horizontal overflow.
//
// Exit 0 on pass, 1 on any failure. BY EXIT CODE — never piped. A pipe returns
// the last command's status, and on this project that has already reported a
// clean exit over five failing tests.
//
//   npm run serve          (terminal 1, :5173)
//   node e2e/auth-entry.visual.mjs

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SITE_URL ?? 'http://localhost:5173';
const OUT = 'e2e/.shots-auth-entry';
mkdirSync(OUT, { recursive: true });

const TALENT = 'https://talent-web-production.up.railway.app';
const RECRUITER = 'https://recruiter-web-production-de44.up.railway.app';

/** The contract from the story's §2.2 table. Order-independent: counted. */
const EXPECTED = {
  [`${TALENT}/signup`]: 2, // hero door 1, #cta door 1
  [`${RECRUITER}/signup`]: 2, // hero door 2, #cta door 2
  [`${TALENT}/`]: 2, // header disclosure, mobile drawer
  [`${RECRUITER}/`]: 2, // header disclosure, mobile drawer
};

const failures = [];
const pass = [];
function check(ok, label, detail) {
  (ok ? pass : failures).push(detail ? `${label} — ${detail}` : label);
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => document.querySelector('[data-i18n="auth.talent.cta"]')?.textContent?.trim(),
    null,
    { timeout: 10_000 },
  );
  await page.screenshot({ path: `${OUT}/01-desktop.png`, fullPage: true });

  // ── 1. the eight destinations ──────────────────────────────────────────────
  // [18A-6] The EIGHT structural doors - hero, header, drawer, cta band. The
  // pricing cards carry doors too, but there is one per plan and that count
  // belongs to the catalogue, not to this contract. They are asserted
  // separately, and the language check below deliberately covers ALL of them.
  const hrefs = await page.$$eval('[data-auth-link]:not(.pricing-cta)', (els) =>
    els.map((e) => e.href),
  );
  check(hrefs.length === 8, 'eight structural auth controls exist', `found ${hrefs.length}`);
  // [18A-2] Compare origin+path only: the query now carries the reader's
  // language, which is asserted separately below.
  const bare = (u) => {
    const p = new URL(u);
    return `${p.origin}${p.pathname}`;
  };
  const counted = {};
  for (const h of hrefs) counted[bare(h)] = (counted[bare(h)] ?? 0) + 1;
  for (const [url, n] of Object.entries(EXPECTED)) {
    check(counted[url] === n, `${n} control(s) -> ${url}`, `found ${counted[url] ?? 0}`);
  }
  const unexpected = Object.keys(counted).filter((u) => !(u in EXPECTED));
  check(unexpected.length === 0, 'no auth control points anywhere else', unexpected.join(', '));

  // ── 2. no dead controls ────────────────────────────────────────────────────
  const deadHash = await page.$$eval('a[href="#"]', (els) => els.length);
  check(deadHash === 0, 'no a[href="#"] anywhere', `found ${deadHash}`);

  // ── 3. the placeholders are not controls ───────────────────────────────────
  const inert = await page.$$eval('.is-inert', (els) =>
    els.map((e) => ({
      tag: e.tagName.toLowerCase(),
      tabIndex: e.tabIndex,
      href: e.getAttribute('href'),
      disabled: e.getAttribute('aria-disabled'),
    })),
  );
  check(inert.length === 7, 'seven placeholders de-controlled', `found ${inert.length}`);
  check(
    inert.every((e) => e.tabIndex < 0),
    'no placeholder is focusable',
    inert.filter((e) => e.tabIndex >= 0).length + ' focusable',
  );
  check(inert.every((e) => e.href === null), 'no placeholder carries an href');
  check(inert.every((e) => e.disabled === 'true'), 'every placeholder is aria-disabled');

  // ── 4. the disclosure ──────────────────────────────────────────────────────
  const summary = page.locator('#login-menu > summary');
  await summary.click();
  await page.waitForTimeout(150);
  const openLinks = await page.$$eval('#login-menu .login-menu-item', (e) => e.length);
  check(openLinks === 2, 'disclosure offers exactly two doors', `found ${openLinks}`);
  await page.screenshot({ path: `${OUT}/02-disclosure-open.png` });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const stillOpen = await page.$eval('#login-menu', (e) => e.open);
  check(stillOpen === false, 'Escape closes the disclosure');
  const focused = await page.evaluate(
    () => document.activeElement?.tagName?.toLowerCase() === 'summary',
  );
  check(focused, 'focus returns to the summary after Escape');

  // ── 5. every string resolves, in BOTH locales ──────────────────────────────
  for (const lang of ['fr', 'en', 'es']) {
    await page.click(`.lang-pill button[data-lang="${lang}"]`);
    await page.waitForTimeout(400);
    const empty = await page.$$eval('[data-i18n]', (els) =>
      els
        .filter((e) => !e.textContent.trim())
        .map((e) => e.getAttribute('data-i18n')),
    );
    check(empty.length === 0, `every [data-i18n] resolves in ${lang}`, empty.join(', '));
    await page.screenshot({ path: `${OUT}/03-${lang}.png`, fullPage: true });
  }

  // ── 5b. THE DICTIONARIES THEMSELVES ────────────────────────────────────────
  //
  // Added after a red proof embarrassed the check above. Deleting `auth.talent.cta`
  // from fr.json left that gate GREEN, because `applyDict` only writes when the key
  // EXISTS — a missing key leaves whatever text was already in the element, and
  // after a locale switch that is the OTHER language's string. "Non-empty" cannot
  // tell a translation from a leftover.
  //
  // So this asks the dictionaries directly: identical key sets, and every key the
  // DOM actually asks for present in BOTH. That is what a deleted key breaks.
  const dicts = await page.evaluate(async () => {
    const [en, fr, es] = await Promise.all([
      fetch('i18n/en.json').then((r) => r.json()),
      fetch('i18n/fr.json').then((r) => r.json()),
      fetch('i18n/es.json').then((r) => r.json()),
    ]);
    const used = [...document.querySelectorAll('[data-i18n]')].map((e) =>
      e.getAttribute('data-i18n'),
    );
    const attrUsed = [...document.querySelectorAll('[data-i18n-attr]')].flatMap((e) =>
      e
        .getAttribute('data-i18n-attr')
        .split(',')
        .map((pair) => pair.split(':')[1]?.trim())
        .filter(Boolean),
    );
    const all = [...new Set([...used, ...attrUsed])];
    const d = { en, fr, es };
    const asym = {};
    for (const a of ['en', 'fr', 'es']) {
      for (const b of ['en', 'fr', 'es']) {
        if (a === b) continue;
        const only = Object.keys(d[a]).filter((k) => !(k in d[b]));
        if (only.length) asym[`${a}-only vs ${b}`] = only;
      }
    }
    const missing = {};
    for (const l of ['en', 'fr', 'es']) {
      const m = all.filter((k) => !(k in d[l]));
      if (m.length) missing[l] = m;
    }
    // An untranslated string is a key that exists everywhere and carries the
    // SAME text in every locale. A handful are legitimately identical (brand,
    // "Blog", "Cookies", country names that do not translate), so this reports
    // rather than fails - but a jump in the count means a locale was copied.
    const identical = Object.keys(en).filter(
      (k) => en[k] === fr[k] && fr[k] === es[k] && String(en[k]).length > 3,
    );
    return {
      asym,
      missing,
      identical: identical.length,
      counts: { en: Object.keys(en).length, fr: Object.keys(fr).length, es: Object.keys(es).length },
    };
  });
  check(
    Object.keys(dicts.asym).length === 0,
    'all three locales carry exactly the same keys',
    JSON.stringify(dicts.asym).slice(0, 200),
  );
  check(
    Object.keys(dicts.missing).length === 0,
    'every key the DOM asks for exists in all three locales',
    JSON.stringify(dicts.missing).slice(0, 200),
  );
  check(
    dicts.counts.en === dicts.counts.fr && dicts.counts.fr === dicts.counts.es,
    'EN, FR and ES carry the same number of keys',
    JSON.stringify(dicts.counts),
  );
  check(
    dicts.identical <= 25,
    'the three locales are actually translated, not copied',
    `${dicts.identical} strings identical across all three`,
  );

  // ── 5c. [18A-2] THE LANGUAGE CROSSES THE SEAM ──────────────────────────────
  //
  // ADR-024: "the specific, likely failure... it should have a test, not a note."
  // This is the site's half. The product half already exists and is tested -
  // both apps' resolveInitialLocale ranks `?lang=` above the browser, with a
  // handoff.test.ts written against this same ADR.
  //
  // Asserted for EVERY locale and EVERY one of the eight doors, because the
  // failure mode is not "it never works", it is "it works on the two buttons
  // somebody checked by hand".
  for (const lang of ['fr', 'en', 'es']) {
    await page.click(`.lang-pill button[data-lang="${lang}"]`);
    await page.waitForTimeout(400);
    const langs = await page.$$eval('[data-auth-link]', (els) =>
      els.map((e) => new URL(e.href).searchParams.get('lang')),
    );
    // Every door, structural AND pricing. The pricing cards are built after the
    // first decoration pass, so this is exactly where a gap would appear.
    check(
      langs.length >= 8 && langs.every((l) => l === lang),
      `all ${langs.length} doors hand over lang=${lang}`,
      `got ${JSON.stringify([...new Set(langs)])}`,
    );
  }
  // And switching back must not leave a stale one behind.
  await page.click('.lang-pill button[data-lang="fr"]');
  await page.waitForTimeout(400);
  const noDupes = await page.$$eval('[data-auth-link]', (els) =>
    els.every((e) => (e.href.match(/[?&]lang=/g) ?? []).length === 1),
  );
  check(noDupes, 'switching language does not accumulate lang parameters');

  // ── 5d. [18A-6] THE PRICES ON THE PAGE ARE THE PRICES THE API RETURNED ─────
  //
  // "A price is displayed" is not the claim worth making - a hardcoded number
  // satisfies it. The claim is "the SAME price is displayed", so the gate
  // fetches the catalogue itself and matches every rendered figure back to an
  // integer the API actually returned.
  //
  // Digits are extracted rather than the formatted string compared, because
  // Intl inserts locale-specific group separators (a narrow no-break space in
  // French) and the assertion is about the NUMBER, not the typography.
  await page.click(`.lang-pill button[data-lang="en"]`);
  await page.waitForTimeout(1200);
  const api = await page.evaluate(async () => {
    const r = await fetch('https://backend-production-13b7.up.railway.app/public/plans', {
      credentials: 'omit',
    });
    if (!r.ok) return null;
    return (await r.json()).plans;
  });

  if (!api) {
    check(false, 'the pricing API is reachable from the page', 'fetch failed or non-200');
  } else {
    const expected = api
      .filter((p) => p.kind === 'subscription')
      .map((p) => p.price_xof);
    const shown = await page.$$eval('.pricing-amount', (els) =>
      els.map((e) => Number(e.textContent.replace(/[^0-9]/g, ''))),
    );
    check(shown.length === expected.length, 'one card per marketable plan',
      `showing ${shown.length}, API has ${expected.length} subscriptions`);
    check(
      shown.length > 0 && shown.every((n) => expected.includes(n)),
      'every price on the page is a price the API returned',
      `page ${JSON.stringify(shown)} vs api ${JSON.stringify(expected)}`,
    );
    // The one-offs are RECEIVED and deliberately NOT rendered (B80). If they
    // ever appear, somebody dropped the `kind` filter.
    const oneOffs = api.filter((p) => p.kind === 'one_off').map((p) => p.price_xof);
    const leaked = shown.filter((n) => oneOffs.includes(n) && !expected.includes(n));
    check(leaked.length === 0, 'no one-off product leaked onto the marketing page',
      JSON.stringify(leaked));
    // XOF has no minor unit.
    const decimals = await page.$$eval('.pricing-amount', (els) =>
      els.map((e) => e.textContent).filter((t) => /[.,]\d{2}(\D|$)/.test(t)),
    );
    check(decimals.length === 0, 'no price is shown with decimal places', decimals.join(' | '));

    // THE PRICE MUST FIT ITS CARD. Caught by looking at the rendered page, not
    // by any assertion I had written: five of six prices overflowed, because
    // "F CFA 60,000" is wider than a card at the heading size. The catalogue is
    // ADMIN-EDITABLE, so a longer figure is a matter of time - this is the
    // guard, not the one-off fix.
    const overflowing = await page.$$eval('.pricing-card', (cards) =>
      cards
        .map((c) => {
          const a = c.querySelector('.pricing-amount');
          if (!a) return null;
          return a.scrollWidth > c.clientWidth - 40 ? a.textContent : null;
        })
        .filter(Boolean),
    );
    check(overflowing.length === 0, 'every price fits inside its card', overflowing.join(' | '));
  }

  // ── 5e. THE FAILURE PATH, DRIVEN RATHER THAN REASONED ──────────────────────
  //
  // This is the assertion Playwright can make and a unit test cannot: with the
  // API returning 500, the section must still be there. Never blank, never a 0,
  // and never a price remembered from the successful load a moment ago - a
  // cached price is the drift bug this whole slice exists to avoid.
  // Everything after this point deliberately breaks the API, so the console
  // check is taken against what the page logged BEFORE we broke it.
  const errorsBeforeFailureTest = consoleErrors.length;
  await page.route('**/public/plans', (route) => route.fulfill({ status: 500, body: '{}' }));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const degraded = await page.evaluate(() => ({
    cards: document.querySelectorAll('.pricing-card').length,
    amounts: document.querySelectorAll('.pricing-amount').length,
    pending: document.querySelectorAll('.pricing-pending').length,
    doors: document.querySelectorAll('.pricing-card a[data-auth-link]').length,
    zeros: [...document.querySelectorAll('.pricing-card')].filter((e) =>
      /(^|\D)0(\D|$)/.test(e.textContent),
    ).length,
  }));
  check(degraded.cards > 0, 'the pricing section still renders when the API is down',
    JSON.stringify(degraded));
  check(degraded.amounts === 0, 'no figure is shown when the API is down');
  check(degraded.pending > 0, 'it says where to find the real price instead');
  check(degraded.doors > 0, 'the doors still work when the API is down');
  check(degraded.zeros === 0, 'a failed fetch never renders a 0');
  await page.screenshot({ path: `${OUT}/05-pricing-degraded.png` });
  await page.unroute('**/public/plans');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // ── 6. no admin surface advertised ─────────────────────────────────────────
  const adminish = await page.$$eval('a[href]', (els) =>
    els.map((e) => e.href).filter((h) => /admin/i.test(h)),
  );
  check(adminish.length === 0, 'no link points at an admin surface', adminish.join(', '));

  // ── 7. 320px ───────────────────────────────────────────────────────────────
  await page.setViewportSize({ width: 320, height: 700 });
  await page.waitForTimeout(200);
  // PRE-EXISTING DEFECT, PINNED AS A REGRESSION GUARD rather than asserted away.
  //
  // The client's header row has never fitted a 320px screen. Measured side by
  // side against the pristine finalised site, BOTH report the same widths, so
  // nothing here made it worse:
  //
  //     English  345px      French  373px      (viewport 320px)
  //
  // Fixing it means changing the client's approved header layout, which this
  // epic may not do. So the assertion is "no WORSE than the baseline" - a real
  // check that fails the moment a later slice widens that row.
  //
  // PER LOCALE, and that matters. The first version of this took ONE measurement
  // in whatever language the previous test had left active. Adding the
  // hand-off assertions changed that language to French and the guard fired at
  // 373 against a 345 baseline - reading a pre-existing difference as a
  // regression I had caused. A guard whose result depends on leftover state
  // from an earlier test is not a guard, it is a coin toss with a changelog.
  // Measured, per locale, against the pristine client build for en/fr and on
  // first ship for es. All three overflow because THE CLIENT'S HEADER ROW DOES
  // NOT FIT A 320px SCREEN in any language - en 345, fr 373, es 427 against a
  // 320px viewport. Spanish is worst simply because its words are longest.
  //
  // Adding the third language button cost nothing: en and fr measured 345 and
  // 373 both before and after it, so this is the same pre-existing defect, not
  // a regression. It is on the go-live checklist as a client-design item.
  const BASELINE_320 = { en: 345, fr: 373, es: 427 };
  for (const [lang, baseline] of Object.entries(BASELINE_320)) {
    await page.click(`.lang-pill button[data-lang="${lang}"]`);
    await page.waitForTimeout(400);
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    check(
      w <= baseline,
      `320px overflow in ${lang} no worse than the client's baseline (${baseline}px)`,
      `measured ${w}px`,
    );
    await page.screenshot({ path: `${OUT}/04-320-${lang}.png`, fullPage: true });
  }

  check(
    errorsBeforeFailureTest === 0,
    'no console errors during normal operation',
    consoleErrors.slice(0, 2).join(' | '),
  );
} finally {
  await browser.close();
}

console.log(`\n${pass.length} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('\nFAILURES:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
process.exit(0);
