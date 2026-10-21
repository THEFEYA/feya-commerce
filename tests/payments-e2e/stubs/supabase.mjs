// Supabase client double: rpc() executes the real SQL function in PostgreSQL via psql.
import {execFileSync} from 'node:child_process';

function literal(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : `'${value}'`;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return `'${text.replace(/'/g, "''")}'`;
}

export const calls = [];
export function createClient() {
  return {
    async rpc(name, args = {}) {
      if (!/^feya_pay_[a-z0-9_]+$/.test(name)) throw new Error('unexpected rpc ' + name);
      calls.push(name);
      const params = Object.entries(args).map(([k, v]) => `${k} => ${literal(v)}`).join(', ');
      const sql = `select to_jsonb(public.${name}(${params}));`;
      try {
        const out = execFileSync('psql', ['-X', '-q', '-tA', '-v', 'ON_ERROR_STOP=1', '-d', process.env.FEYA_PAYMENTS_TEST_DB, '-c', 'set role service_role', '-c', sql], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
        const line = out.trim().split('\n').filter(Boolean).pop() || 'null';
        return {data: JSON.parse(line), error: null};
      } catch (error) {
        const stderr = String(error.stderr || error.message);
        const match = /ERROR:\s+([^\n]+)/.exec(stderr);
        return {data: null, error: {message: match ? match[1].trim() : stderr.slice(0, 300)}};
      }
    },
  };
}
