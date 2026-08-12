import clsx from 'clsx';
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiCheck,
  FiChevronLeft,
  FiCopy,
  FiGlobe,
  FiHash,
  FiMessageCircle,
  FiPlus,
  FiSend,
  FiTrash2,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi';
import type { Socket } from 'socket.io-client';
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Eyebrow,
  Field,
  LoadingState,
  Pill,
  SegmentedControl,
} from '../components/ui';
import { apiRequest, readableError } from '../lib/api';
import { formatMessageTime } from '../lib/format';
import { emitWithAck, getSocket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import type { ChatMessage, ChatMessageDeletedEvent, ChatRoom } from '../types';

type RoomResponse = { room: ChatRoom };
type RoomsResponse = { rooms: ChatRoom[] };
type MessagesResponse = { messages: ChatMessage[]; nextBefore: string | null };

function messageAuthor(message: ChatMessage): string {
  return message.user.handle;
}

function ChatRoomPanel({ room, onBack }: { room: ChatRoom; onBack: () => void }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const appendMessage = useCallback(
    (message: ChatMessage) => {
      if (message.roomId !== room.id) return;
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) return current;
        return [...current, message].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      });
    },
    [room.id],
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    setError(null);
    apiRequest<MessagesResponse>(`/chat/rooms/${room.id}/messages?limit=50`, { token })
      .then((response) => {
        if (!active) return;
        setMessages([...response.messages].reverse());
        setNextBefore(response.nextBefore);
      })
      .catch((reason) => active && setError(readableError(reason)))
      .finally(() => active && setLoading(false));

    const socket = getSocket(token);
    socketRef.current = socket;
    const subscribe = () => {
      setConnected(true);
      void emitWithAck(socket, 'chat:subscribe', { roomId: room.id }).catch((reason) => {
        if (active) setError(readableError(reason));
      });
    };
    const disconnect = () => setConnected(false);
    const receive = (message: ChatMessage) => appendMessage(message);
    const deleted = (event: ChatMessageDeletedEvent) => {
      if (event.roomId !== room.id) return;
      setMessages((current) =>
        current.map((message) =>
          message.id === event.messageId
            ? { ...message, body: null, deletedAt: event.deletedAt }
            : message,
        ),
      );
    };
    socket.on('connect', subscribe);
    socket.on('disconnect', disconnect);
    socket.on('chat:message', receive);
    socket.on('chat:message_deleted', deleted);
    if (socket.connected) subscribe();

    return () => {
      active = false;
      socket.off('connect', subscribe);
      socket.off('disconnect', disconnect);
      socket.off('chat:message', receive);
      socket.off('chat:message_deleted', deleted);
    };
  }, [appendMessage, room.id, token]);

  useEffect(() => {
    if (!loading) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [loading, messages.length]);

  const loadOlder = async () => {
    if (!token || !nextBefore || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const response = await apiRequest<MessagesResponse>(
        `/chat/rooms/${room.id}/messages?limit=50&before=${encodeURIComponent(nextBefore)}`,
        { token },
      );
      setMessages((current) => [...response.messages.reverse(), ...current]);
      setNextBefore(response.nextBefore);
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    const socket = socketRef.current;
    if (!socket || !text || sending) return;
    setSending(true);
    setError(null);
    try {
      const message = await emitWithAck<ChatMessage>(socket, 'chat:send', {
        roomId: room.id,
        body: text,
        clientNonce: crypto.randomUUID(),
      });
      if (message) appendMessage(message);
      setBody('');
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    const socket = socketRef.current;
    if (!socket) return;
    try {
      await emitWithAck(socket, 'chat:delete', { messageId });
    } catch (reason) {
      setError(readableError(reason));
    }
  };

  return (
    <section className="chat-room-panel">
      <header className="chat-room-header">
        <button
          className="chat-back-button"
          type="button"
          aria-label="Back to rooms"
          title="Back to rooms"
          onClick={onBack}
        >
          <FiChevronLeft aria-hidden="true" />
        </button>
        <span className={clsx('room-icon', room.kind === 'commons' && 'room-icon--commons')}>
          {room.kind === 'commons' ? <FiGlobe aria-hidden="true" /> : <FiHash aria-hidden="true" />}
        </span>
        <span className="chat-room-header__title">
          <strong>{room.name}</strong>
          <small>
            {room.kind === 'commons' ? 'Everyone on this Playstead' : `${room.memberCount} members`}
          </small>
        </span>
        <Pill tone={connected ? 'live' : 'neutral'}>
          <span className="presence-dot" /> {connected ? 'Live' : 'Reconnecting'}
        </Pill>
      </header>

      <div className="message-list" ref={listRef} aria-live="polite">
        {nextBefore ? (
          <Button size="sm" variant="quiet" loading={loadingOlder} onClick={() => void loadOlder()}>
            Earlier messages
          </Button>
        ) : null}
        {loading ? (
          <LoadingState label="Opening the conversation…" />
        ) : messages.length === 0 ? (
          <EmptyState title="A quiet table" copy="Say hello and start this conversation." />
        ) : (
          messages.map((message, index) => {
            const mine = message.user.id === user?.id;
            const previous = messages[index - 1];
            const grouped =
              previous?.user.id === message.user.id &&
              new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() <
                5 * 60 * 1000;
            return (
              <article
                className={clsx('chat-message', mine && 'is-mine', grouped && 'is-grouped')}
                key={message.id}
              >
                {!grouped ? (
                  <span className="avatar avatar--small">
                    {messageAuthor(message).slice(0, 2).toUpperCase()}
                  </span>
                ) : (
                  <span className="message-avatar-spacer" />
                )}
                <div className="chat-message__content">
                  {!grouped ? (
                    <div className="chat-message__meta">
                      <strong>{mine ? 'You' : messageAuthor(message)}</strong>
                      <time>{formatMessageTime(message.createdAt)}</time>
                    </div>
                  ) : null}
                  <p className={message.deletedAt ? 'is-deleted' : undefined}>
                    {message.deletedAt ? 'Message removed' : message.body}
                  </p>
                </div>
                {mine && !message.deletedAt ? (
                  <button
                    className="message-delete"
                    type="button"
                    title="Delete message"
                    aria-label="Delete message"
                    onClick={() => void deleteMessage(message.id)}
                  >
                    <FiTrash2 aria-hidden="true" />
                  </button>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      {error ? <ErrorBanner message={error} /> : null}
      <form className="message-composer" onSubmit={send}>
        <label className="sr-only" htmlFor="chat-message">
          Message {room.name}
        </label>
        <textarea
          id="chat-message"
          rows={1}
          maxLength={1000}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={`Message ${room.name}`}
        />
        <Button
          type="submit"
          aria-label="Send message"
          title="Send message"
          disabled={!body.trim()}
          loading={sending}
        >
          <FiSend aria-hidden="true" /> <span className="composer-send-label">Send</span>
        </Button>
      </form>
    </section>
  );
}

function CircleTools({ onRoom }: { onRoom: (room: ChatRoom) => void }) {
  const token = useAuthStore((state) => state.token);
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const response =
        mode === 'create'
          ? await apiRequest<RoomResponse>('/chat/rooms', { method: 'POST', token, body: { name } })
          : await apiRequest<RoomResponse>('/chat/rooms/join', {
              method: 'POST',
              token,
              body: { inviteCode: code },
            });
      onRoom(response.room);
      setName('');
      setCode('');
    } catch (reason) {
      setError(readableError(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="circle-tools">
      <SegmentedControl
        label="Circle action"
        value={mode}
        onChange={setMode}
        segments={[
          { value: 'create', label: 'Create' },
          { value: 'join', label: 'Join' },
        ]}
      />
      <form onSubmit={submit}>
        {mode === 'create' ? (
          <Field
            label="Circle name"
            value={name}
            minLength={2}
            maxLength={48}
            required
            onChange={(event) => setName(event.target.value)}
            placeholder="Sunday explorers"
          />
        ) : (
          <Field
            label="Invite code"
            value={code}
            minLength={6}
            maxLength={12}
            required
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="MAPLE7"
          />
        )}
        {error ? <ErrorBanner message={error} /> : null}
        <Button type="submit" size="sm" loading={busy}>
          {mode === 'create' ? <FiPlus aria-hidden="true" /> : <FiUserPlus aria-hidden="true" />}
          {mode === 'create' ? 'Create circle' : 'Join circle'}
        </Button>
      </form>
    </Card>
  );
}

export function ChatPage() {
  const token = useAuthStore((state) => state.token);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    apiRequest<RoomsResponse>('/chat/rooms', { token })
      .then((response) => {
        if (!active) return;
        setRooms(response.rooms);
        setActiveRoomId(
          (current) =>
            current ??
            response.rooms.find((room) => room.kind === 'commons')?.id ??
            response.rooms[0]?.id ??
            null,
        );
      })
      .catch((reason) => active && setError(readableError(reason)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) ?? null,
    [activeRoomId, rooms],
  );

  const addRoom = (room: ChatRoom) => {
    setRooms((current) =>
      current.some((item) => item.id === room.id) ? current : [...current, room],
    );
    setActiveRoomId(room.id);
  };

  const copyInvite = async () => {
    if (!activeRoom?.inviteCode) return;
    await navigator.clipboard.writeText(activeRoom.inviteCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className={clsx('page chat-page', activeRoom && 'has-active-room')}>
      <header className="page-heading chat-page-heading">
        <div>
          <Eyebrow>Stay around the table</Eyebrow>
          <h1>Conversations</h1>
          <p>Chat in the Commons or make a private circle for your people.</p>
        </div>
        <Pill tone="live">
          <FiMessageCircle aria-hidden="true" /> Real-time
        </Pill>
      </header>

      <div className="chat-layout">
        <aside className="room-sidebar">
          {loading ? (
            <LoadingState label="Finding your rooms…" />
          ) : error ? (
            <ErrorBanner message={error} />
          ) : (
            <>
              <div className="room-section">
                <h2>Shared space</h2>
                {rooms
                  .filter((room) => room.kind === 'commons')
                  .map((room) => (
                    <button
                      className={clsx('room-button', room.id === activeRoomId && 'is-active')}
                      key={room.id}
                      type="button"
                      onClick={() => setActiveRoomId(room.id)}
                    >
                      <span className="room-icon room-icon--commons">
                        <FiGlobe aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{room.name}</strong>
                        <small>Everyone is welcome</small>
                      </span>
                    </button>
                  ))}
              </div>
              <div className="room-section">
                <h2>
                  <span>Your circles</span>
                  <small>{rooms.filter((room) => room.kind === 'circle').length}</small>
                </h2>
                {rooms
                  .filter((room) => room.kind === 'circle')
                  .map((room) => (
                    <button
                      className={clsx('room-button', room.id === activeRoomId && 'is-active')}
                      key={room.id}
                      type="button"
                      onClick={() => setActiveRoomId(room.id)}
                    >
                      <span className="room-icon">
                        <FiUsers aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{room.name}</strong>
                        <small>{room.memberCount} members</small>
                      </span>
                    </button>
                  ))}
              </div>
              <CircleTools onRoom={addRoom} />
            </>
          )}
        </aside>

        <div className="chat-main">
          {activeRoom ? (
            <>
              {activeRoom.kind === 'circle' && activeRoom.inviteCode ? (
                <div className="invite-strip">
                  <span>
                    <FiUserPlus aria-hidden="true" /> Invite code{' '}
                    <strong>{activeRoom.inviteCode}</strong>
                  </span>
                  <Button size="sm" variant="quiet" onClick={() => void copyInvite()}>
                    {copied ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}{' '}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              ) : null}
              <ChatRoomPanel room={activeRoom} onBack={() => setActiveRoomId(null)} />
            </>
          ) : (
            <Card className="chat-welcome">
              <EmptyState
                title="Choose a conversation"
                copy="Open the Commons or one of your circles to start chatting."
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
