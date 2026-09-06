'use client';

/**
 * /src/components/customer/shared/ChatWidget.tsx
 * Fast X Nexus — Backward Compatibility Wrapper for Customer Live Support
 *
 * Directs all legacy invocations to the real-time FloatingSupportChat component.
 */

import React from 'react';
import { FloatingSupportChat } from '@/components/chat/FloatingSupportChat';

export function ChatWidget() {
  return <FloatingSupportChat />;
}