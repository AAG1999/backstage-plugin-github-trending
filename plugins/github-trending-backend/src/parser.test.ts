/*
 * Copyright 2026 AAG1999 / contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import fs from 'fs';
import path from 'path';
import { parseTrendingHtml } from './parser';

const fixture = fs.readFileSync(
  path.join(__dirname, '__fixtures__/trending.html'),
  'utf8',
);

describe('parseTrendingHtml', () => {
  it('parses classic Box-row articles', () => {
    const rows = parseTrendingHtml(fixture);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      rank: 1,
      owner: 'alibaba',
      name: 'open-code-review',
      url: 'https://github.com/alibaba/open-code-review',
      description:
        "Fast, efficient, battle-tested at Alibaba's scale. OpenAI & Anthropic compatible.",
      language: 'Go',
      stars: 34422,
      forks: 2446,
      starsInPeriod: 3290,
      periodLabel: 'today',
    });
    expect(rows[1].owner).toBe('cloudflare');
    expect(rows[1].starsInPeriod).toBe(3606);
  });

  it('returns an empty list when GitHub renders no rows', () => {
    expect(parseTrendingHtml('<html><body>Trending</body></html>')).toEqual(
      [],
    );
  });
});
