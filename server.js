import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const cacheDir = process.env.CACHE_DIR || 'cache';
const cachingEnabled = process.env.CACHING_ENABLED === 'true';
const apiBaseUrl = process.env.API_BASE_URL || 'https://api.openai.com/';

import { parse, stringify } from 'flatted/cjs'; // Handle circular JSON

const generateCacheKey = (req) => {
  const hasher = createHash('md5');
  hasher.update(req.url);
  // Sort query params for consistency
  hasher.update(stringify(Object.keys(req.query).sort().reduce((obj, key) => {
    obj[key] = req.query[key];
    return obj;
  }, {})));

  // Normalize JSON body by sorting keys
  if (req.body) {
    try {
      const normalizedBody = JSON.parse(req.body);
      hasher.update(JSON.stringify(normalizedBody, Object.keys(normalizedBody).sort()));
    } catch (error) {
      // Fallback for non-JSON body
      hasher.update(req.body);
    }
  }
  return hasher.digest('hex');
};

// Modify the loadFromCache to check TTL
const loadFromCache = async (key) => {
  try {
    const cachePath = path.join(cacheDir, key);
    const cachedDataRaw = await fs.readFile(cachePath, 'utf8');
    const cachedData = JSON.parse(cachedDataRaw);
    
    // Check if the cache has expired
    const ttl = 3600; // 1 hour TTL, for example
    if (new Date() - new Date(cachedData.timestamp) > ttl * 1000) {
      throw new Error('Cache expired'); // Treat it as a cache miss
    }
    
    return cachedData.response;
  } catch (error) {
    return null;
  }
};

// Ensure saveToCache includes a timestamp
const saveToCache = async (key, data) => {
  try {
    await fs.mkdir(cacheDir, { recursive: true });
    const cachePath = path.join(cacheDir, key);
    const cachedData = { timestamp: new Date(), response: data };
    await fs.writeFile(cachePath, JSON.stringify(cachedData));
  } catch (error) {
    console.error('Failed to save cache:', error);
  }
};

export default async function handler(req, res) {
  if (!cachingEnabled) {
    // Directly proxy the request if caching is disabled
    return proxyRequest(req, res);
  }

  const cacheKey = generateCacheKey(req);
  const cachedResponse = await loadFromCache(cacheKey);
  
  if (cachedResponse) {
    res.status(cachedResponse.status).json(cachedResponse.data);
    return;
  }

  // If not in cache, proxy the request and cache the result
  const proxyResponse = await proxyRequest(req, res, true); // true indicates caching should be considered
  
  if (proxyResponse) {
    // Save successful responses to cache
    await saveToCache(cacheKey, { status: proxyResponse.status, data: proxyResponse.data });
  }
};

// Function to proxy the request
// `considerCaching` is true if we should return the response object for caching, false to directly respond
const proxyRequest = async (req, res, considerCaching = false) => {
  // Replace this URL with the actual target
  const proxyUrl = `${apiBaseUrl}${req.query.path.join('/')}`;

  try {
    const response = await axios({
      method: req.method,
      url: proxyUrl,
      headers: { ...req.headers, host: new URL(apiBaseUrl).host },
      data: req.body,
    });

    if (considerCaching) {
      return { status: response.status, data: response.data };
    } else {
      res.status(response.status).json(response.data);
    }
  } catch (error) {
    console.error('Request to downstream service failed:', error);
    res.status(503).json({ error: 'Service unavailable' });
    return null; // Indicate failure for caching purposes
  }
};

// Example usage
// This is a Next.js API route
// You can use it as a standalone serverless function as well

// export default async function handler(req, res) {can I hear 
//   if (req.method === 'GET') {
//     const response = await proxyRequest(req, res);
//     if (response) {
//       res.status(response.status).json(response.data);
//     }
//   } else {
//     // Handle other methods
//   }
