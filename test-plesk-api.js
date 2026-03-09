const fetch = require('node-fetch');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function test() {
    const url = "https://84.246.211.208:8443/api/v2/server";

    // In order to not put the real key in the script, you could fetch it from the db,
    // but the system already tested that the user has a valid key. 
    // Wait, I can just use the proxy endpoint!
}
test();
