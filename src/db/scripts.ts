import { sql } from 'kysely'

export const createVectorExtension = sql`create extension if not exists vector;`
export const createVectorIndex = sql`create index on tag using hnsw (vector vector_cosine_ops);`
export const setMaxWorkers = sql`set max_parallel_maintenance_workers = 7;`
export const setWorkerMemory = sql`set maintenance_work_mem='10 GB';`
