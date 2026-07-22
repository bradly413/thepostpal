"use client";

import type { ComponentProps } from "react";
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import Markdown from "react-markdown";
import { Sparkles, ArrowRight, Headset, X, Loader2 } from "lucide-react";

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
}

const AIChatText = {
  p({ ...rest }: ComponentProps<"p">) {
    return <p className="chat-msg-text" {...rest} />;
  },
  ul({ ...rest }: ComponentProps<"ul">) {
    return <ul className="chat-msg-text" style={{ marginInlineStart: '1.5em' }} {...rest} />;
  },
};

import { getPublicTiers } from "@/lib/pricing";

const PUBLIC_PRICING = getPublicTiers()
  .map((t) => `**${t.name}** (${t.price}${t.priceNote ?? ""}) — ${t.features[0]}`)
  .join("; ");

const MOCK_RESPONSES: Record<string, string> = {
  default:
    "I'm a demo assistant on the marketing site — not live AI yet. posterboy drafts, schedules, and posts for your business. Want to join the free closed beta?",
  pricing: `Closed beta is free (no card). After beta, public plans are: ${PUBLIC_PRICING}. See /pricing.`,
  schedule:
    "Create in Studio, caption in your voice, schedule on the calendar, then we publish to Facebook and Instagram on schedule — nothing goes out until you approve.",
  trial:
    "Yes — closed beta is free and we do not ask for a card. Start at /sign-in with signup, walk Voice Architect onboarding, then land on the dashboard.",
  posts:
    "Create as many posts as you want — no per-post cap on any plan. **Solo** ($99/mo after beta) covers 3 social profiles; **Command** ($249/mo base + $39/location) adds multi-location rollups; **BRC Custom** (from $3,500) is done-with-you brand + content.",
  bradly:
    "Bradly built posterboy for his mom, who ran a small business and hated dealing with social media. The product is built for operators who want the week handled.",
};

function findMockResponse(input: string): string {
  const inputLower = input.toLowerCase();
  for (const [key, response] of Object.entries(MOCK_RESPONSES)) {
    if (inputLower.includes(key)) return response;
  }
  return MOCK_RESPONSES.default;
}

function randomID(): string {
  const random = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
  return Math.floor(random * 2 ** 32).toString(16).padStart(8, '0');
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const chatScrollerRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = [
    'How does pricing work?',
    'How does scheduling work?',
    'Tell me about Bradly',
  ];
  const followUpSuggestions = [
    'Join free beta',
    'How many posts per week?',
  ];

  const handleSuggestionClick = (suggestion: string) => {
    handleSubmit(suggestion);
  };

  const handleSubmit = (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;
    const userMessage: Message = { id: randomID(), type: 'user', content: messageText };
    setIsLoading(true);
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    setTimeout(() => {
      const aiMessage: Message = {
        id: randomID(),
        type: 'ai',
        content: findMockResponse(messageText),
      };
      setIsLoading(false);
      setMessages((prev) => [...prev, aiMessage]);
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (chatScrollerRef.current) {
      chatScrollerRef.current.scrollTo({
        top: chatScrollerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  useLayoutEffect(() => {
    const calculateWidth = () => {
      const scrollerWidth = chatScrollerRef.current?.offsetWidth || 0;
      const messagesWidth = chatMessagesRef.current?.offsetWidth || 0;
      setScrollbarWidth(scrollerWidth - messagesWidth);
    };
    const frameId = requestAnimationFrame(calculateWidth);
    return () => cancelAnimationFrame(frameId);
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const messagesStyle: React.CSSProperties = {
    paddingInlineEnd: `calc(1.5em - ${scrollbarWidth}px)`,
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          right: 'calc(24px + env(safe-area-inset-right, 0px))',
          zIndex: 200,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--ink)',
          boxShadow: '0 0.75em 2em hsl(0 0% 0% / 0.3)',
          transition: 'transform 0.3s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <Sparkles size={24} color="#F7F4EE" strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        right: 'calc(24px + env(safe-area-inset-right, 0px))',
        zIndex: 200,
        width: 'min(420px, calc(100vw - 48px))',
        height: 'min(600px, calc(100dvh - 48px - env(safe-area-inset-bottom, 0px)))',
        borderRadius: 24,
        background: 'var(--paper)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px var(--newsprint)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'chatbot-enter 0.3s ease-out',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid var(--newsprint)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Sparkles size={18} color="#F7F4EE" strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 400 }}>Demo assistant</div>
            <div style={{ fontSize: 10, color: 'var(--quiet-sage)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Social media assistant</div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', opacity: 0.5, transition: 'opacity 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {messages.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2em 1.5em',
            gap: '1.5em',
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--ink)',
              boxShadow: '0 0.75em 2em hsl(0 0% 0% / 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                inset: '10%',
                borderRadius: '50%',
                background: 'linear-gradient(hsl(0 0% 100% / 0.3), hsl(0 0% 0% / 0.1), hsl(0 0% 0% / 0) 50%)',
              }} />
              <Sparkles size={28} color="#F7F4EE" strokeWidth={1.5} />
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, textAlign: 'center' }}>
              Ask me anything about posterboy
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              width: '100%',
              background: 'var(--white)',
              borderRadius: 16,
              padding: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(s)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: 'var(--quiet-sage)',
                    position: 'relative',
                    zIndex: 0,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--ink)';
                    e.currentTarget.style.color = 'var(--paper)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.18)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--quiet-sage)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div ref={chatScrollerRef} style={{ flex: 1, overflowY: 'auto', scrollbarGutter: 'stable' }}>
              <div ref={chatMessagesRef} style={{ display: 'flex', flexDirection: 'column', padding: '1em 1.5em', ...messagesStyle }}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      gap: '0.75em',
                      margin: '0.6em 0',
                      minHeight: '2.5em',
                      alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start',
                      flexDirection: msg.type === 'user' ? 'row-reverse' : 'row',
                    }}
                  >
                    {msg.type === 'ai' && (
                      <div style={{ flexShrink: 0 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'var(--ink)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Headset size={16} color="#F7F4EE" />
                        </div>
                      </div>
                    )}
                    <div style={{
                      borderRadius: '1.25em',
                      padding: '0.75em 1em',
                      maxWidth: '80%',
                      fontSize: 13,
                      lineHeight: 1.5,
                      background: msg.type === 'user' ? 'var(--ink)' : 'var(--white)',
                      color: msg.type === 'user' ? 'var(--paper)' : 'var(--ink)',
                      boxShadow: msg.type === 'user'
                        ? '0 4px 12px rgba(0,0,0,0.18)'
                        : '0 2px 8px rgba(0,0,0,0.04)',
                    }}>
                      <Markdown components={AIChatText}>{msg.content}</Markdown>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div style={{ display: 'flex', gap: '0.75em', margin: '0.6em 0', alignSelf: 'flex-start' }}>
                    <div style={{ flexShrink: 0 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'var(--ink)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Headset size={16} color="#F7F4EE" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.75em 1em' }}>
                      <Loader2 size={16} className="pb-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{
              background: 'var(--white)',
              borderRadius: '1.25em',
              margin: '0 1em 1em',
              padding: '0.75em',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}>
              {messages.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5em', flexWrap: 'wrap', marginBottom: '0.5em' }}>
                  {followUpSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s)}
                      disabled={isLoading}
                      style={{
                        background: 'var(--paper)',
                        border: 'none',
                        borderRadius: 8,
                        padding: '4px 10px',
                        fontSize: 11,
                        color: 'var(--quiet-sage)',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.5 : 1,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--ink)';
                        e.currentTarget.style.color = 'var(--paper)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--paper)';
                        e.currentTarget.style.color = 'var(--quiet-sage)';
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  placeholder="Ask anything..."
                  rows={1}
                  style={{
                    flex: 1,
                    background: 'var(--paper)',
                    borderRadius: 12,
                    border: '1px solid var(--newsprint)',
                    padding: '10px 42px 10px 12px',
                    fontSize: 13,
                    outline: 'none',
                    resize: 'none',
                    minHeight: 40,
                    maxHeight: 120,
                    fontFamily: 'var(--font-sans)',
                    color: 'var(--ink)',
                  }}
                />
                <button
                  onClick={() => handleSubmit()}
                  disabled={!input.trim() || isLoading}
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: 'none',
                    background: input.trim() ? 'var(--ink)' : 'var(--newsprint)',
                    color: 'var(--paper)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                  }}
                >
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}