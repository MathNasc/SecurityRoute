/**
 * Script de Backup e Inventário — Fase 1 (Supabase ➔ Backup Seguro)
 *
 * Executa a extração completa dos dados da tabela 'occurrences' (e outras que existirem),
 * gerando:
 * 1. backup/occurrences_backup.json (para conferência e validação campo a campo)
 * 2. backup/occurrences_backup.sql  (para importação reproduzível no PostgreSQL do Oracle)
 * 3. Inventário com contagem, IDs, colunas e integridade.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[ERRO] SUPABASE_URL e/ou SUPABASE_KEY não configuradas no ambiente.');
  console.error('Por favor, defina as variáveis no arquivo .env ou no comando:');
  console.error('SUPABASE_URL="https://xxx.supabase.co" SUPABASE_KEY="xxx" npx tsx scripts/backup-supabase.ts');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runBackup() {
  console.log('───────────────────────────────────────────────────────');
  console.log('Iniciando Fase 1: Inventário e Backup Completo do Supabase');
  console.log('───────────────────────────────────────────────────────');
  console.log(`Endpoint Supabase: ${supabaseUrl}`);

  const backupDir = path.resolve(process.cwd(), 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Contagem total
  const { count, error: countErr } = await supabase
    .from('occurrences')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.error('[ERRO] Falha ao consultar tabela occurrences no Supabase:', countErr);
    process.exit(1);
  }

  console.log(`[INFO] Total de registros identificados em 'occurrences': ${count ?? 0}`);

  // 2. Extração paginada (para suportar qualquer volume sem limite de 1000)
  const pageSize = 1000;
  let allOccurrences: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('occurrences')
      .select('*')
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      console.error(`[ERRO] Falha na página ${page} (${from}-${to}):`, error);
      process.exit(1);
    }

    if (data && data.length > 0) {
      allOccurrences.push(...data);
      console.log(`  ➔ Extraídos registros ${from} até ${from + data.length - 1}...`);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  console.log(`[SUCESSO] Total extraído com sucesso: ${allOccurrences.length} registros.`);

  // 3. Gravar backup JSON independente
  const jsonPath = path.join(backupDir, 'occurrences_backup.json');
  fs.writeFileSync(jsonPath, JSON.stringify(allOccurrences, null, 2), 'utf-8');
  console.log(`[ARQUIVO] Backup JSON salvo em: ${jsonPath}`);

  // 4. Gravar backup SQL compatível com PostgreSQL Oracle
  const sqlLines: string[] = [
    '-- Backup de Ocorrências exportado do Supabase',
    `-- Data do backup: ${new Date().toISOString()}`,
    `-- Total de registros: ${allOccurrences.length}`,
    '',
    '-- Garante que a tabela existe com a estrutura exata',
    'CREATE TABLE IF NOT EXISTS occurrences (',
    '  id SERIAL PRIMARY KEY,',
    '  type VARCHAR(50) NOT NULL,',
    '  lat DOUBLE PRECISION NOT NULL,',
    '  lng DOUBLE PRECISION NOT NULL,',
    '  description TEXT NOT NULL,',
    '  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL',
    ');',
    '',
  ];

  if (allOccurrences.length > 0) {
    sqlLines.push('-- Inserção dos registros preservando IDs e timestamps originais');
    for (const occ of allOccurrences) {
      const id = Number(occ.id);
      const type = String(occ.type).replace(/'/g, "''");
      const lat = Number(occ.lat);
      const lng = Number(occ.lng);
      const desc = String(occ.description || '').replace(/'/g, "''");
      const createdAt = occ.created_at || occ.createdAt || new Date().toISOString();

      sqlLines.push(
        `INSERT INTO occurrences (id, type, lat, lng, description, created_at) ` +
        `VALUES (${id}, '${type}', ${lat}, ${lng}, '${desc}', '${createdAt}') ` +
        `ON CONFLICT (id) DO NOTHING;`
      );
    }

    // Atualização da sequence do PostgreSQL para evitar conflitos futuros
    sqlLines.push('');
    sqlLines.push('-- Ajuste da sequence para o maior ID existente');
    sqlLines.push(
      `SELECT setval(pg_get_serial_sequence('occurrences', 'id'), COALESCE((SELECT MAX(id) FROM occurrences), 1));`
    );
  }

  const sqlPath = path.join(backupDir, 'occurrences_backup.sql');
  fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf-8');
  console.log(`[ARQUIVO] Dump SQL salvo em: ${sqlPath}`);

  // 5. Relatório do inventário
  const sample = allOccurrences.slice(0, 3);
  const minId = allOccurrences.length ? Math.min(...allOccurrences.map(o => o.id)) : 0;
  const maxId = allOccurrences.length ? Math.max(...allOccurrences.map(o => o.id)) : 0;

  console.log('───────────────────────────────────────────────────────');
  console.log('INVENTÁRIO DOS DADOS EXTRAÍDOS:');
  console.log(`- Tabela: occurrences`);
  console.log(`- Quantidade de registros extraídos: ${allOccurrences.length}`);
  console.log(`- Menor ID: ${minId}`);
  console.log(`- Maior ID: ${maxId}`);
  console.log(`- Colunas identificadas nos registros: ${allOccurrences.length ? Object.keys(allOccurrences[0]).join(', ') : 'N/A'}`);
  console.log('Amostra de registros:');
  console.log(JSON.stringify(sample, null, 2));
  console.log('───────────────────────────────────────────────────────');
  console.log('Fase 1 concluída com sucesso.');
}

runBackup().catch((err) => {
  console.error('[ERRO CRÍTICO] Falha durante execução do backup:', err);
  process.exit(1);
});
