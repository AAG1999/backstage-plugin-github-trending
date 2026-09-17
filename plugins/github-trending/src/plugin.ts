/*
 * Copyright 2026 AAG1999 / contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import {
  createApiFactory,
  createPlugin,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';
import { githubTrendingApiRef, GithubTrendingClient } from './api';

export const githubTrendingPlugin = createPlugin({
  id: 'github-trending',
  apis: [
    createApiFactory({
      api: githubTrendingApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) =>
        new GithubTrendingClient({ discoveryApi, fetchApi }),
    }),
  ],
});
