import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getCategoryBySlug, getPostsByCategory, getAllCategories } from '@/lib/api'
import Container from '@/app/_components/container'
import DateFormatter from '@/app/_components/date-formatter'

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> }

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params
  const [category, posts] = await Promise.all([
    getCategoryBySlug(slug),
    getPostsByCategory(slug),
  ])

  if (!category) return notFound()

  const accentHex = (category.accentColor || '').match(/#[0-9a-fA-F]{3,8}/)?.[0] || '#7ec8e3'

  return (
    <main>
      <div className="container mx-auto px-3 md:px-4 pt-2 pb-6 md:pt-4 md:pb-8">
        <div className="bg-[#FFF5E8] rounded-xl shadow-xl min-h-screen px-0 py-3 sm:p-4 md:p-8 lg:p-12 xl:p-14">
          <Container>
            <div className="rounded-lg p-6 md:p-8 mb-4 shadow-sm" style={{ backgroundColor: accentHex }}>
              <h1 className={`text-3xl md:text-4xl font-extrabold -mt-3 -ml-2 -mr-2 mb-3 drop-shadow-sm font-mono tracking-tight ${slug === 'biotechnology' ? 'text-[#D26742]' : slug === 'renewable-energy' ? 'text-[#2C5263]' : slug === 'climate-change' ? 'text-[#745630]' : 'text-[#FFF5E8]'}`}>{category.title}</h1>
              {(category.description || (slug === 'artificial-intelligence' && "A computer based entity that can perform tasks typically requiring human intelligence.")) && (
                <p className={`-ml-2 -mr-2 -mb-3 text-sm md:text-lg font-medium max-w-3xl drop-shadow-sm ${slug === 'biotechnology' ? 'text-[#D26742]' : slug === 'renewable-energy' ? 'text-[#2C5263]' : slug === 'climate-change' ? 'text-[#745630]' : 'text-[#FFF5E8]'}`}>
                  {category.description || (slug === 'artificial-intelligence' ? "A computer based entity that can perform tasks typically requiring human intelligence." : "")}
                </p>
              )}
            </div>

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
                          className="object-cover opacity-90 mix-blend-overlay group-hover:scale-105 transition-transform duration-500"
                        />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/80 pointer-events-none" />

                      <div className="relative z-10 p-6 md:p-10 flex flex-col justify-between min-h-[400px] md:min-h-[500px]">
                        <div>
                          <div className="text-[#FFF5E8]/80 uppercase tracking-widest text-xs md:text-sm font-bold mb-3 drop-shadow-md">
                            <DateFormatter dateString={post.date} />
                          </div>
                          <h2 className="text-[#FFF5E8] text-3xl md:text-5xl font-bold font-mono tracking-tight leading-tight mb-4 max-w-4xl drop-shadow-md">
                            {post.title}
                          </h2>
                        </div>
                        
                        {post.excerpt && (
                          <p className="text-[#FFF5E8]/90 text-sm md:text-lg leading-relaxed max-w-3xl drop-shadow-md line-clamp-3 mt-auto">
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
  }
}

export async function generateStaticParams() {
  const categories = await getAllCategories()
  return categories.map((c: any) => ({ slug: c.slug }))
}
