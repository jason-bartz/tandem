'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUIIcon } from '@/hooks/useUIIcon';
import { FEEDBACK_CATEGORIES } from '@/lib/constants';
import { capacitorFetch, getApiUrl } from '@/lib/api-config';
import logger from '@/lib/logger';

export default function FeedbackPane({ isOpen, onClose }) {
  const { user } = useAuth();
  const { highContrast } = useTheme();
  const getIconPath = useUIIcon();
  const [formData, setFormData] = useState({
    category: FEEDBACK_CATEGORIES[0].value,
    message: '',
    allowContact: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => formData.message.trim().length >= 10, [formData.message]);

  // Reset form when pane closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSubmitSuccess(false);
        setError('');
      }, 300);
    }
  }, [isOpen]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit || submitting || !user) return;

    setSubmitting(true);
    setError('');
    try {
      const response = await capacitorFetch(getApiUrl('/api/feedback'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send feedback');
      }

      setSubmitSuccess(true);
      setFormData({
        category: FEEDBACK_CATEGORIES[0].value,
        message: '',
        allowContact: false,
      });

      setTimeout(() => {
        setSubmitSuccess(false);
        onClose();
      }, 2000);
    } catch (submitError) {
      logger.error('Feedback submission error', submitError);
      const errorMessage = submitError.message || 'Something went wrong. Please try again.';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = FEEDBACK_CATEGORIES.find((cat) => cat.value === formData.category);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sliding Pane */}
      <div
        className={`fixed top-0 left-0 h-full w-full sm:w-[480px] bg-ghost-white dark:bg-bg-surface shadow-2xl transform transition-all duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        }`}
      >
        <div className="h-full overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-ghost-white dark:bg-bg-surface border-b-[3px] border-border-main p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Feedback</h2>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close feedback"
              >
                <svg
                  className="w-6 h-6 text-gray-800 dark:text-gray-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Not Authenticated Message */}
            {!user && (
              <div
                className={`p-4 rounded-2xl border-[3px] ${
                  highContrast
                    ? 'bg-hc-error/20 border-hc-border'
                    : 'bg-accent-yellow/20 border-accent-yellow shadow-[3px_3px_0px_rgba(0,0,0,0.1)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      Sign In Required
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                      You must be signed in to send feedback. Please sign in and try again.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {submitSuccess && (
              <div
                className={`p-4 rounded-2xl border-[3px] ${
                  highContrast
                    ? 'bg-hc-primary/20 border-hc-border'
                    : 'bg-accent-green/20 border-accent-green shadow-[3px_3px_0px_rgba(0,0,0,0.1)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      Feedback Sent Successfully
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                      Thanks for helping us improve Tandem.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                className={`p-4 rounded-2xl border-[3px] ${
                  highContrast
                    ? 'bg-hc-error/20 border-hc-border'
                    : 'bg-accent-red/20 border-accent-red shadow-[3px_3px_0px_rgba(0,0,0,0.1)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Error</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Category Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                  Feedback Type
                </label>
                <div className="space-y-2">
                  {FEEDBACK_CATEGORIES.map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      disabled={!user}
                      onClick={() => setFormData((prev) => ({ ...prev, category: category.value }))}
                      className={`w-full text-left px-4 py-3 rounded-xl border-[3px] font-semibold text-sm transition-all flex items-center gap-3 ${
                        !user
                          ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500'
                          : formData.category === category.value
                            ? highContrast
                              ? 'bg-hc-primary border-hc-border text-black'
                              : 'bg-accent-blue border-border-main text-white shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                            : highContrast
                              ? 'bg-hc-surface border-hc-border text-gray-700 hover:bg-hc-primary/20'
                              : 'bg-ghost-white dark:bg-bg-surface border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {category.icon && (
                        <img
                          src={getIconPath(category.icon)}
                          alt=""
                          className="w-6 h-6 flex-shrink-0"
                        />
                      )}
                      <span>{category.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 px-1 mt-2">
                  {selectedCategory?.description}
                </p>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label
                  htmlFor="feedback-message"
                  className="block text-sm font-bold text-gray-800 dark:text-gray-200"
                >
                  Your Feedback
                </label>
                <textarea
                  id="feedback-message"
                  rows={8}
                  value={formData.message}
                  disabled={!user}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, message: event.target.value }))
                  }
                  className={`w-full rounded-2xl border-[3px] px-4 py-3 text-base resize-none transition-all focus:outline-none focus:ring-4 ${
                    !user
                      ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                      : highContrast
                        ? 'border-hc-border bg-hc-surface text-gray-900 focus:ring-hc-focus/30'
                        : 'border-border-main bg-ghost-white dark:bg-bg-card text-gray-900 dark:text-gray-100 focus:ring-accent-blue/20 shadow-[2px_2px_0px_rgba(0,0,0,0.1)]'
                  }`}
                  placeholder="Describe your feedback in detail. Include puzzle numbers, steps to reproduce bugs, or specific feature suggestions..."
                  maxLength={2000}
                />
                <div className="flex justify-between items-center px-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formData.message.trim().length < 10 && (
                      <span className="text-accent-red font-medium">
                        {10 - formData.message.trim().length} more characters needed
                      </span>
                    )}
                    {formData.message.trim().length >= 10 && (
                      <span className="text-accent-green font-medium">Ready to send</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formData.message.length}/2000
                  </p>
                </div>
              </div>

              {/* Contact Permission */}
              <div
                className={`p-4 rounded-2xl border-[3px] ${
                  highContrast
                    ? 'border-hc-border bg-hc-surface'
                    : 'border-border-main bg-gray-50 dark:bg-bg-card'
                }`}
              >
                <label
                  className={`flex items-start gap-3 select-none ${!user ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <input
                    type="checkbox"
                    disabled={!user}
                    className={`mt-0.5 w-5 h-5 rounded border-[2px] transition-all focus:ring-4 focus:ring-accent-blue/20 ${
                      !user
                        ? 'cursor-not-allowed'
                        : highContrast
                          ? 'border-hc-border'
                          : 'border-gray-400 checked:bg-accent-blue checked:border-accent-blue'
                    }`}
                    checked={formData.allowContact}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, allowContact: event.target.checked }))
                    }
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      You can email me for more details
                    </span>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      We'll only reach out if we need clarification to better address your feedback.
                    </p>
                  </div>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!user || !canSubmit || submitting}
                className={`w-full py-4 rounded-2xl border-[3px] font-bold text-base transition-all focus:outline-none focus:ring-4 ${
                  highContrast
                    ? 'bg-hc-primary border-hc-border text-black hover:bg-hc-focus focus:ring-hc-focus/30'
                    : user && canSubmit && !submitting
                      ? 'bg-accent-blue border-border-main text-white shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none focus:ring-accent-blue/30'
                      : 'bg-gray-300 dark:bg-gray-600 border-border-main text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending...
                  </span>
                ) : (
                  'Send Feedback'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
