// Logic smoke tests for URL matching and settings normalisation.
// Run via:  npm test   (plain node, relies on native TS type stripping)
import assert from "node:assert";
import {
  escapeRegExp,
  isRule,
  isValidPattern,
  matchesUrl,
  matchingRules,
  patternForUrl,
} from "../packages/shared/src/rules.ts";
import {
  clampDelay,
  DEFAULT_SETTINGS,
  normalizeSettings,
} from "../packages/shared/src/settings.ts";

const atlassian =
  "https://id.atlassian.com/login/select-account?continue=https%3A%2F%2Fexample.atlassian.net%2Fwiki#top";

// pattern for "this page": host + path, escaped, no query or hash
assert.equal(patternForUrl(atlassian), "id\\.atlassian\\.com/login/select-account");
assert.equal(patternForUrl("https://www.example.com/"), "www\\.example\\.com");
assert.equal(patternForUrl("https://example.com/a/b/"), "example\\.com/a/b");
assert.equal(patternForUrl("chrome://settings"), null);
assert.equal(patternForUrl("not a url"), null);

// the prefilled pattern matches the page it was made from
const rule = { id: "1", pattern: patternForUrl(atlassian), selector: "#login-submit" };
assert(matchesUrl(rule, atlassian));
assert(matchesUrl(rule, "https://id.atlassian.com/login/select-account"));
assert(matchesUrl(rule, "HTTPS://ID.ATLASSIAN.COM/login/select-account"));
assert(!matchesUrl(rule, "https://id.atlassian.com/login"));
assert(!matchesUrl(rule, "https://idXatlassian.com/login/select-account"));

// free-form regular expressions
const anyLogin = { id: "2", pattern: "atlassian\\.(com|net)/login", selector: "button" };
assert(matchesUrl(anyLogin, "https://id.atlassian.net/login"));
assert(!matchesUrl(anyLogin, "https://atlassian.com/pricing"));

// invalid patterns never match and are reported as invalid
assert(!isValidPattern("("));
assert(!isValidPattern("   "));
assert(isValidPattern("example\\.com"));
assert(!matchesUrl({ id: "3", pattern: "(", selector: "a" }, "https://example.com/("));

// all matching rules apply, in list order; non-http URLs match nothing
const rules = [rule, anyLogin, { id: "4", pattern: "^https://other\\.", selector: "a" }];
assert.deepEqual(
  matchingRules(rules, atlassian).map((r) => r.id),
  ["1", "2"]
);
assert.deepEqual(matchingRules(rules, "https://other.example/"), [rules[2]]);
assert.deepEqual(matchingRules(rules, "chrome://extensions/atlassian.com/login"), []);
assert.deepEqual(matchingRules(rules, "about:blank"), []);

// escaping round-trips through RegExp
for (const s of ["a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o/p"]) {
  assert(new RegExp(`^${escapeRegExp(s)}$`).test(s));
}

// stored-rule validation
assert(isRule({ id: "x", pattern: "a", selector: "b" }));
assert(!isRule({ id: "x", pattern: "a" }));
assert(!isRule({ id: "x", pattern: "", selector: "b" }));
assert(!isRule({ id: "x", pattern: "a", emoji: "🐙" }));
assert(!isRule(null));

// delay clamping and settings normalisation
assert.equal(clampDelay("abc"), DEFAULT_SETTINGS.delayMs);
assert.equal(clampDelay(-5), 0);
assert.equal(clampDelay(99_999), 60_000);
assert.equal(clampDelay(250.4), 250);
assert.equal(clampDelay("1200"), 1200);
assert.deepEqual(normalizeSettings(undefined), DEFAULT_SETTINGS);
assert.deepEqual(normalizeSettings({ delayMs: "1200" }), { delayMs: 1200 });
assert.deepEqual(normalizeSettings({}), DEFAULT_SETTINGS);

console.log("all rules tests passed");
