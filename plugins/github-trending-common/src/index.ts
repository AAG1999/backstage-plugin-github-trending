/*
 * Copyright 2026 AAG1999 / contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/** Time window on github.com/trending. */
export type TrendingSince = 'daily' | 'weekly' | 'monthly';

/** One repository row from GitHub Trending. */
export type TrendingRepository = {
  rank: number;
  owner: string;
  name: string;
  url: string;
  description?: string;
  language?: string;
  stars: number;
  forks: number;
  starsInPeriod: number;
  periodLabel: string;
};

export type TrendingQuery = {
  since?: TrendingSince;
  language?: string;
  spokenLanguageCode?: string;
};

export type TrendingResponse = {
  fetchedAt: string;
  since: TrendingSince;
  language?: string;
  spokenLanguageCode?: string;
  sourceUrl: string;
  repositories: TrendingRepository[];
};
