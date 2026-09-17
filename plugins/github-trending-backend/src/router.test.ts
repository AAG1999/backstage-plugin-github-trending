/*
 * Copyright 2026 AAG1999 / contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { mockServices } from '@backstage/backend-test-utils';
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createRouter } from './router';

const fixture = fs.readFileSync(
  path.join(__dirname, '__fixtures__/trending.html'),
  'utf8',
);

describe('github-trending router', () => {
  it('returns parsed repositories and caches the second call', async () => {
    const fetchFn = jest.fn(async () => new Response(fixture, { status: 200 }));
    const router = await createRouter({
      logger: mockServices.logger.mock(),
      config: mockServices.rootConfig(),
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    const app = express().use(router);

    const first = await request(app).get('/repositories');
    expect(first.status).toBe(200);
    expect(first.body.repositories).toHaveLength(2);
    expect(first.body.repositories[0].name).toBe('open-code-review');

    const second = await request(app).get('/repositories');
    expect(second.status).toBe(200);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('returns an empty list when upstream HTML has no articles', async () => {
    const fetchFn = jest.fn(
      async () => new Response('<html></html>', { status: 200 }),
    );
    const router = await createRouter({
      logger: mockServices.logger.mock(),
      config: mockServices.rootConfig(),
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    const app = express().use(router);
    const res = await request(app).get('/repositories');
    expect(res.status).toBe(200);
    expect(res.body.repositories).toEqual([]);
  });
});
