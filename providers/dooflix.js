/**
 * Dooflix Plugin for Nuvio
 * Ported from TypeScript components
 */

const DOOFLIX_HEADERS = {
    "Accept-Encoding": "gzip",
    "API-KEY": "2pm95lc6prpdbk0ppji9rsqo",
    "Connection": "Keep-Alive",
    "If-Modified-Since": "Wed, 14 Aug 2024 13:00:04 GMT",
    "User-Agent": "okhttp/3.14.9",
};

/**
 * Handles Dooflix API's messy response which is often a JSON string 
 * wrapped in non-JSON characters.
 */
function safeJsonParse(data) {
    if (typeof data !== 'string') return data;
    try {
        const jsonStart = data.indexOf("{") !== -1 ? data.indexOf("{") : data.indexOf("[");
        const jsonEnd = Math.max(data.lastIndexOf("}"), data.lastIndexOf("]")) + 1;
        if (jsonStart === -1 || jsonEnd === 0) return JSON.parse(data);
        const jsonStr = data.substring(jsonStart, jsonEnd);
        return JSON.parse(jsonStr);
    } catch (e) {
        return null;
    }
}

const catalog = [
    {
        title: "Series",
        filter: "/rest-api//v130/tvseries",
    },
    {
        title: "Movies",
        filter: "/rest-api//v130/movies",
    }
];

async function getPosts({ filter, page, signal, providerContext }) {
    const { axios, getBaseUrl } = providerContext;
    const baseUrl = await getBaseUrl("dooflix");
    const url = `${baseUrl}${filter}?page=${page}`;

    try {
        const res = await axios.get(url, { headers: DOOFLIX_HEADERS, signal });
        const data = safeJsonParse(res.data);
        const posts = [];

        // Movies array
        if (data?.movie) {
            data.movie.forEach(item => {
                const id = item?.videos_id;
                if (!id) return;
                posts.push({
                    title: item.title || "",
                    link: `${baseUrl}/rest-api//v130/single_details?type=movie&id=${id}`,
                    image: (item.thumbnail_url || "").replace("http:", "https:"),
                });
            });
        }

        // TV Series array
        if (data?.tvseries) {
            data.tvseries.forEach(item => {
                const id = item?.videos_id;
                if (!id) return;
                posts.push({
                    title: item.title || "",
                    link: `${baseUrl}/rest-api//v130/single_details?type=tvseries&id=${id}`,
                    image: (item.thumbnail_url || "").replace("http:", "https:"),
                });
            });
        }

        return posts;
    } catch (err) {
        console.error("Dooflix getPosts error:", err);
        return [];
    }
}

async function getMeta({ link, providerContext }) {
    const { axios } = providerContext;

    try {
        const res = await axios.get(link, { headers: DOOFLIX_HEADERS });
        const data = safeJsonParse(res.data);
        if (!data) return null;

        const isSeries = Number(data.is_tvseries) === 1;
        const metaLinks = [];

        if (isSeries) {
            data.season?.forEach(s => {
                metaLinks.push({
                    title: s.seasons_name || "Season",
                    directLinks: s.episodes?.map(e => ({
                        title: e.episodes_name || `Episode ${e.orders}`,
                        link: e.file_url
                    })) || []
                });
            });
        } else {
            data.videos?.forEach(v => {
                metaLinks.push({
                    title: `${data.title} ${v.label || ""}`,
                    directLinks: [{ title: "Play", link: v.file_url }]
                });
            });
        }

        return {
            title: data.title || "",
            image: (data.poster_url || "").replace("http:", "https:"),
            synopsis: data.description || "",
            rating: data.imdb_rating || "N/A",
            cast: data.cast || [],
            tags: data.genre?.map(g => g.name) || [],
            links: metaLinks
        };
    } catch (err) {
        console.error("Dooflix getMeta error:", err);
        return null;
    }
}

async function getStream({ link, providerContext }) {
    // Basic stream wrapper for direct links returned by Dooflix
    if (!link) return [];

    const streamHeaders = {
        "Connection": "Keep-Alive",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.37",
        "Referer": "https://molop.art/",
        "Cookie": "cf_clearance=M2_2Hy4lKRy_ruRX3dzOgm3iho1FHe2DUC1lq28BUtI-1737377622-1.2.1.1-6R8RaH94._H2BuNuotsjTZ3fAF6cLwPII0guemu9A5Xa46lpCJPuELycojdREwoonYS2kRTYcZ9_1c4h4epi2LtDvMM9jIoOZKE9pIdWa30peM1hRMpvffTjGUCraHsJNCJez8S_QZ6XkkdP7GeQ5iwiYaI6Grp6qSJWoq0Hj8lS7EITZ1LzyrALI6iLlYjgLmgLGa1VuhORWJBN8ZxrJIZ_ba_pqbrR9fjny"
    };

    return [{
        name: "Dooflix Server",
        url: link,
        quality: "HD",
        headers: streamHeaders
    }];
}

// Export module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { catalog, getPosts, getMeta, getStream };
} else {
    global.dooflix = { catalog, getPosts, getMeta, getStream };
}
