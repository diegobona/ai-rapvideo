import Database from 'better-sqlite3';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
test('additive paid-video migration preserves existing owner-scoped tasks and enforces fixed price', () => {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  try {
    const dir = resolve('libs/database/drizzle-sqlite');
    for (const file of readdirSync(dir)
      .filter((file) => file.endsWith('.sql') && !file.startsWith('0008_'))
      .sort())
      sqlite.exec(readFileSync(resolve(dir, file), 'utf8'));
    sqlite.exec(
      "INSERT INTO user(id,email,email_verified,created_at,updated_at) VALUES('legacy-user','legacy@example.test',1,1,1); INSERT INTO video_task(id,user_id,provider,model,provider_task_id,credit_cost,status,refunded,created_at,updated_at) VALUES('legacy-task','legacy-user','autodl','minimax-h3','provider-legacy',0,'succeeded',0,1,1);",
    );
    sqlite.exec(readFileSync(resolve(dir, '0008_video_purchase.sql'), 'utf8'));
    expect(sqlite.prepare('SELECT id,status,purchase_id FROM video_task').get()).toEqual({
      id: 'legacy-task',
      status: 'succeeded',
      purchase_id: null,
    });
    expect(() =>
      sqlite.exec(
        "INSERT INTO video_purchase(id,user_id,amount,currency,generation_options,return_path,created_at,updated_at) VALUES('bad','legacy-user',1,'usd','{}','/',1,1)",
      ),
    ).toThrow('CHECK');
    expect(sqlite.pragma('foreign_key_check')).toEqual([]);
  } finally {
    sqlite.close();
  }
});
