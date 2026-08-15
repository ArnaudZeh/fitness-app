import { corsHeaders } from '../_shared/cors.ts'
import { fetchWithTimeout } from '../_shared/fetch-with-timeout.ts'
import { isResponse, jsonResponse, requireAuthedContext } from '../_shared/http.ts'

// Proxies USDA FoodData Central search — the API key stays server-side
// (Deno.env secret) rather than shipping in the client bundle the way
// OpenFoodFacts calls do, since OFF is fully keyless/public but FDC keys
// are rate-limited per key and would be scrapable from the bundle if
// embedded client-side. requireAuthedContext just gates on "is this an
// authenticated app user" — no DB access needed here, unlike its other
// callers.
const FDC_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const ctx = await requireAuthedContext(req)
  if (isResponse(ctx)) return ctx

  let body: { query?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corps de requête invalide.' }, 400)
  }
  const query = body.query?.trim()
  if (!query || query.length < 2) {
    return jsonResponse({ error: 'Requête de recherche trop courte.' }, 400)
  }

  const apiKey = Deno.env.get('USDA_FDC_API_KEY')
  if (!apiKey) {
    console.error('USDA_FDC_API_KEY is not configured')
    return jsonResponse({ error: 'Recherche USDA non configurée côté serveur.' }, 500)
  }

  // Foundation + SR Legacy are USDA's generic/raw-ingredient datasets —
  // deliberately excludes "Branded" (packaged products, which is exactly
  // OpenFoodFacts's own strength already covered by the other search) so
  // the two sources complement rather than duplicate each other.
  const params = new URLSearchParams({
    api_key: apiKey,
    query,
    pageSize: '15',
    dataType: 'Foundation,SR Legacy',
  })

  let response: Response
  try {
    response = await fetchWithTimeout(`${FDC_SEARCH_URL}?${params.toString()}`, {
      method: 'GET',
    })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: 'Recherche USDA indisponible pour le moment.' }, 502)
  }

  if (!response.ok) {
    console.error('USDA FDC error', response.status, await response.text())
    return jsonResponse({ error: 'Recherche USDA indisponible pour le moment.' }, 502)
  }

  const data = await response.json()
  return jsonResponse(data)
})
