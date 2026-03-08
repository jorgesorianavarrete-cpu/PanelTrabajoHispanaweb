import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'WhatsApp | Hispanaweb Panel',
    description: 'Gestión de comunicaciones multicanal de WhatsApp',
};

export default function WhatsAppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
