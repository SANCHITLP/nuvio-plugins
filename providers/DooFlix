/**
 * Dooflix Plugin for Nuvio
 * Handles Movies and TV Series via the Dooflix API
 */

const DOOFLIX_HEADERS = {
    "Accept-Encoding": "gzip",
    "API-KEY": "2pm95lc6prpdbk0ppji9rsqo",
    "Connection": "Keep-Alive",
    "If-Modified-Since": "Wed, 14 Aug 2024 13:00:04 GMT",
    "User-Agent": "okhttp/3.14.9",
};

/**
 * Helper to extract and parse JSON from the messy Dooflix response
 */
function parseDooflixData(resData) {
    if (!resData || typeof resData !== "string") return resData;
    try {
        const jsonStart = resData.indexOf("{") !== -1 ? resData.indexOf("{") : resData.indexOf("[");
        const jsonEnd = Math.max(resData.lastIndexOf("}"), resData.lastIndexOf("]")) + 1;
        if (jsonStart === -1 || jsonEnd === 0) return resData;
        
        const jsonSubstring = resData.substring(jsonStart, jsonEnd);
        return JSON.parse(jsonSubstring);
    } catch (e) {
        console.error("Dooflix Parse Error:", e);
        return resData;
    }
}

/**
 * Catalog Configuration
 */
const catalog = [
    { title: "Series", filter: "/rest-api//v130/tvseries" },
    { title: "Movies", filter: "/rest-api//v130/movies" },
];

/**
 * Fetches the list of posts (Movies/Series)
 */
async function getPosts({ filter, page, signal, providerContext }) {
    try {
        const { axios, getBaseUrl } = providerContext;
        const baseUrl = await getBaseUrl("dooflix");
        const url = `${baseUrl}${filter}?page=${page}`;

        const res = await axios.get(url, { headers: DOOFLIX_HEADERS, signal });
        const data = parseDooflixData(res.data);

        const posts = [];

        // Handle Movies
        data?.movie?.forEach((item) => {
            const id = item?.videos_id;
            if (!id) return;
            posts.push({
                title: item?.title || "",
                link: `${baseUrl}/rest-api//v130/single_details?type=movie&id=${id}`,
                image: (item?.thumbnail_url || "").replace("http:", "https:"),
            });
        });

        // Handle TV Series
        data?.tvseries?.forEach((item) => {
            const id = item?.videos_id;
            if (!id) return;
            posts.push({
                title: item?.title || "",
                link: `${baseUrl}/rest-api//v130/single_details?type=tvseries&id=${id}`,
                image: (item?.thumbnail_url || "").replace("http:", "https:"),
            });
        });

        return posts;
    } catch (error) {
        console.error("Dooflix getPosts Error:", error.message);
        return [];
    }
}

/**
 * Fetches Metadata for a specific Movie or Series
 */
async function getMeta({ link, providerContext }) {
    try {
        const { axios } = providerContext;
        const res = await axios.get(link, { headers: DOOFLIX_HEADERS });
        const data = parseDooflixData(res.data);

        const title = data?.title || "";
        const isSeries = Number(data?.is_tvseries) === 1;
        const links = [];

        if (isSeries) {
            data?.season?.forEach((season) => {
                const seasonTitle = season?.seasons_name || "Season";
                const episodes = season?.episodes?.map((ep) => ({
                    title: ep?.episodes_name || `Episode ${ep?.orders}`,
                    link: ep?.file_url,
                })) || [];

                links.push({
                    title: seasonTitle,
                    directLinks: episodes,
                });
            });
        } else {
            data?.videos?.forEach((video) => {
                links.push({
                    title: `${title} - ${video?.label || 'Play'}`,
                    directLinks: [{
                        title: "Play",
                        link: video?.file_url,
                    }],
                });
            });
        }

        return {
            title: title,
            image: (data?.poster_url || "").replace("http:", "https:"),
            synopsis: data?.description || "",
            rating: data?.imdb_rating || "N/A",
            cast: data?.cast || [],
            tags: data?.genre?.map(g => g?.name) || [],
            links: links,
        };
    } catch (error) {
        console.error("Dooflix getMeta Error:", error.message);
        return null;
    }
}

/**
 * Fetches Streams (Source URLs)
 */
async function getStream({ link, providerContext }) {
    try {
        // Based on stream.ts logic
        const streams = [];
        const headers = {
            "Connection": "Keep-Alive",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.37",
            "Referer": "https://molop.art/",
            "Cookie": "cf_clearance=M2_2Hy4lKRy_ruRX3dzOgm3iho1FHe2DUC1lq28BUtI-1737377622-1.2.1.1-6R8RaH94._H2BuNuotsjTZ3fAF6cLwPII0guemu9A5Xa46lpCJPuELycojdREwoonYS2kRTYcZ9_1c4h4epi2LtDvMM9jIoOZKE9pIdWa30peM1hRMpvffTjGUCraHsJNCJez8S_QZ6XkkdP7GeQ5iwiYaI6Grp6qSJWoq0Hj8lS7EITZ1LzyrALI6iLlYjgLmgLGa1VuhORWJBN8ZxrJIZ_ba_pqbrR9fjny"
        };

        if (link) {
            streams.push({
                name: "Dooflix Primary",
                url: link,
                quality: "HD",
                headers: headers
            });
        }

        return streams;
    } catch (error) {
        console.error("Dooflix getStream Error:", error.message);
        return [];
    }
}

// Export for Nuvio environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        catalog,
        getPosts,
        getMeta,
        getStream
    };
} else {
    global.dooflixPlugin = {
        catalog,
        getPosts,
        getMeta,
        getStream
    };
}
