import { databaseService } from '../src/db/databaseService.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const result = await databaseService.seedOccurrences();
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Error seeding data:', error);
      return res.status(500).json({ error: error?.message || 'Failed to seed data' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
