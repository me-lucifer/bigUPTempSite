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
//   7. At four phone widths, in every locale: no sideways scroll, and the
//      menu button is on screen and opens onto both log-in doors.
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
  // [ROUND 2] This used to assert `aria-disabled="true"` on every placeholder.
  // The review showed that attribute is not a valid state on role="img" and is
  // ignored by assistive tech - and that role="img" itself was hiding the store
  // badges' names. So assert what actually matters: none is an interactive
  // element, and a screen reader can hear what each one IS.
  check(
    inert.every((e) => !['a', 'button', 'input'].includes(e.tag)),
    'no placeholder is an interactive element',
  );
  const badgeNames = await page.$$eval('#cta .btn-ghost-dark.is-inert', (els) =>
    els.map((e) => ({ role: e.getAttribute('role'), text: e.textContent.replace(/\s+/g, ' ').trim() })),
  );
  check(
    badgeNames.length === 3 && badgeNames.every((b) => b.role === null && b.text.length > 0),
    'each store badge exposes its name as readable text',
    JSON.stringify(badgeNames),
  );
  const socialNames = await page.$$eval('.footer-social.is-inert', (els) =>
    els.map((e) => e.getAttribute('aria-label') || ''),
  );
  check(
    socialNames.length === 4 && socialNames.every((n) => n.trim().length > 0),
    'each footer icon carries an accessible name',
    JSON.stringify(socialNames),
  );

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
        // [ROUND 2] ';' - the separator applyDict actually splits on. This read
        // ',' and was green only because no element yet carries two pairs.
        .split(';')
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
  // [ROUND 2] The loose "at most 25 identical" check that stood here is
  // replaced by the NAMED list in 5i, which fails on any single new copy.
  void dicts.identical;

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
    const expected = api.filter((p) => p.kind === 'subscription').map((p) => p.price_xof);
    // [ROUND 2] Every check below used to run in ENGLISH ONLY - the block began
    // by clicking EN. The live Spanish page read "1500 XOF" and "12.000 XOF"
    // while English and French were fine, and the overflow guard, written
    // BECAUSE prices overflowed, never measured the two locales whose strings
    // are wider. So all of it now runs per locale.
    // [18A-7] Every /public/plans request the PAGE makes, so each locale can
    // prove it asked for ITS OWN language rather than trusting the result.
    const planRequests = [];
    page.on('request', (r) => {
      if (r.url().includes('/public/plans')) planRequests.push(r.url());
    });
    for (const lang of ['en', 'fr', 'es']) {
      const before = planRequests.length;
      await page.click(`.lang-pill button[data-lang="${lang}"]`);
      await page.waitForTimeout(1500);
      // [18A-7] The page must ASK for plan names in the language on screen.
      // Asserted on the request, not only on the result: before the backend
      // carries names in every language, a page that sent no locale would still
      // render the right names by coincidence of the fallback.
      const asked = planRequests.slice(before).map((u) => new URL(u).searchParams.get('locale'));
      check(
        asked.length > 0 && asked.every((l) => l === lang),
        `[${lang}] the page asks for plan names in ${lang}`,
        JSON.stringify(asked),
      );
      const apiNames = await page.evaluate(async (l) => {
        const r = await fetch(
          `https://backend-production-13b7.up.railway.app/public/plans?locale=${l}`,
          { credentials: 'omit' },
        );
        if (!r.ok) return null;
        return (await r.json()).plans
          .filter((p) => p.kind === 'subscription')
          .map((p) => p.name);
      }, lang);
      const shownNames = await page.$$eval('.pricing-card .pricing-name', (els) =>
        els.map((e) => e.textContent.trim()),
      );
      // The names on the cards are exactly the names the server gives for this
      // language - one derivation, rendered, not re-decided on the page.
      check(
        !!apiNames && apiNames.length === shownNames.length && apiNames.every((n) => shownNames.includes(n)),
        `[${lang}] every plan name is the server's name for ${lang}`,
        JSON.stringify({ shown: shownNames, api: apiNames }),
      );
      const cards = await page.$$eval('.pricing-card', (els) =>
        els.map((c) => {
          const a = c.querySelector('.pricing-amount');
          const n = c.querySelector('.pricing-name');
          const per = c.querySelector('.pricing-period');
          const cta = c.querySelector('.pricing-cta');
          return {
            text: a ? a.textContent : '',
            period: per ? per.textContent.trim() : '',
            cta: cta ? cta.textContent.trim() : '',
            number: a ? Number(a.textContent.replace(/[^0-9]/g, '')) : null,
            amountFits: a ? a.scrollWidth <= c.clientWidth - 40 : true,
            nameFits: n ? n.scrollWidth <= c.clientWidth - 40 : true,
          };
        }).filter((c) => c.text),
      );
      check(cards.length === expected.length, `[${lang}] one card per marketable plan`,
        `showing ${cards.length}, API has ${expected.length} subscriptions`);
      check(
        cards.length > 0 && cards.every((c) => expected.includes(c.number)),
        `[${lang}] every price on the page is a price the API returned`,
        JSON.stringify(cards.map((c) => c.number)),
      );
      check(
        cards.every((c) => c.text.includes('F CFA') && !c.text.includes('XOF')),
        `[${lang}] every price reads in F CFA, never the raw code XOF`,
        JSON.stringify(cards.map((c) => c.text)),
      );
      check(
        cards.every((c) => !/[.,\s]\d{2}(\D|$)/.test(c.text.replace(/F CFA/, ''))),
        `[${lang}] no price is shown with decimal places`,
        JSON.stringify(cards.map((c) => c.text)),
      );
      // [ROUND 2] The strings the SCRIPT builds - period, door label - carry no
      // data-i18n, so the DOM->dictionary key trace cannot see them: delete
      // `pricing.per.month` from all three locales and every check above stays
      // green while "per month" vanishes from beside the price. So assert the
      // rendered words directly. A price with no period is not a price.
      check(
        cards.every((c) => c.period.length > 0 && c.cta.length > 0),
        `[${lang}] every card states its period and labels its door`,
        JSON.stringify(cards.filter((c) => !c.period || !c.cta).map((c) => c.text)),
      );
      check(
        cards.every((c) => c.amountFits && c.nameFits),
        `[${lang}] every price and plan name fits inside its card`,
        JSON.stringify(cards.filter((c) => !(c.amountFits && c.nameFits)).map((c) => c.text)),
      );
    }
    // [ROUND 2] REMOVED: "no one-off product leaked onto the marketing page".
    // It filtered for one-off prices NOT in the subscription list, so it could
    // only ever fire after "every price is a price the API returned" had
    // already failed. The per-locale card COUNT is what catches a dropped
    // `kind` filter, and it does.
  }

  // ── 5d-bis. A PLAN NAME IS TEXT, NOT MARKUP ────────────────────────────────
  //
  // Added because the gate was 40/40 while a stored XSS was live. `plan.name` is
  // a free-text column an ADMIN edits, and it was concatenated into innerHTML.
  //
  // The payload below is the one that actually matters. `<script>` via innerHTML
  // does NOT execute, so testing with alert(1) looks safe and proves nothing;
  // `<img onerror>` does. And the damage is not a dialog - it is silently
  // repointing every sign-up and log-in door on the client's main acquisition
  // page at a phishing clone, from their own domain under their own certificate.
  await page.route('**/public/plans*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        plans: [{
          code: 'talent_monthly',
          name: 'Pro<img src=x onerror=window.__XSS__=1>',
          audience: 'talent', kind: 'subscription',
          price_xof: 1500, currency: 'XOF', duration_days: 30, sort_order: 20,
        }],
        omitted: 0,
      }),
    }),
  );
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const xss = await page.evaluate(() => ({
    fired: window.__XSS__ === 1,
    injectedImg: document.querySelectorAll('.pricing-card img').length,
    // The name must appear as literal TEXT, tags and all.
    rendersAsText: [...document.querySelectorAll('.pricing-name')].some((e) =>
      e.textContent.includes('<img')),
    // Every door still points where the page put it. If script had run, the
    // one-liner that repoints these is the payload that actually matters.
    doorsIntact: [...document.querySelectorAll('[data-auth-link]')].every((a) =>
      a.href.includes('railway.app')),
  }));
  check(!xss.fired, 'an admin-authored plan name cannot execute script', JSON.stringify(xss));
  check(xss.injectedImg === 0, 'a plan name cannot inject an element');
  check(xss.rendersAsText, 'a plan name containing markup renders as visible text');
  check(xss.doorsIntact, 'every door still points at the product, not at catalogue content');
  await page.unroute('**/public/plans*');

  // A duration that is not a canonical period must state the real number of
  // days rather than being rounded into a friendly word. 28 days reading "per
  // month" is a customer losing three days they were told they had.
  await page.route('**/public/plans*', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ plans: [{
        code: 'odd', name: 'Odd', audience: 'talent', kind: 'subscription',
        price_xof: 1500, currency: 'XOF', duration_days: 28, sort_order: 1 }], omitted: 0 }),
    }),
  );
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const period = await page.$eval('.pricing-period', (e) => e.textContent.trim()).catch(() => '');
  check(
    period.includes('28'),
    'a non-standard duration states its real length instead of rounding to a month',
    `showed "${period}"`,
  );
  await page.unroute('**/public/plans*');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // A 200 whose body is the WRONG SHAPE. `|| []` catches a missing key, not a
  // wrong-typed one: a string where an array belongs used to throw inside the
  // render, outside its try, leaving both columns blank AND skipping the link
  // decoration that follows. Added because the fix for it was untested.
  await page.route('**/public/plans*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ plans: 'not-an-array' }) }),
  );
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const wrongShape = await page.evaluate(() => ({
    cards: document.querySelectorAll('.pricing-card').length,
    doorsDecorated: [...document.querySelectorAll('[data-auth-link]')]
      .every((a) => new URL(a.href).searchParams.get('lang')),
  }));
  check(wrongShape.cards > 0, 'a wrong-shaped body still renders the section',
    JSON.stringify(wrongShape));
  check(wrongShape.doorsDecorated, 'a wrong-shaped body does not strand the doors without a language');
  await page.unroute('**/public/plans*');

  // TWO LANGUAGE SWITCHES IN FLIGHT AT ONCE. The slow one must not win. This is
  // the ADR-024 hand-off failure wearing a different hat: a late French render
  // rewriting every door to ?lang=fr under an English page. Added because the
  // fix for it was untested - the guard existed and nothing drove it.
  let slow = true;
  await page.route('**/public/plans*', async (route) => {
    if (slow) { slow = false; await new Promise((r) => setTimeout(r, 2500)); }
    await route.continue();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  await page.click('.lang-pill button[data-lang="en"]');   // starts the slow one
  await page.waitForTimeout(200);
  await page.click('.lang-pill button[data-lang="es"]');   // overtakes it
  await page.waitForTimeout(4500);
  const raced = await page.evaluate(() => ({
    html: document.documentElement.getAttribute('lang'),
    langs: [...new Set([...document.querySelectorAll('[data-auth-link]')]
      .map((a) => new URL(a.href).searchParams.get('lang')))],
  }));
  check(
    raced.langs.length === 1 && raced.langs[0] === raced.html,
    'a slow render cannot overwrite a newer language',
    JSON.stringify(raced),
  );
  await page.unroute('**/public/plans*');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // ── 5e. THE FAILURE PATH, DRIVEN RATHER THAN REASONED ──────────────────────
  //
  // This is the assertion Playwright can make and a unit test cannot: with the
  // API returning 500, the section must still be there. Never blank, never a 0,
  // and never a price the PAGE'S OWN CODE kept from the successful load a
  // moment ago.
  //
  // [ROUND 2] This used to say it proved "never a price remembered", full
  // stop. It cannot prove that about the HTTP cache: page.route answers IN
  // FRONT of the browser cache, so a cached 200 is unobservable here. What it
  // proves is that nothing in index.html persists a price. The HTTP cache is
  // bounded instead - five minutes, stated in the route's header, and never
  // for a partial catalogue - and the backend unit suite pins those headers.
  // Everything after this point deliberately breaks the API, so the console
  // check is taken against what the page logged BEFORE we broke it.
  const errorsBeforeFailureTest = consoleErrors.length;
  // [ROUND 2] The detail string used to be read at the END of the run, after the
  // deliberate 500s, so a passing check printed "Failed to load resource: 500"
  // beside "ok". Snapshot the errors that actually count, here.
  const errorsThatCount = consoleErrors.slice(0, errorsBeforeFailureTest);
  await page.route('**/public/plans*', (route) => route.fulfill({ status: 500, body: '{}' }));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const degraded = await page.evaluate(() => ({
    cards: document.querySelectorAll('.pricing-card').length,
    amounts: document.querySelectorAll('.pricing-amount').length,
    pending: document.querySelectorAll('.pricing-pending').length,
    // [ROUND 2] Counting the node is not the same as saying something: the
    // text comes from `pricing.seeAtSignup` via script, invisible to the key
    // trace. An empty pending line is a blank card with a door.
    pendingText: [...document.querySelectorAll('.pricing-pending')].every(
      (e) => e.textContent.trim().length > 0),
    doors: document.querySelectorAll('.pricing-card a[data-auth-link]').length,
    zeros: [...document.querySelectorAll('.pricing-card')].filter((e) =>
      /(^|\D)0(\D|$)/.test(e.textContent),
    ).length,
  }));
  check(degraded.cards > 0, 'the pricing section still renders when the API is down',
    JSON.stringify(degraded));
  check(degraded.amounts === 0, 'no figure is shown when the API is down');
  check(degraded.pending > 0 && degraded.pendingText,
    'it says where to find the real price instead');
  check(degraded.doors > 0, 'the doors still work when the API is down');
  check(degraded.zeros === 0, 'a failed fetch never renders a 0');
  await page.screenshot({ path: `${OUT}/05-pricing-degraded.png` });
  await page.unroute('**/public/plans*');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // ── 5f. THE PAGE MUST SURVIVE A BROWSER THAT BLOCKS STORAGE ────────────────
  //
  // The worst finding of the review, reproduced live: with localStorage
  // throwing, 202 of 208 translatable nodes rendered EMPTY - the entire
  // marketing site reduced to a few stray words. One uncaught getItem on the
  // only init path took everything with it.
  //
  // Not exotic: iOS Safari "Block All Cookies", Chrome's "Don't allow sites to
  // save data", Firefox "Block cookies: All", kiosk browsers, some in-app
  // webviews - in a mobile-first launch market.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(() => {
      const boom = () => { throw new DOMException('blocked', 'SecurityError'); };
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: () => ({ getItem: boom, setItem: boom, removeItem: boom }),
      });
    });
    const p2 = await ctx.newPage();
    await p2.goto(BASE, { waitUntil: 'networkidle' });
    await p2.waitForTimeout(2500);
    const blocked = await p2.evaluate(() => {
      const all = [...document.querySelectorAll('[data-i18n]')];
      return { total: all.length, empty: all.filter((e) => !e.textContent.trim()).length };
    });
    check(
      blocked.total > 0 && blocked.empty === 0,
      'the page renders fully when the browser blocks storage',
      `${blocked.empty} of ${blocked.total} nodes empty`,
    );
    await p2.screenshot({ path: `${OUT}/06-storage-blocked.png`, fullPage: true });
    await ctx.close();
  }

  // ── 5g. A DICTIONARY THAT WILL NOT LOAD MUST NOT BLANK THE PAGE ────────────
  //
  // Same blank page by a different route: `loadDict` did not check `res.ok`, so
  // a 503 on fr.json threw inside setLang and aborted it.
  //
  // [ROUND 2] The first version of this test was VACUOUS, and a red proof that
  // stayed green is how that surfaced. It reloaded the shared page, whose stored
  // language was English by then, so the broken French file was never requested
  // at all - and it asserted "the previous language stays on screen", which is
  // only ever true on a SECOND switch. On FIRST load there is no previous
  // language: the markup's data-i18n nodes are empty.
  //
  // So this now forces the case that actually blanked the page: a FRESH visitor
  // whose language is French, with fr.json failing on the very first load.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(() => {
      try { localStorage.setItem('bigup.lang', 'fr'); } catch (_) { /* n/a */ }
    });
    let frRequested = 0;
    await ctx.route('**/i18n/fr.json', (route) => {
      frRequested += 1;
      return route.fulfill({ status: 503, body: '{}' });
    });
    const p5 = await ctx.newPage();
    await p5.goto(BASE, { waitUntil: 'networkidle' });
    await p5.waitForTimeout(2500);
    const dictDown = await p5.evaluate(() => {
      const all = [...document.querySelectorAll('[data-i18n]')];
      return {
        total: all.length,
        empty: all.filter((e) => !e.textContent.trim()).length,
        lang: document.documentElement.getAttribute('lang'),
      };
    });
    // The precondition the old test never had: the broken file WAS asked for.
    check(frRequested > 0, 'the failing dictionary is actually requested', `${frRequested} request(s)`);
    check(
      dictDown.total > 0 && dictDown.empty === 0 && dictDown.lang !== 'fr',
      'a first-load dictionary failure falls back to another language, not a blank page',
      JSON.stringify(dictDown),
    );
    await ctx.close();
  }

  // ── 5g-bis. TWO CLICKS, AND THE SLOWER DICTIONARY MUST NOT WIN ─────────────
  //
  // Reproduced by the review with two ORDINARY clicks 120ms apart, no
  // interception: click EN then FR and the page ended up ENGLISH with `fr` in
  // storage, because the second dictionary was already cached and resolved
  // first, so the first click's applyDict landed last and won. The user sees
  // "the language switcher is broken", and the DOM and storage disagree until
  // the next reload.
  //
  // Delaying ONE dictionary makes the ordering deterministic instead of
  // depending on which file happens to be cached.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const p4 = await ctx.newPage();
    let slowDict = true;
    await ctx.route('**/i18n/en.json', async (route) => {
      if (slowDict) { slowDict = false; await new Promise((r) => setTimeout(r, 2500)); }
      await route.continue();
    });
    await p4.goto(BASE, { waitUntil: 'domcontentloaded' });
    await p4.waitForTimeout(400);
    await p4.click('.lang-pill button[data-lang="en"]');  // slow
    await p4.waitForTimeout(150);
    // [ROUND 2] The final click is SPANISH on purpose. The init fallback order
    // after an English start is fr, es - so when this test clicked FRENCH last,
    // a buggy init that "fell back" after being superseded landed on French by
    // coincidence and the overwrite was invisible. A red proof stayed green
    // over exactly that. Spanish is not next in line, so a fallback that
    // overwrites the visitor's choice now shows up as the wrong language.
    await p4.click('.lang-pill button[data-lang="es"]');  // overtakes
    await p4.waitForTimeout(4500);
    const raced = await p4.evaluate(() => ({
      html: document.documentElement.getAttribute('lang'),
      pressed: [...document.querySelectorAll('.lang-pill button')]
        .filter((b) => b.getAttribute('aria-pressed') === 'true')
        .map((b) => b.dataset.lang),
    }));
    check(
      raced.html === 'es' && raced.pressed.length === 1 && raced.pressed[0] === 'es',
      'the language clicked LAST wins, even when its dictionary arrives first',
      JSON.stringify(raced),
    );
    await ctx.close();
  }

  // ── 5h. A GUESSED LANGUAGE IS NOT HANDED OVER AS A CHOICE ──────────────────
  //
  // The app writes a handed `?lang=` to the account, and that decides the
  // language of every email the user gets on every device (18-11 H6). A browser
  // default is a guess; only a click is a choice. A fresh visitor who has
  // touched nothing must therefore send NO lang at all.
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
    });
    const p3 = await ctx.newPage();
    await p3.goto(BASE, { waitUntil: 'networkidle' });
    await p3.waitForTimeout(2000);
    const handed = await p3.$$eval('[data-auth-link]', (els) =>
      els.map((e) => new URL(e.href).searchParams.get('lang')),
    );
    check(
      handed.length > 0 && handed.every((l) => l === null),
      'an untouched visitor hands over no language at all',
      `sent ${JSON.stringify([...new Set(handed)])}`,
    );
    // ...and one click makes it a choice, which MUST be handed over.
    await p3.click('.lang-pill button[data-lang="fr"]');
    await p3.waitForTimeout(1200);
    const afterClick = await p3.$$eval('[data-auth-link]', (els) =>
      els.map((e) => new URL(e.href).searchParams.get('lang')),
    );
    check(
      afterClick.length > 0 && afterClick.every((l) => l === 'fr'),
      'a clicked language IS handed over',
      `sent ${JSON.stringify([...new Set(afterClick)])}`,
    );
    await ctx.close();
  }

  // ── 5i. [ROUND 2] WHAT NOTHING ASSERTED ────────────────────────────────────
  //
  // The acceptance audit listed things the gate would pass with deleted.
  const presence = await page.evaluate(() => {
    const coming = document.querySelector('[data-i18n="cta.apps.comingSoon"]');
    const nav = document.getElementById('site-nav');
    return {
      pricingSection: !!document.getElementById('pricing'),
      footerToPricing: [...document.querySelectorAll('footer a')].some(
        (a) => a.getAttribute('href') === '#pricing'),
      comingSoon: !!coming && coming.textContent.trim().length > 0 && coming.offsetParent !== null,
      header: !!nav && nav.getBoundingClientRect().height > 0,
    };
  });
  // The Pricing link used to be a mailto. Revert it and this goes red.
  check(presence.pricingSection && presence.footerToPricing,
    'the pricing section exists and the footer Pricing link goes to it', JSON.stringify(presence));
  // De-controlling the badges is only honest if the line saying the apps are
  // coming is actually there. Deleting it used to leave the gate green.
  check(presence.comingSoon, 'the "mobile apps are coming" line renders');
  // NOT asserted: "the site header renders". The review worried that the
  // one-sided 320px guard would pass with the header deleted - true of that
  // guard alone, but not of the gate: sections 4, 5 and 5c DRIVE the header's
  // language pill and login disclosure, so with the header hidden the gate
  // cannot click them and dies (red-proofed: display:none on #site-nav ->
  // TimeoutError, exit 1). A separate check could only ever fail in a run that
  // had already failed, so it was written, red-proofed, and removed.
  void presence.header;

  // ORPHANS, DICTIONARY -> DOM. The key check above runs DOM -> dictionary only,
  // so a string could lose its last render site and nothing would say so. These
  // ten are known: eight were already unused in the client's finalised build,
  // and two (hero.primaryCta, hero.secondaryCta) are the client's "Download the
  // app" / "Discover" copy whose buttons became the two doors. They are KEPT,
  // because the owner ruled the client's copy stays; what fails is a NEW one.
  const KNOWN_ORPHANS = [
    'footer.availability', 'footer.careers', 'footer.legalMentions', 'form.required',
    'hero.primaryCta', 'hero.secondaryCta', 'legal.back', 'legal.stub.body',
    'legal.stub.title', 'logo.brandAlt',
  ];
  const orphans = await page.evaluate(async (known) => {
    const [en, html] = await Promise.all([
      fetch('i18n/en.json').then((r) => r.json()),
      fetch(location.pathname).then((r) => r.text()),
    ]);
    const used = new Set();
    for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) used.add(m[1]);
    for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
      for (const pair of m[1].split(';')) {
        const k = pair.split(':')[1];
        if (k) used.add(k.trim());
      }
    }
    // Keys the script reads by name (pricing periods, CTAs, currency label).
    for (const m of html.matchAll(/['"]([a-z]+(?:\.[A-Za-z0-9_]+)+)['"]/g)) used.add(m[1]);
    return Object.keys(en).filter((k) => !used.has(k) && !known.includes(k));
  }, KNOWN_ORPHANS);
  check(orphans.length === 0, 'no translation key has lost its last render site', orphans.join(', '));

  // COPIED, NOT TRANSLATED. This was "at most 25 identical strings" against 17,
  // so eight could be copied untranslated and still pass. Now the legitimately
  // identical keys are NAMED - numbers, names, codes, brand and store names -
  // and anything else identical in all three languages fails.
  const KNOWN_IDENTICAL = [
    'country.bfa', 'country.tgo', 'cta.appstore.name', 'cta.googleplay.name',
    'cta.webapp.name', 'footer.blog', 'footer.cookies', 'footer.edtech', 'hero.card.name',
    'hero.card.scoreValue', 'hero.card.tagMore', 'hero.float.2.value',
    'hero.proof.1.value', 'hero.proof.2.value', 'hero.proof.3.value', 'lang.en', 'lang.es',
    'lang.fr', 'logo.brandAlt', 'logo.name', 'phone.greeting.name',
    'phone.requests.sample.name', 'phone.scoreValue', 'pricing.currency', 'stats.1.value',
    'stats.2.value', 'stats.3.value', 'stats.4.value', 'temo.1.initial', 'temo.2.initial',
    'temo.3.initial',
  ];
  const copied = await page.evaluate(async (known) => {
    const [en, fr, es] = await Promise.all(
      ['en', 'fr', 'es'].map((l) => fetch(`i18n/${l}.json`).then((r) => r.json())));
    return Object.keys(en).filter((k) => en[k] === fr[k] && fr[k] === es[k] && !known.includes(k));
  }, KNOWN_IDENTICAL);
  check(copied.length === 0, 'no string is copied untranslated across all three languages',
    copied.join(', '));

  // ── 6. no admin surface advertised ─────────────────────────────────────────
  const adminish = await page.$$eval('a[href]', (els) =>
    els.map((e) => e.href).filter((h) => /admin/i.test(h)),
  );
  check(adminish.length === 0, 'no link points at an admin surface', adminish.join(', '));

  // ── 7. PHONE WIDTHS: nothing scrolls sideways, and the menu can be opened ──
  //
  // [ROUND 2] THIS SECTION USED TO BE WRONG TWICE OVER, and the correction is
  // the point of it.
  //
  // It pinned "320px overflow no worse than the client's baseline" (en 345,
  // fr 373, es 427) and blamed THE HEADER ROW for all three. Both halves were
  // false, found only by looking at the live page at 390px:
  //
  //   1. The sideways scroll was never the header. Bisected element by element,
  //      it was the "Our methodology" heading: one long word at the 2rem floor
  //      of a wide display face ("autodeclaradas", "auto-déclarées") is wider
  //      than a phone. Spanish, which this epic added, overflowed at EVERY phone
  //      width up to 412px - not only at 320. Fixed in CSS (phone-only
  //      hyphenation), no copy or size changed.
  //   2. The header DID have a defect, and this guard could not see it: the nav
  //      CLIPS rather than scrolls, so its overflow never reaches scrollWidth.
  //      What it clipped was the MENU BUTTON - off-screen at 360-412px in all
  //      three languages, and the only way on a phone to the navigation and to
  //      "Se connecter". Fixed by moving the header's duplicate "Commencer" into
  //      the drawer below `sm`.
  //
  // A guard that measured the wrong thing, pinned at a number, would have let
  // both stand forever. So: no baseline. Four real phone widths, every locale,
  // and the menu must be on screen AND open onto both log-in doors.
  const PHONES = [320, 360, 390, 412];
  for (const w of PHONES) {
    await page.setViewportSize({ width: w, height: 760 });
    for (const lang of ['fr', 'en', 'es']) {
      await page.click(`.lang-pill button[data-lang="${lang}"]`);
      await page.waitForTimeout(350);
      const m = await page.evaluate(() => {
        const t = document.getElementById('menu-toggle').getBoundingClientRect();
        return {
          sw: document.documentElement.scrollWidth,
          vw: window.innerWidth,
          toggle: { left: Math.round(t.left), right: Math.round(t.right), w: Math.round(t.width) },
        };
      });
      check(m.sw <= m.vw, `${w}px ${lang}: nothing scrolls sideways`, `page ${m.sw}px on ${m.vw}px`);
      check(
        m.toggle.w > 0 && m.toggle.left >= 0 && m.toggle.right <= m.vw,
        `${w}px ${lang}: the menu button is fully on screen`,
        JSON.stringify(m.toggle),
      );
    }
    await page.screenshot({ path: `${OUT}/04-${w}-es.png`, fullPage: false });
  }
  // And it OPENS onto the two doors - "on screen" is not "usable". Driven with
  // a real click at the narrowest width, in the launch language.
  await page.setViewportSize({ width: 320, height: 760 });
  await page.click('.lang-pill button[data-lang="fr"]');
  await page.waitForTimeout(300);
  await page.click('#menu-toggle');
  await page.waitForTimeout(300);
  const drawer = await page.evaluate(() => {
    const d = document.getElementById('mobile-menu');
    const vw = window.innerWidth;
    const doors = [...d.querySelectorAll('a[data-auth-link]')].filter((a) => {
      const r = a.getBoundingClientRect();
      return a.offsetParent !== null && r.width > 0 && r.right <= vw;
    });
    return { open: !d.classList.contains('hidden'), doors: doors.length };
  });
  check(drawer.open && drawer.doors === 2, 'at 320px the menu opens onto both log-in doors',
    JSON.stringify(drawer));
  await page.screenshot({ path: `${OUT}/04-320-drawer.png` });
  await page.click('#menu-toggle');

  check(
    errorsBeforeFailureTest === 0,
    'no console errors during normal operation',
    errorsThatCount.slice(0, 2).join(' | '),
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
