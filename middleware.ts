import { InsforgeMiddleware } from '@insforge/nextjs/middleware';

export default InsforgeMiddleware({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || 'https://c6yjw3du.eu-central.insforge.app',
    // All routes are public — auth is optional, but we detect signed-in users
    publicRoutes: ['/', '/mail', '/crm', '/calendar', '/marketing', '/plesk', '/social', '/webhooks', '/whatsapp'],
});

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
