import { describe, expect, it, vi } from 'vitest';
import { createIframeMessageChannel } from '@/components/edit-panel/plugin-host/message-channel';

describe('message-channel helpers', () => {
  it('returns false when iframe window is unavailable', () => {
    const channel = createIframeMessageChannel({
      getIframeWindow: () => null,
      getTargetOrigin: () => '*',
    });

    expect(channel.post({ type: 'init' })).toBe(false);
  });

  it('posts normalized payload to iframe window', () => {
    const postMessage = vi.fn();
    const channel = createIframeMessageChannel({
      getIframeWindow: () => ({ postMessage } as unknown as Window),
      getTargetOrigin: () => 'https://example.com',
    });

    const result = channel.post({
      type: 'init',
      payload: {
        title: 'editor',
        removeMe: () => 'noop',
      },
    });

    expect(result).toBe(true);
    expect(postMessage).toHaveBeenCalledWith(
      {
        type: 'init',
        payload: {
          title: 'editor',
        },
      },
      'https://example.com'
    );
  });

  it('returns false when postMessage throws', () => {
    const channel = createIframeMessageChannel({
      getIframeWindow: () => ({
        postMessage: () => {
          throw new Error('post failed');
        },
      } as unknown as Window),
      getTargetOrigin: () => '*',
    });

    expect(channel.post({ type: 'init' })).toBe(false);
  });
});
