import { relations } from 'drizzle-orm/relations'
import { data, idea, relationship, relationshipType } from './schema'

export const relationshipRelations = relations(relationship, ({ one }) => ({
	idea_sourceId: one(idea, {
		fields: [relationship.sourceId],
		references: [idea.id],
		relationName: 'relationship_sourceId_idea_id'
	}),
	idea_targetId: one(idea, {
		fields: [relationship.targetId],
		references: [idea.id],
		relationName: 'relationship_targetId_idea_id'
	}),
	relationshipType: one(relationshipType, {
		fields: [relationship.typeId],
		references: [relationshipType.id]
	})
}))

export const ideaRelations = relations(idea, ({ many }) => ({
	relationships_sourceId: many(relationship, {
		relationName: 'relationship_sourceId_idea_id'
	}),
	relationships_targetId: many(relationship, {
		relationName: 'relationship_targetId_idea_id'
	}),
	data: many(data)
}))

export const relationshipTypeRelations = relations(relationshipType, ({ many }) => ({
	relationships: many(relationship)
}))

export const dataRelations = relations(data, ({ one }) => ({
	idea: one(idea, {
		fields: [data.ideaId],
		references: [idea.id]
	})
}))
