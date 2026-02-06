/**
 * MovieBox Scraper for Nuvio (Hermes/JS Environment)
 * Features: Cloudflare DNS-over-HTTPS (DoH), Android User-Agent, HMAC-MD5 Signing
 */

const CryptoJS = require('crypto-js');

// --- CONFIGURATION ---
const API_BASE_HOST = "api.inmoviebox.com";
const TMDB_API_KEY = 'd131017ccc6e5462a81c9304d21476de';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Android 14 User-Agent
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UD1A.230805.019) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.71 Mobile Safari/537.36';

// --- DNS OVER HTTPS (DoH) RESOLVER ---
async function resolveDns(hostname) {
    try {
        const dohUrl = `https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`;
        const response = await fetch(dohUrl, {
            headers: { 'Accept': 'application/dns-json' }
        });
        const json = await response.json();
        if (json.Answer && json.Answer.length > 0) {
            return json.Answer[0].data;
        }
    } catch (e) {
        console.error(`DNS Resolution failed for ${hostname}:`, e);
    }
    return null;
}

// --- CRYPTO HELPERS ---
const KEY_B64_DEFAULT = "NzZpUmwwN3MweFNOOWpxbUVXQXQ3OUVCSlp1bElRSXNWNjRGWnIyTw==";
const SECRET_KEY = CryptoJS.enc.Base64.parse(
    CryptoJS.enc.Base64.parse(KEY_B64_DEFAULT).toString(CryptoJS.enc.Utf8)
);

function generateXClientToken(timestamp) {
    const ts = timestamp.toString();
    const reversed = ts.split('').reverse().join('');
    const hash = CryptoJS.MD5(reversed).toString(CryptoJS.enc.Hex);
    return `${ts},${hash}`;
}

function generateXTrSignature(method, accept, contentType, pathWithQuery, body, timestamp) {
    let bodyHash = "";
    let bodyLength = "0";

    if (body) {
        const bodyWords = CryptoJS.enc.Utf8.parse(body);
        bodyHash = CryptoJS.MD5(bodyWords).toString(CryptoJS.enc.Hex);
        bodyLength = bodyWords.sigBytes.toString();
    }

    const canonical = [
        method.toUpperCase(),
        accept || "",
        contentType || "",
        bodyLength,
        timestamp,
        bodyHash,
        pathWithQuery
    ].join('\n');

    const signature = CryptoJS.HmacMD5(canonical, SECRET_KEY).toString(CryptoJS.enc.Base64);
    return `${timestamp}|2|${signature}`;
}

// --- NETWORK REQUESTER ---
async function secureRequest(method, path, body = null) {
    const timestamp = Date.now();
    const url = `https://${API_BASE_HOST}${path}`;
    
    // Attempt DoH Resolution
    const ip = await resolveDns(API_BASE_HOST);
    const requestUrl = ip ? `https://${ip}${path}` : url;

    const headers = {
        'User-Agent': ANDROID_UA,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-client-token': generateXClientToken(timestamp),
        'x-tr-signature': generateXTrSignature(method, 'application/json', 'application/json', path, body, timestamp),
        'Host': API_BASE_HOST
    };

    try {
        const response = await fetch(requestUrl, {
            method,
            headers,
            body: body || undefined
        });
        return await response.json();
    } catch (err) {
        console.error("MovieBox Request Error:", err);
        return null;
    }
}

// --- SEARCH & SCRAPE LOGIC ---
async function getStreams(tmdbId, mediaType, season = 1, episode = 1) {
    // 1. Get Details from TMDB
    const tmdbRes = await fetch(`${TMDB_BASE_URL}/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`);
    const details = await tmdbRes.json();
    const query = details.title || details.name;

    // 2. Search MovieBox
    const searchBody = JSON.stringify({ "page": 1, "perPage": 10, "keyword": query });
    const searchRes = await secureRequest('POST', '/wefeed-mobile-bff/subject-api/search/v2', searchBody);

    if (!searchRes?.data?.results) return [];

    // 3. Find Best Match
    const typeId = mediaType === 'movie' ? 1 : 2;
    const subjects = searchRes.data.results.flatMap(r => r.subjects || []);
    const match = subjects.find(s => s.subjectType === typeId);

    if (!match) return [];

    // 4. Get Play Info
    const s = mediaType === 'tv' ? season : 0;
    const e = mediaType === 'tv' ? episode : 0;
    const playPath = `/wefeed-mobile-bff/subject-api/play-info?subjectId=${match.subjectId}&se=${s}&ep=${e}`;
    const playRes = await secureRequest('GET', playPath);

    if (!playRes?.data?.streams) return [];

    // 5. Format Stream Links
    return playRes.data.streams.map(stream => ({
        name: `MovieBox ${stream.quality || 'Auto'}`,
        url: stream.url,
        headers: {
            'User-Agent': ANDROID_UA,
            "Referer": `https://${API_BASE_HOST}`,
            ...(stream.signCookie ? { "Cookie": stream.signCookie } : {})
        }
    }));
}

module.exports = { getStreams };
