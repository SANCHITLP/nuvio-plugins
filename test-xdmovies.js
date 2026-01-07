// Test XDmovies provider
const { getStreams } = require('./providers/xdmovies.js');

async function test() {
    console.log('=================================');
    console.log('Testing XDmovies Provider');
    console.log('=================================\n');

    // Test 1: Movie - Oppenheimer
    console.log('Test 1: Movie - Oppenheimer (TMDB ID: 872585)');
    console.log('---------------------------------------');
    try {
        const movieStreams = await getStreams('872585', 'movie');
        console.log(`✓ Streams found: ${movieStreams.length}`);
        if (movieStreams.length > 0) {
            console.log('\nSample streams:');
            movieStreams.slice(0, 3).forEach((stream, i) => {
                console.log(`  ${i + 1}. ${stream.name}`);
                console.log(`     Title: ${stream.title}`);
                console.log(`     Quality: ${stream.quality}`);
                console.log(`     Size: ${stream.size}`);
                console.log(`     URL: ${stream.url.substring(0, 80)}...`);
            });
        }
    } catch (error) {
        console.error('✗ Error:', error.message);
    }

    console.log('\n=================================\n');

    // Test 2: TV Show - Breaking Bad S01E01
    console.log('Test 2: TV Show - Breaking Bad S01E01 (TMDB ID: 1396)');
    console.log('---------------------------------------');
    try {
        const tvStreams = await getStreams('1396', 'tv', 1, 1);
        console.log(`✓ Streams found: ${tvStreams.length}`);
        if (tvStreams.length > 0) {
            console.log('\nSample streams:');
            tvStreams.slice(0, 3).forEach((stream, i) => {
                console.log(`  ${i + 1}. ${stream.name}`);
                console.log(`     Title: ${stream.title}`);
                console.log(`     Quality: ${stream.quality}`);
                console.log(`     Size: ${stream.size}`);
                console.log(`     URL: ${stream.url.substring(0, 80)}...`);
            });
        }
    } catch (error) {
        console.error('✗ Error:', error.message);
    }

    console.log('\n=================================');
    console.log('Testing Complete');
    console.log('=================================');
}

test();
