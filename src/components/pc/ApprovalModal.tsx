'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnectionStore } from '@/store/connectionStore';
import { tauriInvoke, formatDuration } from '@/lib/utils';
import toast from 'react-hot-toast';

export function ApprovalModal() {
  const pendingAuthRequests = useConnectionStore((s) => s.pendingAuthRequests);
  const removeAuthRequest = useConnectionStore((s) => s.removeAuthRequest);
  const approvalCode = useConnectionStore((s) => s.approvalCode);
  const approvalCodeExpiry = useConnectionStore((s) => s.approvalCodeExpiry);
  const approvalRequestId = useConnectionStore((s) => s.approvalRequestId);
  const setApprovalCode = useConnectionStore((s) => s.setApprovalCode);

  const [countdown, setCountdown] = useState(60);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [showCodeView, setShowCodeView] = useState(false);

  const currentRequest = pendingAuthRequests[0] || null;

  // Deny countdown (60 seconds for request approval)
  useEffect(() => {
    if (!currentRequest || showCodeView) return;
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentRequest?.id, showCodeView]);

  // Code expiry countdown
  useEffect(() => {
    if (!approvalCodeExpiry || !showCodeView) return;
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((approvalCodeExpiry - Date.now()) / 1000));
      setCodeCountdown(remaining);
      if (remaining <= 0) {
        handleInvalidateCode();
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [approvalCodeExpiry, showCodeView]);

  // When approval code is generated, switch to code view
  useEffect(() => {
    if (approvalCode && approvalRequestId) {
      setShowCodeView(true);
    }
  }, [approvalCode, approvalRequestId]);

  const handleApprove = useCallback(async () => {
    if (!currentRequest) return;
    await tauriInvoke('approve_auth_request', { requestId: currentRequest.id });
    toast.success('接続リクエストを承認しました');
  }, [currentRequest]);

  const handleReject = useCallback(async () => {
    if (!currentRequest) return;
    await tauriInvoke('reject_auth_request', { requestId: currentRequest.id });
    removeAuthRequest(currentRequest.id);
    setShowCodeView(false);
    setApprovalCode(null, null, null);
    toast('接続リクエストを拒否しました', { icon: '🚫' });
  }, [currentRequest]);

  const handleInvalidateCode = useCallback(async () => {
    setShowCodeView(false);
    setApprovalCode(null, null, null);
    if (currentRequest) {
      removeAuthRequest(currentRequest.id);
    }
  }, [currentRequest]);

  if (!currentRequest) return null;

  const progressPercent = (countdown / 60) * 100;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        {!showCodeView ? (
          /* === Request Approval View === */
          <>
            <h3
              className="text-lg font-semibold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              新しい接続リクエスト
            </h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>接続元IPアドレス:</span>
                <span
                  className="font-mono"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
                >
                  {currentRequest.ip}
                </span>
              </div>
              <div className="text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>ユーザーエージェント:</span>
                <div
                  className="mt-1 text-xs font-mono p-2 rounded break-all"
                  style={{
                    backgroundColor: 'var(--bg-base)',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {currentRequest.userAgent}
                </div>
              </div>
            </div>

            {/* Countdown with progress ring */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-16 h-16">
                <svg className="progress-ring w-16 h-16" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="3"
                  />
                  <circle
                    className="progress-ring-circle"
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="var(--accent-cyan)"
                    strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPercent / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span
                  className="absolute inset-0 flex items-center justify-center text-sm font-mono font-semibold"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
                >
                  {countdown}
                </span>
              </div>
              <span
                className="ml-3 text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                残り {countdown} 秒
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                className="btn btn-danger flex-1 py-2.5"
              >
                拒否する
              </button>
              <button
                onClick={handleApprove}
                className="btn btn-primary flex-1 py-2.5"
              >
                承認する
              </button>
            </div>
          </>
        ) : (
          /* === Approval Code View === */
          <>
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              承認コード
            </h3>
            <p
              className="text-sm mb-6"
              style={{ color: 'var(--text-secondary)' }}
            >
              Questの画面にこのコードを入力してください
            </p>

            {/* 6-digit code display */}
            <div className="flex justify-center gap-3 mb-6">
              {approvalCode?.split('').map((digit, i) => (
                <div key={i} className="code-digit">
                  {digit}
                </div>
              ))}
            </div>

            {/* Code expiry countdown */}
            <div
              className="text-center text-sm mb-6"
              style={{ color: 'var(--text-secondary)' }}
            >
              有効期限: <span style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
                {formatDuration(codeCountdown)}
              </span>
            </div>

            <button
              onClick={handleInvalidateCode}
              className="btn btn-secondary w-full py-2.5"
            >
              コードを無効にする
            </button>
          </>
        )}
      </div>
    </div>
  );
}
