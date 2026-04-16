import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import {
  createEntity,
  deleteEntity,
  filterEntity,
  getCurrentUser,
  getEntity,
  handleFunction,
  invokeIntegration,
  inviteUser,
  listEntity,
  seedDatabase,
  updateCurrentUser,
  updateEntity,
} from './runtime.js';
import { prisma } from './db.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = new Set(
  String(process.env.CORS_ALLOWED_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} is not allowed by owned runtime CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', async (_req, res) => {
  res.json({
    ok: true,
    runtime: 'owned',
  });
});

app.get('/api/auth/me', async (_req, res) => {
  const user = await getCurrentUser(prisma);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.json(user);
});

app.patch('/api/auth/me', async (req, res, next) => {
  try {
    const user = await updateCurrentUser(prisma, req.body || {});
    res.json(user);
  } catch (error) {
    next(error);
  }
});

app.post('/api/users/invite', async (req, res, next) => {
  try {
    const user = await inviteUser(prisma, req.body?.email, req.body?.role);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

app.get('/api/entities/:entity', async (req, res, next) => {
  try {
    const data = await listEntity(prisma, req.params.entity, {
      sort: req.query.sort,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      skip: req.query.skip ? Number(req.query.skip) : undefined,
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.post('/api/entities/:entity/filter', async (req, res, next) => {
  try {
    const data = await filterEntity(prisma, req.params.entity, {
      filter: req.body?.filter || {},
      sort: req.body?.sort,
      limit: req.body?.limit,
      skip: req.body?.skip,
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.get('/api/entities/:entity/:id', async (req, res, next) => {
  try {
    const data = await getEntity(prisma, req.params.entity, req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.post('/api/entities/:entity', async (req, res, next) => {
  try {
    const data = await createEntity(prisma, req.params.entity, req.body || {});
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/entities/:entity/:id', async (req, res, next) => {
  try {
    const data = await updateEntity(prisma, req.params.entity, req.params.id, req.body || {});
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/entities/:entity/:id', async (req, res, next) => {
  try {
    const data = await deleteEntity(prisma, req.params.entity, req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.post('/api/functions/:name', async (req, res, next) => {
  try {
    const result = await handleFunction(prisma, req.params.name, req.body || {});
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/integrations/core/invoke-llm', async (req, res, next) => {
  try {
    const result = await invokeIntegration(prisma, 'core_llm', req.body || {});
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error('[owned-runtime]', error);
  res.status(500).json({
    error: error.message || 'Internal server error',
  });
});

async function start() {
  await seedDatabase(prisma);
  app.listen(port, () => {
    console.log(`[owned-runtime] API listening on http://127.0.0.1:${port}/api`);
  });
}

start().catch((error) => {
  console.error('[owned-runtime] failed to start', error);
  process.exit(1);
});
