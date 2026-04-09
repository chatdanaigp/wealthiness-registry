// const fetch = require('node-fetch'); // Native fetch is available in Node 18+

const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzJDc6EK6jg6mQ-2FqVmLz2O4vExtptcatFKMkx2zs219K6umCQZ7hKYO-9t_rG9j2/exec';
const BOT_SECRET = 'wealthiness-secure-v1';

async function testFetch() {
    try {
        const url = `${GOOGLE_APPS_SCRIPT_URL}?action=getApproved&bot_secret=${BOT_SECRET}`;
        console.log('Fetching from:', url);
        const response = await fetch(url);
        const result = await response.json();
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testFetch();
