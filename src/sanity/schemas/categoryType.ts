import { defineField, defineType } from 'sanity'

export const categoryType = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'graphic',
      title: 'Graphic filename',
      type: 'string',
      description: 'Filename from public folder e.g. graphic-ai.png',
    }),
    defineField({
      name: 'accentColor',
      title: 'Accent colour',
      type: 'string',
      description: 'Tailwind colour class e.g. bg-blue-500',
    }),
  ],
  preview: {
    select: { title: 'title' },
  },
})
