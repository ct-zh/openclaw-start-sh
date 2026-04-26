Complete API reference for Next.js Cache Components.
Directive: 'use cache'
Marks a function or file as cacheable. The cached output is included in the static shell during Partial Prerendering.
Syntax
// File-level (applies to all exports)
'use cache'

export async function getData() {
  /* ... */
}

// Function-level
async function Component() {
  'use cache'
  // ...
}
Variants



Directive
Description
Cache Storage




'use cache'
Standard cache (default)
Default handler + Remote


'use cache: remote'
Platform remote cache
Remote handler only



'use cache: remote'
Uses platform-specific remote cache handler. Requires network roundtrip.
async function HeavyComputation() {
  'use cache: remote'
  cacheLife('days')

  return await expensiveCalculation()
}
Understanding Cache Handlers
Next.js uses cache handlers to store and retrieve cached data. The directive variant determines which handlers are used:



Handler
Description




default
Local in-memory cache with optional persistence. Fast, single-server scope


remote
Platform-specific distributed cache. Network roundtrip, multi-server scope



How variants map to handlers:

'use cache' → Uses both default and remote handlers. Data is cached locally for fast access and remotely for sharing across instances
'use cache: remote' → Uses only the remote handler. Skips local cache, always fetches from distributed cache

When to use each:



Use Case
Recommended Variant




Most cached data
'use cache'


Heavy computations to share globally
'use cache: remote'


Data that must be consistent globally
'use cache: remote'



Rules

Must be async - All cached functions must return a Promise
First statement - 'use cache' must be the first statement in the function body
No runtime APIs - Cannot call cookies(), headers(), searchParams directly
Serializable arguments - All arguments must be serializable (no functions, class instances)
Serializable return values - Cached functions must return serializable data (no functions, class instances)


Function: cacheLife()
Configures cache duration and revalidation behavior.
Import
import { cacheLife } from 'next/cache'
Signature
function cacheLife(profile: string): void
function cacheLife(options: CacheLifeOptions): void

interface CacheLifeOptions {
  stale?: number // Client cache duration (seconds)
  revalidate?: number // Background revalidation window (seconds)
  expire?: number // Absolute expiration (seconds)
}
Parameters



Parameter
Description
Constraint




stale
How long the client can cache without server validation
None


revalidate
When to start background refresh
revalidate ≤ expire


expire
Absolute expiration; deopts to dynamic if exceeded
Must be largest



Predefined Profiles



Profile
stale
revalidate
expire




'default'
300*
900 (15min)
∞ (INFINITE)


'seconds'
30
1
60


'minutes'
300
60 (1min)
3600 (1hr)


'hours'
300
3600 (1hr)
86400 (1day)


'days'
300
86400 (1day)
604800 (1wk)


'weeks'
300
604800 (1wk)
2592000 (30d)


'max'
300
2592000 (30d)
31536000 (1yr)



* Default stale falls back to experimental.staleTimes.static (300 seconds)

Important: Profiles with expire < 300 seconds (like 'seconds') are treated as dynamic and won't be included in the static shell during Partial Prerendering. See Dynamic Threshold below.

Custom Profiles
Define custom profiles in next.config.ts:
const nextConfig: NextConfig = {
  cacheLife: {
    // Custom profile
    'blog-posts': {
      stale: 300, // 5 minutes
      revalidate: 3600, // 1 hour
      expire: 86400, // 1 day
    },
    // Override default
    default: {
      stale: 60,
      revalidate: 600,
      expire: 3600,
    },
  },
}
Usage
async function BlogPosts() {
  'use cache'
  cacheLife('blog-posts') // Custom profile

  return await db.posts.findMany()
}
HTTP Cache-Control Mapping
stale     → max-age
revalidate → s-maxage
expire - revalidate → stale-while-revalidate

Example: stale=60, revalidate=3600, expire=86400
→ Cache-Control: max-age=60, s-maxage=3600, stale-while-revalidate=82800

Dynamic Threshold
Cache entries with short expiration times are treated as dynamic holes during Partial Prerendering:



Condition
Behavior




expire < 300 seconds
Treated as dynamic (not in static shell)


revalidate === 0
Treated as dynamic (not in static shell)


expire >= 300 seconds
Included in static shell



Why expire, not stale?
The threshold uses expire (absolute expiration) because:

expire defines the maximum lifetime of the cache entry
If expire is very short, the cached content would immediately become invalid in the static shell
stale only affects client-side freshness perception - how long before the browser revalidates
Including short-lived content in the static shell would serve guaranteed-stale data

Practical implications:

cacheLife('seconds') (expire=60) → Dynamic - streams at request time
cacheLife('minutes') (expire=3600) → Static - included in PPR shell
Custom cacheLife({ expire: 120 }) → Dynamic - below 300s threshold

This 300-second threshold ensures that very short-lived caches don't pollute the static shell with immediately-stale content.
// This cache is DYNAMIC (expire=60 < 300)
async function RealtimePrice() {
  'use cache'
  cacheLife('seconds') // expire=60, below threshold
  return await fetchPrice()
}

// This cache is STATIC (expire=3600 >= 300)
async function ProductDetails() {
  'use cache'
  cacheLife('minutes') // expire=3600, above threshold
  return await fetchProduct()
}

Function: cacheTag()
Tags cached data for targeted invalidation.
Import
import { cacheTag } from 'next/cache'
Signature
function cacheTag(...tags: string[]): void
Usage
async function UserProfile({ userId }: { userId: string }) {
  'use cache'
  cacheTag('users', `user-${userId}`) // Multiple tags
  cacheLife('hours')

  return await db.users.findUnique({ where: { id: userId } })
}
Tagging Strategies
Entity-based tagging:
cacheTag('posts') // All posts
cacheTag(`post-${postId}`) // Specific post
cacheTag(`user-${userId}-posts`) // User's posts
Feature-based tagging:
cacheTag('homepage')
cacheTag('dashboard')
cacheTag('admin')
Combined approach:
cacheTag('posts', `post-${id}`, `author-${authorId}`)
Tag Constraints
Tags have enforced limits:



Limit
Value
Behavior if exceeded




Max tag length
256 characters
Warning logged, tag ignored


Max total tags
128 tags
Warning logged, excess ignored



// ❌ Tag too long (>256 chars) - will be ignored with warning
cacheTag('a'.repeat(300))

// ❌ Too many tags (>128) - excess will be ignored with warning
cacheTag(...Array(200).fill('tag'))

// ✅ Valid usage
cacheTag('products', `product-${id}`, `category-${category}`)
Implicit Tags (Automatic)
In addition to explicit cacheTag() calls, Next.js automatically applies implicit tags based on the route hierarchy. This means revalidatePath() works without any explicit cacheTag() calls:
'use server'
import { revalidatePath } from 'next/cache'

export async function publishBlogPost() {
  await db.posts.create({
    /* ... */
  })

  // Works without explicit cacheTag() - uses implicit route-based tags
  revalidatePath('/blog', 'layout') // Invalidates all /blog/* routes
}
How it works:

Each route segment (layout, page) automatically receives an internal tag
revalidatePath('/blog', 'layout') invalidates the /blog layout and all nested routes
revalidatePath('/blog/my-post') invalidates only that specific page

Choosing between implicit and explicit tags:



Use Case
Approach




Invalidate all cached data under a route
revalidatePath() (uses implicit)


Invalidate specific entity across routes
cacheTag() + updateTag()


User needs to see their change (eager)
updateTag() with explicit tag


Background update, eventual OK (lazy)
revalidateTag() with explicit tag




Understanding Cache Scope
What Creates a New Cache Entry?
A new cache entry is created when ANY of these differ:



Factor
Example




Function identity
Different functions = different entries


Arguments
getUser("123") vs getUser("456")


File path
Same function name in different files



Cache Key Composition
Cache keys are composed of multiple parts:
[buildId, functionId, serializedArgs, (hmrRefreshHash)]




Part
Description




buildId
Unique build identifier (prevents cross-deployment cache reuse)


functionId
Server reference ID for the cached function


serializedArgs
React Flight-encoded function arguments


hmrRefreshHash
(Dev only) Invalidates cache on file changes



// These create TWO separate cache entries (third call is a cache hit):
async function getProduct(id: string) {
  'use cache'
  return db.products.findUnique({ where: { id } })
}

await getProduct('prod-1') // Cache entry 1: [buildId, getProduct, "prod-1"]
await getProduct('prod-2') // Cache entry 2: [buildId, getProduct, "prod-2"]
await getProduct('prod-1') // Cache HIT on entry 1
Object Arguments and Cache Keys
Arguments are serialized using React's encodeReply(), which performs structural serialization:
async function getData(options: { limit: number }) {
  'use cache'
  return fetch(`/api?limit=${options.limit}`)
}

// Objects with identical structure produce the same cache key
getData({ limit: 10 }) // Cache key includes serialized { limit: 10 }
getData({ limit: 10 }) // HIT! Same structural content

// Different values = different cache keys
getData({ limit: 20 }) // MISS - different content
Best practice: While objects work correctly, primitives are simpler to reason about:
// ✅ Clear and explicit
async function getData(limit: number) {
  'use cache'
  return fetch(`/api?limit=${limit}`)
}

Note: Non-serializable values (functions, class instances, Symbols) cannot be used as arguments to cached functions and will cause errors.


Function: updateTag()
Immediately invalidates cache entries and ensures read-your-own-writes.
Import
import { updateTag } from 'next/cache'
Signature
function updateTag(tag: string): void
Usage
'use server'
import { updateTag } from 'next/cache'

export async function createPost(formData: FormData) {
  const post = await db.posts.create({ data: formData })

  updateTag('posts') // Update all cache entries tagged with 'posts'
  updateTag(`user-${userId}`) // Update all cache entries tagged with this user

  // Client immediately sees fresh data
}
Behavior

Immediate: Cache invalidated synchronously
Read-your-own-writes: Subsequent reads return fresh data
Server Actions only: Must be called from Server Actions


Function: revalidateTag()
Marks cache entries as stale for background revalidation.
Import
import { revalidateTag } from 'next/cache'
Signature
function revalidateTag(tag: string, profile: string | { expire?: number }): void
Parameters



Parameter
Type
Description




tag
string
The cache tag to invalidate


profile
string | { expire?: number }
Cache profile name or object with expire time (seconds)




Note: Unlike cacheLife() which accepts stale, revalidate, and expire, the revalidateTag() object form only accepts expire. Use a predefined profile name (like 'hours') for full control over stale-while-revalidate behavior.

Usage
'use server'
import { revalidateTag } from 'next/cache'

export async function updateSettings(data: FormData) {
  await db.settings.update({ data })

  // With predefined profile (recommended)
  revalidateTag('settings', 'hours')

  // With custom expiration
  revalidateTag('settings', { expire: 3600 })
}
Behavior

Stale-while-revalidate: Serves cached content while refreshing in background
Background refresh: Cache entry is refreshed in the background after the next visit
Broader context: Can be called from Route Handlers and Server Actions


updateTag() vs revalidateTag(): When to Use Each
The key distinction is eager vs lazy invalidation:

updateTag() - Eager invalidation. Cache is immediately invalidated, and the next read fetches fresh data synchronously. Use when the user who triggered the action needs to see the result.
revalidateTag() - Lazy (SWR-style) invalidation. Stale data may be served while fresh data is fetched in the background. Use when eventual consistency is acceptable.

Here's a decision guide:



Scenario
Use
Why




User creates a post
updateTag()
User expects to see their post immediately


User updates their profile
updateTag()
Read-your-own-writes semantics


Admin publishes content
revalidateTag()
Other users can see stale briefly


Analytics/view counts
revalidateTag()
Freshness less critical


Background sync job
revalidateTag()
No user waiting for result


E-commerce cart update
updateTag()
User needs accurate cart state



E-commerce Example
'use server'
import { updateTag, revalidateTag } from 'next/cache'

// When USER adds to cart → updateTag (they need accurate count)
export async function addToCart(productId: string, userId: string) {
  await db.cart.add({ productId, userId })
  updateTag(`cart-${userId}`) // Immediate - user sees their cart
}

// When INVENTORY changes from warehouse sync → revalidateTag
export async function syncInventory(products: Product[]) {
  await db.inventory.bulkUpdate(products)
  revalidateTag('inventory', 'max') // Background - eventual consistency OK
}

// When USER completes purchase → updateTag for buyer, revalidateTag for product
export async function completePurchase(orderId: string) {
  const order = await processOrder(orderId)

  updateTag(`order-${orderId}`) // Buyer sees confirmation immediately
  updateTag(`cart-${order.userId}`) // Buyer's cart clears immediately
  revalidateTag(`product-${order.productId}`, 'max') // Others see updated stock eventually
}
The Rule of Thumb

updateTag: "The person who triggered this action is waiting to see the result"
revalidateTag: "This update affects others, but they don't know to wait for it"


Function: revalidatePath()
Revalidates all cache entries associated with a path.
Import
import { revalidatePath } from 'next/cache'
Signature
function revalidatePath(path: string, type?: 'page' | 'layout'): void
Usage
'use server'
import { revalidatePath } from 'next/cache'

export async function updateBlog() {
  await db.posts.update({
    /* ... */
  })

  revalidatePath('/blog') // Specific path
  revalidatePath('/blog', 'layout') // Layout and all children
  revalidatePath('/', 'layout') // Entire app
}

Configuration: next.config.ts
Enable Cache Components
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
}

export default nextConfig
Configure Cache Handlers
const nextConfig: NextConfig = {
  cacheHandlers: {
    default: {
      maxMemorySize: 52428800, // 50MB
    },
    // Platform-specific remote handler
    remote: CustomRemoteHandler,
  },
}
Define Cache Profiles
const nextConfig: NextConfig = {
  cacheLife: {
    default: {
      stale: 60,
      revalidate: 3600,
      expire: 86400,
    },
    posts: {
      stale: 300,
      revalidate: 3600,
      expire: 604800,
    },
  },
}

generateStaticParams with Cache Components
When Cache Components is enabled, generateStaticParams behavior changes significantly.
Parameter Permutation Rendering
Next.js renders ALL permutations of provided parameters to create reusable subshells:
// app/products/[category]/[slug]/page.tsx
export async function generateStaticParams() {
  return [
    { category: 'jackets', slug: 'bomber' },
    { category: 'jackets', slug: 'parka' },
    { category: 'shoes', slug: 'sneakers' },
  ]
}
Rendered routes:



Route
Params Known
Shell Type




/products/jackets/bomber
category ✓, slug ✓
Complete page


/products/jackets/parka
category ✓, slug ✓
Complete page


/products/shoes/sneakers
category ✓, slug ✓
Complete page


/products/jackets/[slug]
category ✓, slug ✗
Category subshell


/products/shoes/[slug]
category ✓, slug ✗
Category subshell


/products/[category]/[slug]
category ✗, slug ✗
Fallback shell



Requirements

Must return at least one parameter set - Empty arrays cause build errors
Params validate static safety - Next.js uses provided params to verify no dynamic APIs are accessed
Subshells require Suspense - If accessing unknown params without Suspense, no subshell is generated

// ❌ BUILD ERROR: Empty array not allowed
export function generateStaticParams() {
  return []
}

// ✅ CORRECT: Provide at least one param set
export async function generateStaticParams() {
  const products = await getProducts({ limit: 100 })
  return products.map((p) => ({ category: p.category, slug: p.slug }))
}
Subshell Generation with Layouts
Create category-level subshells by adding Suspense in layouts:
// app/products/[category]/layout.tsx
export default async function CategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ category: string }>
}) {
  const { category } = await params

  return (
    <>
      <h2>{category}</h2>
      <Suspense>{children}</Suspense> {/* Creates subshell boundary */}
    </>
  )
}
Now /products/jackets/[slug] generates a reusable shell with the category header, streaming product details when visited.
Why Subshells Matter
Without generateStaticParams, visiting /products/jackets/unknown-product:

Before: Full dynamic render, user waits for everything
After: Cached category subshell served instantly, product details stream in


Deprecated Segment Configurations
These exports are deprecated when cacheComponents: true:
export const revalidate (Deprecated)
Before:
// app/products/page.tsx
export const revalidate = 3600 // 1 hour

export default async function ProductsPage() {
  const products = await db.products.findMany()
  return <ProductList products={products} />
}
Problems with this approach:

Revalidation time lived at segment level, not with the data
Couldn't vary revalidation based on fetched data
No control over client-side caching (stale) or expiration

After (Cache Components):
// app/products/page.tsx
import { cacheLife } from 'next/cache'

async function getProducts() {
  'use cache'
  cacheLife('hours') // Co-located with the data

  return await db.products.findMany()
}

export default async function ProductsPage() {
  const products = await getProducts()
  return <ProductList products={products} />
}
Benefits:

Cache lifetime co-located with data fetching
Granular control: stale, revalidate, and expire
Different functions can have different lifetimes
Can conditionally set cache life based on data

export const dynamic (Deprecated)
Before:
// app/products/page.tsx
export const dynamic = 'force-static'

export default async function ProductsPage() {
  // Headers would return empty, silently breaking components
  const headers = await getHeaders()
  return <ProductList />
}
Problems:

All-or-nothing approach
force-static silently broke dynamic APIs (cookies, headers return empty)
force-dynamic prevented any static optimization
Hidden bugs when dynamic components received empty data

After (Cache Components):
// app/products/page.tsx
export default async function ProductsPage() {
  return (
    <>
      <CachedProductList /> {/* Static via 'use cache' */}
      <Suspense fallback={<Skeleton />}>
        <DynamicUserRecommendations /> {/* Dynamic via Suspense */}
      </Suspense>
    </>
  )
}
Benefits:

No silent API failures
Granular static/dynamic at component level
Build errors guide you to correct patterns
Pages can be BOTH static AND dynamic

Migration Guide



Old Pattern
New Pattern




export const revalidate = 60
cacheLife({ revalidate: 60 }) inside 'use cache'


export const revalidate = 0
Remove cache or use cacheLife('seconds')


export const revalidate = false
cacheLife('max') for long-term caching


export const dynamic = 'force-static'
Use 'use cache' on data fetching


export const dynamic = 'force-dynamic'
Wrap in <Suspense> without cache


export const dynamic = 'auto'
Default behavior - not needed


export const dynamic = 'error'
Default with Cache Components (build errors guide you)




Migration Scenarios
Scenario 1: Page with revalidate Export
Before:
// app/products/page.tsx
export const revalidate = 3600

export default async function ProductsPage() {
  const products = await db.products.findMany()
  return <ProductGrid products={products} />
}
After:
// app/products/page.tsx
import { cacheLife } from 'next/cache'

async function getProducts() {
  'use cache'
  cacheLife('hours') // Roughly equivalent to revalidate = 3600

  return db.products.findMany()
}

export default async function ProductsPage() {
  const products = await getProducts()
  return <ProductGrid products={products} />
}
Scenario 2: Page with dynamic = 'force-static'
Before:
// app/about/page.tsx
export const dynamic = 'force-static'

export default async function AboutPage() {
  const data = await fetchAboutData()
  return <About data={data} />
}
After:
// app/about/page.tsx
async function getAboutData() {
  'use cache'
  cacheLife('max') // Truly static
  return await fetchAboutData()
}

export default async function AboutPage() {
  const data = await getAboutData()
  return <About data={data} />
}
Scenario 3: Page with dynamic = 'force-dynamic'
Before:
// app/dashboard/page.tsx
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  return <Dashboard user={user} />
}
After:
// app/dashboard/page.tsx
import { Suspense } from 'react'

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}

async function DashboardContent() {
  const user = await getCurrentUser() // Dynamic API
  return <Dashboard user={user} />
}
Scenario 4: Mixed Static and Dynamic Content
Before:
// app/products/[id]/page.tsx
export const dynamic = 'force-dynamic' // Forced to be fully dynamic

export default async function ProductPage({ params }) {
  const product = await getProduct(params.id) // Could be static
  const recommendations = await getRecommendations() // Dynamic per user

  return (
    <>
      <Product product={product} />
      <Recommendations data={recommendations} />
    </>
  )
}
After:
// app/products/[id]/page.tsx
import { Suspense } from 'react'

export default async function ProductPage({ params }) {
  return (
    <>
      <CachedProduct id={params.id} /> {/* Static/Cached */}
      <Suspense fallback={<RecsSkeleton />}>
        <DynamicRecommendations /> {/* Dynamic Streaming */}
      </Suspense>
    </>
  )
}

async function CachedProduct({ id }) {
  'use cache'
  cacheLife('hours')
  const product = await getProduct(id)
  return <Product product={product} />
}

async function DynamicRecommendations() {
  const recommendations = await getRecommendations()
  return <Recommendations data={recommendations} />
}
