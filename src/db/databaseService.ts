/**
 * Database Service — Camada de Acesso a Dados do SecurityRoute
 *
 * Persistência relacional em PostgreSQL gerenciada via Drizzle ORM.
 * Desacoplada de fornecedores específicos.
 */

import { db } from './index.js';
import { occurrences } from './schema.js';
import { desc, count } from 'drizzle-orm';

export interface Occurrence {
  id: number;
  type: string;
  lat: number;
  lng: number;
  description: string;
  createdAt: string;
  created_at?: string;
}

const initialSeedData: Occurrence[] = [
  { id: 1, type: 'assalto', lat: -23.5289, lng: -46.3635, description: 'Roubo de celular', createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: 2, type: 'assalto', lat: -23.5398, lng: -46.3475, description: 'Assalto à mão armada', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: 3, type: 'assalto', lat: -23.5502, lng: -46.6341, description: 'Roubo de veículo', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  { id: 4, type: 'furto', lat: -23.6949, lng: -46.7587, description: 'Furto em estabelecimento', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: 5, type: 'tentativa_assalto', lat: -23.6685, lng: -46.769, description: 'Tentativa frustrada', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
  { id: 6, type: 'area_perigosa', lat: -23.6347, lng: -46.7549, description: 'Área com alto risco noturno', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() },
  { id: 7, type: 'presenca_suspeita', lat: -23.5512, lng: -46.6180, description: 'Grupo suspeito na calçada', createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
  { id: 8, type: 'vandalismo', lat: -23.5448, lng: -46.6388, description: 'Ponto de ônibus depredado', createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
  { id: 9, type: 'rua_escura', lat: -23.5620, lng: -46.6540, description: 'Sem iluminação pública', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: 10, type: 'falta_iluminacao', lat: -23.5780, lng: -46.6710, description: 'Lâmpadas queimadas', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString() },
  { id: 11, type: 'alagamento', lat: -23.5664, lng: -46.5073, description: 'Via com 30cm de água', createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: 12, type: 'enchente', lat: -23.5844, lng: -46.5492, description: 'Via completamente alagada', createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
  { id: 13, type: 'alagamento', lat: -23.579, lng: -46.5798, description: 'Trânsito interrompido', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() },
  { id: 14, type: 'buraco_via', lat: -23.5603, lng: -46.5996, description: 'Buraco grande na pista', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString() },
];

let inMemoryStore: Occurrence[] = [...initialSeedData];
let nextId = 15;

const isProduction = process.env.NODE_ENV === 'production';

export const databaseService = {
  /**
   * Obtém todas as ocorrências salvas no PostgreSQL.
   */
  async getAllOccurrences(): Promise<Occurrence[]> {
    try {
      const records = await db
        .select()
        .from(occurrences)
        .orderBy(desc(occurrences.createdAt));

      return records.map((r: any) => ({
        id: r.id,
        type: r.type,
        lat: r.lat,
        lng: r.lng,
        description: r.description,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      }));
    } catch (error) {
      if (isProduction) {
        console.error('[DatabaseService] Production database query failed:', error);
        throw error;
      }
      console.warn('[DatabaseService] Development fallback: returning in-memory occurrences.');
      return inMemoryStore;
    }
  },

  /**
   * Registra uma nova ocorrência no PostgreSQL.
   */
  async createOccurrence(payload: {
    type: string;
    lat: number;
    lng: number;
    description: string;
  }): Promise<Occurrence> {
    try {
      const [inserted] = await db
        .insert(occurrences)
        .values({
          type: payload.type,
          lat: payload.lat,
          lng: payload.lng,
          description: payload.description,
        })
        .returning();

      return {
        id: inserted.id,
        type: inserted.type,
        lat: inserted.lat,
        lng: inserted.lng,
        description: inserted.description,
        createdAt: inserted.createdAt ? new Date(inserted.createdAt).toISOString() : new Date().toISOString(),
      };
    } catch (error) {
      if (isProduction) {
        console.error('[DatabaseService] Production database insert failed:', error);
        throw error;
      }
      console.warn('[DatabaseService] Development fallback: saving occurrence to in-memory store.');
      const newOcc: Occurrence = {
        id: nextId++,
        type: payload.type,
        lat: payload.lat,
        lng: payload.lng,
        description: payload.description,
        createdAt: new Date().toISOString(),
      };
      inMemoryStore.unshift(newOcc);
      return newOcc;
    }
  },

  /**
   * Popula dados iniciais caso a tabela esteja vazia.
   */
  async seedOccurrences(): Promise<{ message: string }> {
    try {
      const [countResult] = await db.select({ value: count() }).from(occurrences);
      const total = Number(countResult?.value || 0);

      if (total === 0) {
        const seedValues = initialSeedData.map(d => ({
          type: d.type,
          lat: d.lat,
          lng: d.lng,
          description: d.description,
        }));
        await db.insert(occurrences).values(seedValues);
        return { message: 'Seeded successfully' };
      }
      return { message: 'Already seeded' };
    } catch (error) {
      if (isProduction) {
        console.error('[DatabaseService] Production database seed failed:', error);
        throw error;
      }
      console.warn('[DatabaseService] Development fallback: seeding in-memory store.');
      if (inMemoryStore.length === 0) {
        inMemoryStore = [...initialSeedData];
        return { message: 'Seeded successfully' };
      }
      return { message: 'Already seeded' };
    }
  },
};
