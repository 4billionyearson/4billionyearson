import { defineField, defineType } from 'sanity'
import React from 'react'

const LeftStyle = (props: any) => <span style={{ display: 'block', textAlign: 'left', width: '100%' }}>{props.children}</span>
const CenterStyle = (props: any) => <span style={{ display: 'block', textAlign: 'center', width: '100%' }}>{props.children}</span>
const RightStyle = (props: any) => <span style={{ display: 'block', textAlign: 'right', width: '100%' }}>{props.children}</span>
const JustifyStyle = (props: any) => <span style={{ display: 'block', textAlign: 'justify', width: '100%' }}>{props.children}</span>

export const postType = defineType({
  name: 'post',
  title: 'Blog Post',
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
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }],
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'category' }],
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        { 
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Heading 1', value: 'h1' },
            { title: 'Heading 2', value: 'h2' },
            { title: 'Heading 3', value: 'h3' },
            { title: 'Heading 4', value: 'h4' },
            { title: 'Quote', value: 'blockquote' },
          ],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
              { title: 'Code', value: 'code' },
              { title: 'Underline', value: 'underline' },
              { title: 'Strike', value: 'strike-through' },
              { title: 'Left Align', value: 'left', component: LeftStyle },
              { title: 'Center Align', value: 'center', component: CenterStyle },
              { title: 'Right Align', value: 'right', component: RightStyle },
              { title: 'Justify Align', value: 'justify', component: JustifyStyle }
            ]
          }
        },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({ name: 'alt', type: 'string', title: 'Alt Text' }),
            defineField({ name: 'caption', type: 'string', title: 'Caption' }),
          ],
        },
      ],
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO Title',
      type: 'string',
      description: 'Overrides the post title for search engines (max 60 chars)',
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Description',
      type: 'text',
      rows: 2,
      description: 'Short description for search engines (max 160 chars)',
    }),
  ],
  preview: {
    select: { title: 'title', author: 'author.name', media: 'coverImage' },
    prepare({ title, author, media }) {
      return { title, subtitle: author ? `by ${author}` : '', media }
    },
  },
})
