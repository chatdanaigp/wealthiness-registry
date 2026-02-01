import { NextResponse } from 'next/server';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Determine the origin for redirect
    const origin = request.headers.get('origin') ||
        request.headers.get('x-forwarded-proto') + '://' + request.headers.get('host') ||
        'http://localhost:3000';

    if (error) {
        return NextResponse.redirect(`${origin}/wn_registry?error=${error}`);
    }

    if (!code) {
        return NextResponse.redirect(`${origin}/wn_registry?error=no_code`);
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: `${origin}/api/auth/discord/callback`,
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('Token exchange failed:', errorData);
            return NextResponse.redirect(`${origin}/wn_registry?error=token_exchange_failed`);
        }

        const tokenData = await tokenResponse.json();

        // Get user information
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        if (!userResponse.ok) {
            return NextResponse.redirect(`${origin}/wn_registry?error=user_fetch_failed`);
        }

        const userData = await userResponse.json();

        // Encode user data and redirect back to register page
        const discordData = encodeURIComponent(JSON.stringify({
            id: userData.id,
            username: userData.username,
            discriminator: userData.discriminator,
            global_name: userData.global_name,
            avatar: userData.avatar,
        }));

        return NextResponse.redirect(`${origin}/wn_registry?discord=${discordData}`);

    } catch (error) {
        console.error('Discord OAuth error:', error);
        return NextResponse.redirect(`${origin}/wn_registry?error=server_error`);
    }
}
