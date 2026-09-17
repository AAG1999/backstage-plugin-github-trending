/*
 * Copyright 2026 AAG1999 / contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

type Entry<T> = { value: T; expiresAt: number };

/** Process-local TTL cache so many portal users share one GitHub fetch. */
export class MemoryTtlCache<T> {
  private readonly store = new Map<string, Entry<T>>();

  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) {
      return undefined;
    }
    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}
