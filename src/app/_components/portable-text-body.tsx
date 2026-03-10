'use client'

import { PortableText } from '@portabletext/react'
import imageUrlBuilder from '@sanity/image-url'
import { createClient } from 'next-sanity'
import Image from 'next/image'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2024-01-01',
  useCdn: true,
})

const builder = imageUrlBuilder(client)

const components = {
  types: {
    image: ({ value }: any) => {
      if (!value?.asset) return null
      return (
        <figure className="my-8">
          <Image
            src={builder.image(value).width(800).url()}
            alt={value.alt || ''}
            width={800}
            height={450}
            className="rounded-lg w-full"
          />
          {value.caption && (
            <figcaption className="text-center text-sm text-gray-500 mt-2">
              {value.caption}
            </figcaption>
          )}
        </figure>
      )
    },
  },
  block: {
    h1: ({ children }: any) => <h1 className="text-4xl font-bold mt-8 mb-4">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-3xl font-bold mt-8 mb-4">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-2xl font-bold mt-6 mb-3">{children}</h3>,
    h4: ({ children }: any) => <h4 className="text-xl font-bold mt-6 mb-3">{children}</h4>,
    normal: ({ children }: any) => <p className="mb-4 leading-relaxed">{children}</p>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic my-6 text-gray-600">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }: any) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
    number: ({ children }: any) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
  },
  marks: {
    strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    underline: ({ children }: any) => <u className="underline">{children}</u>,
    'strike-through': ({ children }: any) => <s className="line-through">{children}</s>,
    code: ({ children }: any) => <code className="bg-gray-100 rounded px-1">{children}</code>,
    left: ({ children }: any) => <span className="block text-left w-full">{children}</span>,
    center: ({ children }: any) => <span className="block text-center w-full">{children}</span>,
    right: ({ children }: any) => <span className="block text-right w-full">{children}</span>,
    justify: ({ children }: any) => <span className="block text-justify w-full">{children}</span>,
    link: ({ value, children }: any) => (
      <a href={value?.href} className="underline hover:text-blue-600" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  },
}

type Props = {
  content: any
}

export function PostBody({ content }: Props) {
  return (
    <div className="prose prose-lg max-w-none">
      <PortableText value={content} components={components} />
    </div>
  )
}
