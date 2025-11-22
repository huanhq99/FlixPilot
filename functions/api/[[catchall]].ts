export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  // Remove /api prefix to get the TMDB path
  const path = url.pathname.replace(/^\/api/, '');
  
  // Construct the target URL
  // If the user provides an API key in the query, use it.
  // Otherwise, we could inject one if we wanted to hide it, but the current frontend sends it.
  // However, for better security/proxying, we can just forward everything.
  
  const tmdbUrl = `https://api.themoviedb.org/3${path}${url.search}`;
  
  // Forward the request
  const response = await fetch(tmdbUrl, {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.body,
  });

  // Return the response with CORS headers just in case
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Access-Control-Allow-Origin', '*');
  return newResponse;
};
