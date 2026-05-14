import test from "node:test";
import assert from "node:assert/strict";

import {
  formatLanguageLabel,
  isAppLocaleCode,
  isTeacherLanguageCode,
  isTeacherNativeLanguageCode,
  resolveLanguageCode,
  resolveLanguageName,
  resolveLanguageNativeName,
} from "../dist/enums/languages.js";

test("resolveLanguageCode falls back to en for empty or unknown locale", () => {
  assert.equal(resolveLanguageCode(""), "en");
  assert.equal(resolveLanguageCode("xx"), "en");
});

test("resolveLanguageCode parses Accept-Language lists", () => {
  assert.equal(resolveLanguageCode("en-US,en;q=0.9,de;q=0.8"), "en");
  assert.equal(resolveLanguageCode("ZH-cn,zh;q=0.9,en;q=0.8"), "zh");
});

test("resolveLanguageCode normalizes underscores and case", () => {
  assert.equal(resolveLanguageCode("de_DE"), "de");
  assert.equal(resolveLanguageCode("PT-br"), "pt");
});

test("language code guards accept only supported values", () => {
  assert.equal(isAppLocaleCode("zh"), true);
  assert.equal(isAppLocaleCode("ga"), false);
  assert.equal(isTeacherLanguageCode("ga"), true);
  assert.equal(isTeacherLanguageCode("xx"), false);
  assert.equal(isTeacherNativeLanguageCode("ga"), false);
  assert.equal(isTeacherNativeLanguageCode("ru"), true);
});

test("language names and labels resolve for known languages", () => {
  assert.equal(resolveLanguageName("pl-PL"), "Polish");
  assert.equal(resolveLanguageNativeName("pl-PL"), "Polski");
  assert.equal(formatLanguageLabel("pl"), "Polish (Polski)");
});

test("unknown language names fall back to the raw code", () => {
  assert.equal(resolveLanguageName("xx"), "xx");
  assert.equal(resolveLanguageNativeName("xx"), "xx");
});
