'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { SlidePanel } from '@second-turn/design-system';
import { Chat as MessageSquare, RefreshCw as Loader2 } from 'griddy-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { QuestionInput } from './QuestionInput';
import { QuestionThread } from './QuestionThread';
import type { ListingQuestion } from '@/lib/types/question';
import type { ListingCondition } from '@/lib/types/listing';
import { getConditionLabel } from '@/lib/types/listing';
import { useTranslations } from 'next-intl';

interface ListingQuestionsDrawerProps {
  listingId: string;
  sellerId: string;
  gameName: string;
  gameImage: string | null;
  price: number;
  condition: ListingCondition;
  isOpen: boolean;
  onClose: () => void;
  /** Callback when question count changes */
  onQuestionCountChange?: (count: number) => void;
  /** Callback when login is needed */
  onLoginRequired: () => void;
}

export function ListingQuestionsDrawer({
  listingId,
  sellerId,
  gameName,
  gameImage,
  price,
  condition,
  isOpen,
  onClose,
  onQuestionCountChange,
  onLoginRequired,
}: ListingQuestionsDrawerProps) {
  const t = useTranslations('Game.QuestionsDrawer');
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ListingQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  // Check if current user is the seller (sellers can't post questions on their own listings)
  const isSeller = user?.id === sellerId;
  const isAuthenticated = !!user;

  // Fetch questions when drawer opens
  const fetchQuestions = useCallback(async () => {
    if (!isOpen) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${listingId}/questions`);
      if (!response.ok) {
        throw new Error('Failed to load questions');
      }
      const data = await response.json();
      setQuestions(data.questions || []);
      onQuestionCountChange?.(data.questions?.length || 0);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to load questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, listingId, onQuestionCountChange]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Post a new question
  const handlePostQuestion = async (content: string) => {
    if (!isAuthenticated) {
      onLoginRequired();
      return;
    }

    setIsPosting(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to post question');
      }

      const data = await response.json();
      setQuestions((prev) => [data.question, ...prev]);
      onQuestionCountChange?.((questions.length || 0) + 1);
    } catch (err) {
      console.error('Error posting question:', err);
      throw err; // Re-throw so QuestionInput can handle it
    } finally {
      setIsPosting(false);
    }
  };

  // Reply to a question
  const handleReply = async (questionId: string, content: string) => {
    if (!isAuthenticated) {
      onLoginRequired();
      return;
    }

    const response = await fetch(
      `/api/listings/${listingId}/questions/${questionId}/replies`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to post reply');
    }

    const data = await response.json();

    // Update the questions list with the new reply
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          return {
            ...q,
            replies: [...(q.replies || []), data.reply],
          };
        }
        return q;
      })
    );
  };

  const conditionLabel = getConditionLabel(condition);
  const questionCount = questions.length;

  return (
    <SlidePanel
      open={isOpen}
      onClose={onClose}
      title={t('title')}
      size="md"
    >
      <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] pb-16 md:pb-0">
        {/* Custom Header with Game Info */}
        <div className="bg-bg-secondary/50 px-4 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            {/* Game Thumbnail */}
            {gameImage ? (
              <Image
                src={gameImage}
                alt={gameName}
                width={48}
                height={48}
                className="rounded-lg object-cover flex-shrink-0"
                unoptimized
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-bg-secondary flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-text-muted" />
              </div>
            )}

            {/* Game Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-polar-night truncate">
                {gameName}
              </h3>
              <p className="text-sm text-text-secondary">
                €{price.toFixed(2)} · {conditionLabel}
              </p>
            </div>
          </div>

          {/* Question Count */}
          <div className="mt-2 pt-2 border-t border-border-subtle">
            <span className="text-xs text-text-muted">
              {isLoading
                ? t('loading')
                : t('questionsCount', { count: questionCount })}
            </span>
          </div>
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-frost-ice" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm text-aurora-red mb-2">{error}</p>
              <button
                onClick={fetchQuestions}
                className="text-sm text-frost-ice hover:underline"
              >
                {t('tryAgain')}
              </button>
            </div>
          ) : questionCount === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-sm font-medium text-polar-night mb-1">
                {t('noQuestionsTitle')}
              </p>
              <p className="text-xs text-text-secondary max-w-[240px] mx-auto">
                {t('noQuestionsHint')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question) => (
                <QuestionThread
                  key={question.id}
                  question={question}
                  onReply={handleReply}
                  isAuthenticated={isAuthenticated}
                  onLoginRequired={onLoginRequired}
                />
              ))}
            </div>
          )}
        </div>

        {/* Question Input - Fixed at bottom */}
        {isSeller ? (
          <div className="border-t border-border-subtle bg-snow-white px-4 py-3">
            <p className="text-xs text-text-muted text-center">
              {t('sellerCannotAsk')}
            </p>
          </div>
        ) : (
          <QuestionInput
            onSubmit={handlePostQuestion}
            disabled={isPosting}
            placeholder={
              isAuthenticated
                ? t('askPlaceholder')
                : t('signInToAsk')
            }
          />
        )}
      </div>
    </SlidePanel>
  );
}
