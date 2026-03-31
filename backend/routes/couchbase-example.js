/**
 * backend/routes/couchbase-example.js
 *
 * Example route file demonstrating how to use Couchbase alongside MongoDB.
 * Mount this in index.js with:
 *   import couchbaseExampleRoutes from '../routes/couchbase-example.js';
 *   app.use('/api/cb-example', couchbaseExampleRoutes);
 *
 * All operations are non-destructive examples — adapt them for your own models.
 */

import { Router } from 'express';
import { getCouchbaseCluster, getCouchbaseCollection } from '../server/couchbase.js';

const router = Router();

const BUCKET_NAME = process.env.COUCHBASE_BUCKET || 'travel-sample';

// ─── Helper ──────────────────────────────────────────────────────────────────

function requireCouchbase(res) {
  const collection = getCouchbaseCollection();
  if (!collection) {
    res.status(503).json({ error: 'Couchbase is not connected. Check COUCHBASE_HOST / COUCHBASE_USER / COUCHBASE_PASSWORD env vars.' });
    return null;
  }
  return collection;
}

// ─── INSERT a document ───────────────────────────────────────────────────────
// POST /api/cb-example/insert
// Body: { id: "doc::1", ...anyFields }
router.post('/insert', async (req, res) => {
  const collection = requireCouchbase(res);
  if (!collection) return;

  try {
    const { id, ...fields } = req.body;
    if (!id) return res.status(400).json({ error: 'Body must include an "id" field used as the document key.' });

    const doc = {
      ...fields,
      createdAt: new Date().toISOString(),
    };

    // upsert: insert or overwrite if the key already exists
    await collection.upsert(id, doc);

    res.status(201).json({ success: true, id, doc });
  } catch (e) {
    console.error('[CB-EXAMPLE] Insert error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET a single document by key ────────────────────────────────────────────
// GET /api/cb-example/get/:id
router.get('/get/:id', async (req, res) => {
  const collection = requireCouchbase(res);
  if (!collection) return;

  try {
    const result = await collection.get(req.params.id);
    res.json({ id: req.params.id, doc: result.content });
  } catch (e) {
    if (e.constructor?.name === 'DocumentNotFoundError' || e.message?.includes('document not found')) {
      return res.status(404).json({ error: `Document "${req.params.id}" not found.` });
    }
    console.error('[CB-EXAMPLE] Get error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── QUERY documents with N1QL ────────────────────────────────────────────────
// GET /api/cb-example/query?type=hotel&limit=10
//
// Queries the travel-sample bucket for documents matching a given type.
// Adapt the WHERE clause to your own schema.
router.get('/query', async (req, res) => {
  const cluster = getCouchbaseCluster();
  if (!cluster) {
    return res.status(503).json({ error: 'Couchbase is not connected.' });
  }

  try {
    const type  = req.query.type  || 'hotel';
    const limit = Math.min(parseInt(req.query.limit) || 10, 100); // cap at 100

    // Parameterised N1QL query — safe against injection
    const query  = `SELECT META().id AS id, name, city, country, type
                    FROM \`${BUCKET_NAME}\`
                    WHERE type = $type
                    LIMIT $limit`;

    const result = await cluster.query(query, {
      parameters: { type, limit },
    });

    res.json({ count: result.rows.length, rows: result.rows });
  } catch (e) {
    console.error('[CB-EXAMPLE] Query error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── UPDATE a document ────────────────────────────────────────────────────────
// PATCH /api/cb-example/update/:id
// Body: fields to merge into the existing document
router.patch('/update/:id', async (req, res) => {
  const collection = requireCouchbase(res);
  if (!collection) return;

  try {
    // First fetch the current document
    let current;
    try {
      const result = await collection.get(req.params.id);
      current = result.content;
    } catch (e) {
      if (e.constructor?.name === 'DocumentNotFoundError' || e.message?.includes('document not found')) {
        return res.status(404).json({ error: `Document "${req.params.id}" not found.` });
      }
      throw e;
    }

    // Merge the incoming fields and write back
    const updated = {
      ...current,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    await collection.replace(req.params.id, updated);
    res.json({ success: true, id: req.params.id, doc: updated });
  } catch (e) {
    console.error('[CB-EXAMPLE] Update error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── DELETE a document ────────────────────────────────────────────────────────
// DELETE /api/cb-example/delete/:id
router.delete('/delete/:id', async (req, res) => {
  const collection = requireCouchbase(res);
  if (!collection) return;

  try {
    await collection.remove(req.params.id);
    res.json({ success: true, id: req.params.id, message: 'Document deleted.' });
  } catch (e) {
    if (e.constructor?.name === 'DocumentNotFoundError' || e.message?.includes('document not found')) {
      return res.status(404).json({ error: `Document "${req.params.id}" not found.` });
    }
    console.error('[CB-EXAMPLE] Delete error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── STATUS — confirm Couchbase is reachable ──────────────────────────────────
// GET /api/cb-example/status
router.get('/status', (req, res) => {
  const cluster    = getCouchbaseCluster();
  const collection = getCouchbaseCollection();
  res.json({
    couchbaseConnected: cluster !== null,
    bucket:             process.env.COUCHBASE_BUCKET || 'travel-sample',
    host:               process.env.COUCHBASE_HOST   || 'couchbases://cb.zkadm7xwemjcjht4.cloud.couchbase.com',
    collectionReady:    collection !== null,
  });
});

export default router;
