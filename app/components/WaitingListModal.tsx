'use client';

import { useState } from 'react';
import Image from 'next/image';

interface WaitingListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WaitingListModal({ isOpen, onClose }: WaitingListModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    
    // TODO: Replace with actual API endpoint when ready
    // For now, just simulate submission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
        setEmail('');
        setIsSubmitted(false);
      }, 2500);
    }, 1000);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backgroundColor: 'rgba(5, 5, 5, 0.85)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={handleOverlayClick}
    >
      <div
        style={{
          backgroundColor: '#131313',
          border: '1px solid #222',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '440px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #2a2a2a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.backgroundColor = '#222';
            e.currentTarget.style.borderColor = '#333';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.backgroundColor = '#1a1a1a';
            e.currentTarget.style.borderColor = '#2a2a2a';
          }}
        >
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Content */}
        <div style={{ padding: '48px 40px 40px 40px' }}>
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '32px',
            }}
          >
            <Image
              src="/final-logo.png"
              alt="ProphitLine"
              width={64}
              height={64}
              style={{ width: '64px', height: '64px' }}
            />
          </div>

          {/* Heading */}
          <h2
            style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#ffffff',
              textAlign: 'center',
              marginBottom: '12px',
              letterSpacing: '-0.5px',
            }}
          >
            Join the Waitlist
          </h2>

          {/* Description */}
          <p
            style={{
              color: '#94a3b8',
              textAlign: 'center',
              fontSize: '15px',
              lineHeight: '1.6',
              marginBottom: '40px',
              padding: '0 8px',
            }}
          >
            Sign up to be among the first to access full functionality when it launches.
          </p>

          {isSubmitted ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px auto',
                }}
              >
                <svg
                  width="36"
                  height="36"
                  fill="none"
                  stroke="#10b981"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p
                style={{
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '18px',
                  marginBottom: '8px',
                }}
              >
                You're on the list!
              </p>
              <p
                style={{
                  color: '#94a3b8',
                  fontSize: '14px',
                }}
              >
                We'll notify you when full functionality is available.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Email Input */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#cbd5e1',
                    marginBottom: '10px',
                  }}
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#2a2a2a';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <style jsx>{`
                  input::placeholder {
                    color: #64748b;
                  }
                  input:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                  }
                `}</style>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: isSubmitting || !email.trim() ? '#374151' : '#10b981',
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '15px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: isSubmitting || !email.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  marginBottom: '20px',
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting && email.trim()) {
                    e.currentTarget.style.backgroundColor = '#059669';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting && email.trim()) {
                    e.currentTarget.style.backgroundColor = '#10b981';
                  }
                }}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="spinner-icon"
                      style={{
                        width: '20px',
                        height: '20px',
                      }}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        style={{ opacity: 0.25 }}
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        style={{ opacity: 0.75 }}
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Signing up...</span>
                  </>
                ) : (
                  'Join Waitlist'
                )}
              </button>
            </form>
          )}

          {/* Footer Note */}
          {!isSubmitted && (
            <p
              style={{
                fontSize: '12px',
                color: '#64748b',
                textAlign: 'center',
                marginTop: '24px',
                lineHeight: '1.5',
              }}
            >
              We'll only use your email to notify you about the launch.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

