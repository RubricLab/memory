import { sql } from 'drizzle-orm'
import { foreignKey, pgTable, text, timestamp, uniqueIndex, vector } from 'drizzle-orm/pg-core'

export const relationship = pgTable(
	'Relationship',
	{
		id: text().notNull(),
		body: text().notNull(),
		sourceId: text().notNull(),
		targetId: text().notNull(),
		createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
		updatedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
		typeId: text().notNull()
	},
	table => {
		return {
			bodyKey: uniqueIndex('Relationship_body_key').using('btree', table.body.asc().nullsLast()),
			relationshipSourceIdFkey: foreignKey({
				columns: [table.sourceId],
				foreignColumns: [idea.id],
				name: 'Relationship_sourceId_fkey'
			})
				.onUpdate('cascade')
				.onDelete('restrict'),
			relationshipTargetIdFkey: foreignKey({
				columns: [table.targetId],
				foreignColumns: [idea.id],
				name: 'Relationship_targetId_fkey'
			})
				.onUpdate('cascade')
				.onDelete('restrict'),
			relationshipTypeIdFkey: foreignKey({
				columns: [table.typeId],
				foreignColumns: [relationshipType.id],
				name: 'Relationship_typeId_fkey'
			})
				.onUpdate('cascade')
				.onDelete('restrict')
		}
	}
)

export const idea = pgTable(
	'Idea',
	{
		id: text().notNull(),
		body: text().notNull(),
		vector: vector({ dimensions: 768 }),
		createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
		updatedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull()
	},
	table => {
		return {
			bodyKey: uniqueIndex('Idea_body_key').using('btree', table.body.asc().nullsLast())
		}
	}
)

export const data = pgTable(
	'Data',
	{
		id: text().notNull(),
		ideaId: text().notNull(),
		createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
		updatedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull()
	},
	table => {
		return {
			dataIdeaIdFkey: foreignKey({
				columns: [table.ideaId],
				foreignColumns: [idea.id],
				name: 'Data_ideaId_fkey'
			})
				.onUpdate('cascade')
				.onDelete('restrict')
		}
	}
)

export const relationshipType = pgTable(
	'RelationshipType',
	{
		id: text().notNull(),
		name: text().notNull(),
		createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
		updatedAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull()
	},
	table => {
		return {
			nameKey: uniqueIndex('RelationshipType_name_key').using('btree', table.name.asc().nullsLast())
		}
	}
)
