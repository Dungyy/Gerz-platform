import { NextResponse } from 'next/server';

let notifications = []; // in-memory store for demo purposes

function makeId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function GET(request) {
    try {
        const url = new URL(request.url);
        const assignmentId = url.searchParams.get('assignmentId');
        const userId = url.searchParams.get('userId');
        let results = notifications;

        if (assignmentId) results = results.filter(n => n.assignmentId === assignmentId);
        if (userId) results = results.filter(n => n.userId === userId);

        return NextResponse.json(results);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const payload = await request.json();
        const { assignmentId, userId, title, message } = payload;

        if (!assignmentId || !userId || !title) {
            return NextResponse.json({ error: 'assignmentId, userId and title are required' }, { status: 400 });
        }

        const notification = {
            id: makeId(),
            assignmentId,
            userId,
            title,
            message: message || '',
            read: false,
            createdAt: new Date().toISOString(),
        };

        notifications.unshift(notification);
        return NextResponse.json(notification, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 400 });
    }
}

export async function PATCH(request) {
    try {
        const payload = await request.json();
        const { id, read } = payload;
        if (!id || typeof read !== 'boolean') {
            return NextResponse.json({ error: 'id and read(boolean) are required' }, { status: 400 });
        }

        const idx = notifications.findIndex(n => n.id === id);
        if (idx === -1) return NextResponse.json({ error: 'notification not found' }, { status: 404 });

        notifications[idx] = { ...notifications[idx], read };
        return NextResponse.json(notifications[idx]);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 400 });
    }
}

export async function DELETE(request) {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

        const before = notifications.length;
        notifications = notifications.filter(n => n.id !== id);
        if (notifications.length === before) return NextResponse.json({ error: 'notification not found' }, { status: 404 });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}