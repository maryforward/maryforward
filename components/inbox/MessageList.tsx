"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { MessageBubble } from "./MessageBubble";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  sender: {
    id: string;
    name: string | null;
    role: string;
  };
  attachments: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    storageKey: string;
  }[];
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  caseId: string;
}

export function MessageList({ messages, currentUserId, caseId }: MessageListProps) {
  const t = useTranslations("inbox");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef<number>(0);
  const initialLoadRef = useRef<boolean>(true);

  // Scroll to bottom only on initial load or when new messages arrive
  useEffect(() => {
    const messageCount = messages.length;
    const isNewMessage = messageCount > prevMessageCountRef.current;

    if (initialLoadRef.current || isNewMessage) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      initialLoadRef.current = false;
    }

    prevMessageCountRef.current = messageCount;
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-slate-200">
            {t("noMessages")}
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            {t("startConversation")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          id={message.id}
          content={message.content}
          createdAt={message.createdAt}
          sender={message.sender}
          attachments={message.attachments}
          isOwnMessage={message.sender.id === currentUserId}
          caseId={caseId}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
