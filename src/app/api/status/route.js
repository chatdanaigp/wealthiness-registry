import { NextResponse } from 'next/server';

const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
        return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    if (!GOOGLE_APPS_SCRIPT_URL) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
        const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?username=${encodeURIComponent(username)}`, {
            method: 'GET',
            headers: {
                'Follow-Redirects': 'true' // Apps Script always redirects
            }
        });

        // Handle Google Apps Script redirect behavior
        // Actually fetch follows redirects by default in Node.js >= 18 (Next.js environment)

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Status check error:', error);
        return NextResponse.json({ found: false, error: 'Failed to fetch status' });
    }
}
