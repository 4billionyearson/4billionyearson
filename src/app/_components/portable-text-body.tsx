'use client'

import { PortableText } from '@portabletext/react'
import imageUrlBuilder from '@sanity/image-url'
import { createClient } from 'next-sanity'
import Image from 'next/image'
import { useEffect, useRef } from 'react'

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
    h1: ({ children }: any) => <h1 className="text-4xl font-bold mt-8 mb-4 text-white">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-3xl font-bold mt-8 mb-4 text-white">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-2xl font-bold mt-6 mb-3 text-white">{children}</h3>,
    h4: ({ children }: any) => <h4 className="text-xl font-bold mt-6 mb-3 text-white">{children}</h4>,
    normal: ({ children }: any) => <p className="mb-4 leading-relaxed">{children}</p>,
    chatBubble: ({ children }: any) => (
      <div className="bg-gray-700/50 border border-gray-600/40 p-5 rounded-3xl rounded-br-sm ml-auto max-w-[85%] text-left text-gray-200 my-6 shadow-md">
        <p className="m-0 leading-relaxed font-medium">{children}</p>
      </div>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-gray-600 pl-4 italic my-6 text-gray-400">
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
    code: ({ children }: any) => <code className="bg-gray-800 text-gray-200 rounded px-1">{children}</code>,
    left: ({ children }: any) => <span className="block text-left w-full">{children}</span>,
    center: ({ children }: any) => <span className="block text-center w-full">{children}</span>,
    right: ({ children }: any) => <span className="block text-right w-full">{children}</span>,
    justify: ({ children }: any) => <span className="block text-justify w-full">{children}</span>,
    link: ({ value, children }: any) => (
      <a href={value?.href} className="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  },
}

type Props = {
  content: any
  htmlBody?: string
}

export function PostBody({ content, htmlBody }: Props) {
  const htmlRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!htmlBody || !htmlRef.current) return
    const container = htmlRef.current
    const scripts = container.querySelectorAll('script')
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script')
      Array.from(oldScript.attributes).forEach((attr) =>
        newScript.setAttribute(attr.name, attr.value)
      )
      newScript.textContent = oldScript.textContent
      oldScript.parentNode?.replaceChild(newScript, oldScript)
    })
  }, [htmlBody])

  if (htmlBody) {
    return (
      <div
        ref={htmlRef}
        className="prose prose-lg prose-invert max-w-none text-gray-300"
        dangerouslySetInnerHTML={{ __html: htmlBody }}
      />
    )
  }

  return (
    <div className="prose prose-lg prose-invert max-w-none text-gray-300">
      <PortableText value={content} components={components} />
    </div>
  )
}
