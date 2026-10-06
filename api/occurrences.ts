import isSea from 'is-sea';
import { databaseService } from '../src/db/databaseService.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const occurrences = await databaseService.getAllOccurrences();
      return res.status(200).json(occurrences);
    } catch (error: any) {
      console.error('Error fetching occurrences:', error);
      return res.status(500).json({ error: error?.message || 'Failed to fetch occurrences' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const { type, lat, lng, description } = body;

      const descText = (description || body.address || '').trim();

      if (!type || lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const latNum = Number(lat);
      const lngNum = Number(lng);

      if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }

      if (isSea(latNum, lngNum)) {
        return res.status(400).json({ error: 'Cannot report an occurrence in the ocean' });
      }

      const newOcc = await databaseService.createOccurrence({
        type,
        lat: latNum,
        lng: lngNum,
        description: descText,
      });

      return res.status(201).json(newOcc);
    } catch (error: any) {
      console.error('Error creating occurrence:', error);
      return res.status(500).json({ error: error?.message || 'Failed to create occurrence' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
