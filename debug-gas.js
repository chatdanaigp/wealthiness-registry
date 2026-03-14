const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzJDc6EK6jg6mQ-2FqVmLz2O4vExtqptcatFKMkx2zs219K6umCQZ7hKYO-9t_rG9j2/exec';
const BOT_SECRET = 'wealthiness-secure-v1';

async function testFetch() {
    console.log('Fetching from GAS...');
    try {
        const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?action=getApproved&bot_secret=${BOT_SECRET}`);
        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response:', text);
    } catch (error) {
        console.error('Error:', error);
    }
}

testFetch();
