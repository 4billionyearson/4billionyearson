import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Brain, Zap, Globe, Dna } from 'lucide-react'
import { getCategoryBySlug, getPostsByCategory, getAllCategories } from '@/lib/api'
import Container from '@/app/_components/container'
import DateFormatter from '@/app/_components/date-formatter'

export const revalidate = 60;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'artificial-intelligence': <Brain className="h-7 w-7 md:h-9 md:w-9" />,
  'renewable-energy': <Zap className="h-7 w-7 md:h-9 md:w-9" />,
  'climate-change': <Globe className="h-7 w-7 md:h-9 md:w-9" />,
  'biotechnology': <Dna className="h-7 w-7 md:h-9 md:w-9" />,
}

type Params = { params: Promise<{ slug: string }> }

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params
  const [category, posts] = await Promise.all([
    getCategoryBySlug(slug),
    getPostsByCategory(slug),
  ])

  if (!category) return notFound()

  const accentHex = (category.accentColor || '').match(/#[0-9a-fA-F]{3,8}/)?.[0] || '#7ec8e3'

  const fallbackDescriptions: Record<string, string> = {
    'artificial-intelligence': 'A computer based entity that can perform tasks typically requiring human intelligence.',
    'biotechnology': 'The engineering of biological systems to develop new technologies, medicines, and solutions for humanity.',
    'climate-change': 'The long-term shift in global temperatures and weather patterns driven by human activity.',
    'renewable-energy': 'Clean, sustainable energy harnessed from natural sources that replenish faster than they are consumed.',
  };

  return (
    <main>
      <div className="w-full px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8">
        <div className="rounded-2xl shadow-xl border-2 overflow-hidden" style={{ borderColor: accentHex }}>
          <div className="px-5 py-4 md:px-6 md:py-5" style={{ backgroundColor: accentHex }}>
              <h1 className={`text-3xl md:text-4xl font-extrabold drop-shadow-sm font-mono tracking-tight ${slug === 'biotechnology' ? 'text-[#D26742]' : slug === 'renewable-energy' ? 'text-[#2C5263]' : 'text-[#FFF5E7]'}`}>{category.title}</h1>
              {(category.description || fallbackDescriptions[slug]) && (
                <p className={`text-sm md:text-lg font-medium max-w-3xl mt-3 ${slug === 'biotechnology' ? 'text-[#D26742]/80' : slug === 'renewable-energy' ? 'text-[#2C5263]/80' : 'text-[#FFF5E7]/80'}`}>
                  {category.description || fallbackDescriptions[slug]}
                </p>
              )}
          </div>
          <div className="bg-gray-950/90 px-0 py-3 sm:px-2 sm:py-4 md:px-4 md:py-6 lg:px-5 lg:py-7 xl:px-6 xl:py-8">
          <Container>

            {posts.length === 0 ? (
              <p className="text-gray-500">
                No posts yet in this category. Open the post in Studio, set `Category`, then publish the post.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {posts.map((post) => (
                  <Link key={post.slug} href={`/posts/${post.slug}`} className="group block transition-transform duration-500 hover:scale-[1.02]">
                    <article className="relative overflow-hidden rounded-lg shadow-md bg-[#1a1a1a] flex flex-col min-h-[300px]" style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}>
                      {post.coverImage && (
                        <Image
                          src={post.coverImage}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/55 pointer-events-none" />

                      <div className="relative z-10 p-6 md:p-10 flex flex-col justify-between min-h-[400px] md:min-h-[500px] text-outline">
                        <div>
                          <div className="text-[#FFF5E7]/80 uppercase tracking-widest text-xs md:text-sm font-bold mb-3 drop-shadow-md">
                            <DateFormatter dateString={post.date} />
                          </div>
                          <h2 className="text-[#FFF5E7] text-3xl md:text-5xl font-bold font-mono tracking-tight leading-tight mb-4 max-w-4xl drop-shadow-md">
                            {post.title}
                          </h2>
                        </div>
                        
                        {post.excerpt && (
                          <p className="text-[#FFF5E7]/90 text-sm md:text-lg leading-relaxed max-w-3xl drop-shadow-md line-clamp-3 mt-auto">
                            {post.excerpt}
                          </p>
                        )}
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </Container>
          </div>
        </div>
      </div>
    </main>
  )
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) return {}
  return {
    title: `${category.title} | 4 Billion Years On`,
    description: category.description,
    alternates: { canonical: `https://4billionyearson.org/category/${slug}` },
    openGraph: {
      title: `${category.title} | 4 Billion Years On`,
      description: category.description,
      images: [{ url: '/Category%20image%20for%20social%20media%20links.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${category.title} Articles | 4 Billion Years On`,
      description: category.description,
      images: ['/Category%20image%20for%20social%20media%20links.png'],
    },
  }
}

export async function generateStaticParams() {
  const categories = await getAllCategories()
  return categories.map((c: any) => ({ slug: c.slug }))
}
