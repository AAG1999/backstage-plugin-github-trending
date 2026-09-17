/*
 * Copyright 2026 AAG1999 / contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { TrendingRepository } from '@aag1999/plugin-github-trending-common';

const ARTICLE_RE =
  /<article\b[^>]*\bBox-row\b[^>]*>([\s\S]*?)<\/article>/gi;
const HREF_RE = /<h2\b[^>]*>[\s\S]*?href="\/([^"/]+)\/([^"/?#]+)"/i;
const DESC_RE = /<p\b[^>]*col-9[^>]*>([\s\S]*?)<\/p>/i;
const LANG_RE = /itemprop="programmingLanguage">\s*([^<]+)\s*</i;
const STARS_RE = /href="\/[^"]+\/stargazers"[^>]*>[\s\S]*?([\d,]+)\s*</i;
const FORKS_RE = /href="\/[^"]+\/(?:network\/members|forks)"[^>]*>[\s\S]*?([\d,]+)\s*</i;
const PERIOD_RE =
  /([\d,]+)\s+stars\s+(today|this week|this month)/i;

function parseCount(raw: string | undefined): number {
  if (!raw) {
    return 0;
  }
  const n = Number(raw.replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function decodeEntities(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse github.com/trending HTML into structured rows.
 * Markup is treated as unstable; keep fixtures in lockstep with GitHub.
 */
export function parseTrendingHtml(
  html: string,
  siteOrigin = 'https://github.com',
): TrendingRepository[] {
  const origin = siteOrigin.replace(/\/$/, '');
  const rows: TrendingRepository[] = [];
  const articleRe = new RegExp(ARTICLE_RE.source, ARTICLE_RE.flags);
  let rank = 0;
  for (;;) {
    const match = articleRe.exec(html);
    if (!match) {
      break;
    }
    const body = match[1];
    const href = body.match(HREF_RE);
    if (!href) {
      continue;
    }
    rank += 1;
    const owner = href[1];
    const name = href[2];
    const descMatch = body.match(DESC_RE);
    const langMatch = body.match(LANG_RE);
    const periodMatch = body.match(PERIOD_RE);
    rows.push({
      rank,
      owner,
      name,
      url: `${origin}/${owner}/${name}`,
      description: descMatch ? decodeEntities(descMatch[1]) : undefined,
      language: langMatch ? decodeEntities(langMatch[1]) : undefined,
      stars: parseCount(body.match(STARS_RE)?.[1]),
      forks: parseCount(body.match(FORKS_RE)?.[1]),
      starsInPeriod: parseCount(periodMatch?.[1]),
      periodLabel: periodMatch?.[2] ?? 'today',
    });
  }
  return rows;
}
