'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChatBubble as MessageCircle, User } from 'griddy-icons';
import { formatDistanceToNow } from 'date-fns';
import type { ListingQuestion } from '@/lib/types/question';
import { QuestionInput } from './QuestionInput';

interface QuestionThreadProps {
  question: ListingQuestion;
  onReply: (questionId: string, content: string) => Promise<void>;
  /** Whether the current user is logged in */
  isAuthenticated: boolean;
  /** Callback when login is needed */
  onLoginRequired: () => void;
}

export function QuestionThread({
  question,
  onReply,
  isAuthenticated,
  onLoginRequired,
}: QuestionThreadProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  const handleReply = async (content: string) => {
    setIsReplying(true);
    try {
      await onReply(question.id, content);
      setShowReplyInput(false);
    } finally {
      setIsReplying(false);
    }
  };

  const handleReplyClick = () => {
    if (!isAuthenticated) {
      onLoginRequired();
      return;
    }
    setShowReplyInput(!showReplyInput);
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-3">
      {/* Main Question */}
      <div className={`p-3 rounded-lg ${question.is_seller ? 'bg-frost-ice/10 border border-frost-ice/30' : 'bg-bg-secondary'}`}>
        <div className="flex items-start gap-3">
          {/* Avatar */}
          {question.author.avatar_url ? (
            <Image
              src={question.author.avatar_url}
              alt={question.author.full_name || 'User'}
              width={32}
              height={32}
              className="rounded-full object-cover flex-shrink-0"
              unoptimized
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-frost-ice/20 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-frost-ice" />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-polar-night">
                {question.author.full_name || 'Anonymous'}
              </span>
              {question.is_seller && (
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 bg-frost-ice text-white rounded">
                  Seller
                </span>
              )}
              <span className="text-xs text-text-muted">
                {formatDate(question.created_at)}
              </span>
            </div>
            <p className="text-sm text-polar-night mt-1 whitespace-pre-wrap break-words">
              {question.content}
            </p>

            {/* Reply button */}
            <button
              onClick={handleReplyClick}
              className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary hover:text-frost-ice transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {showReplyInput ? 'Cancel' : 'Reply'}
              {question.replies && question.replies.length > 0 && !showReplyInput && (
                <span className="text-text-muted">({question.replies.length})</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Replies */}
      {question.replies && question.replies.length > 0 && (
        <div className="ml-6 sm:ml-8 space-y-2">
          {question.replies.map((reply) => (
            <div
              key={reply.id}
              className={`p-3 rounded-lg ${reply.is_seller ? 'bg-frost-ice/10 border border-frost-ice/30' : 'bg-bg-secondary/50'}`}
            >
              <div className="flex items-start gap-2.5">
                {/* Avatar */}
                {reply.author.avatar_url ? (
                  <Image
                    src={reply.author.avatar_url}
                    alt={reply.author.full_name || 'User'}
                    width={28}
                    height={28}
                    className="rounded-full object-cover flex-shrink-0"
                    unoptimized
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-frost-ice/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-frost-ice" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-polar-night">
                      {reply.author.full_name || 'Anonymous'}
                    </span>
                    {reply.is_seller && (
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 bg-frost-ice text-white rounded">
                        Seller
                      </span>
                    )}
                    <span className="text-xs text-text-muted">
                      {formatDate(reply.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-polar-night mt-1 whitespace-pre-wrap break-words">
                    {reply.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Input */}
      {showReplyInput && (
        <div className="ml-6 sm:ml-8">
          <QuestionInput
            onSubmit={handleReply}
            disabled={isReplying}
            placeholder="Write a reply..."
            isReply
          />
        </div>
      )}
    </div>
  );
}
