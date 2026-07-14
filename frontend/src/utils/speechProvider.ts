import type { DictationAdapter } from "@assistant-ui/react";

export interface SpeechProvider {
  isSupported(): boolean;
  start(options: {
    onResult: (transcript: string, isFinal: boolean) => void;
    onError: (error: string) => void;
    onEnd: () => void;
  }): void;
  stop(): void;
}

export class WebSpeechProvider implements SpeechProvider {
  private recognition: any = null;
  private silenceTimeout: any = null;

  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return SpeechRecognition !== undefined;
  }

  start(options: {
    onResult: (transcript: string, isFinal: boolean) => void;
    onError: (error: string) => void;
    onEnd: () => void;
  }) {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      options.onError('not-supported');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      // Silence timeout: if no results/speech are received for 10 seconds, stop dictation automatically
      const resetSilenceTimeout = () => {
        if (this.silenceTimeout) {
          clearTimeout(this.silenceTimeout);
        }
        this.silenceTimeout = setTimeout(() => {
          console.warn('[SpeechProvider] Silence timeout reached. Auto-stopping.');
          this.stop();
        }, 10000);
      };

      resetSilenceTimeout();

      let finalTranscript = '';

      this.recognition.onresult = (event: any) => {
        resetSilenceTimeout();

        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const fullTranscript = finalTranscript + interimTranscript;
        options.onResult(fullTranscript, interimTranscript.length === 0);
      };

      this.recognition.onerror = (event: any) => {
        console.error('[SpeechProvider] Speech recognition error:', event.error, event.message);
        options.onError(event.error);
      };

      this.recognition.onend = () => {
        if (this.silenceTimeout) {
          clearTimeout(this.silenceTimeout);
          this.silenceTimeout = null;
        }
        options.onEnd();
      };

      this.recognition.start();
    } catch (e: any) {
      console.error('[SpeechProvider] Exception starting recognition:', e);
      options.onError(e.message || 'unknown');
    }
  }

  stop() {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.recognition = null;
    }
  }
}

export class ProviderDictationAdapter implements DictationAdapter {
  constructor(private provider: SpeechProvider) {}

  listen(): DictationAdapter.Session {
    const speechStartCallbacks = new Set<() => void>();
    const speechEndCallbacks = new Set<(result: DictationAdapter.Result) => void>();
    const speechCallbacks = new Set<(result: DictationAdapter.Result) => void>();

    let isStopped = false;

    const session: DictationAdapter.Session = {
      status: { type: "starting" },

      stop: async () => {
        isStopped = true;
        this.provider.stop();
        session.status = { type: "ended", reason: "stopped" };
      },

      cancel: () => {
        isStopped = true;
        this.provider.stop();
        session.status = { type: "ended", reason: "cancelled" };
      },

      onSpeechStart: (callback: () => void) => {
        speechStartCallbacks.add(callback);
        return () => speechStartCallbacks.delete(callback);
      },

      onSpeechEnd: (callback: (result: DictationAdapter.Result) => void) => {
        speechEndCallbacks.add(callback);
        return () => speechEndCallbacks.delete(callback);
      },

      onSpeech: (callback: (result: DictationAdapter.Result) => void) => {
        speechCallbacks.add(callback);
        return () => speechCallbacks.delete(callback);
      }
    };

    try {
      this.provider.start({
        onResult: (transcript, isFinal) => {
          if (isStopped) return;
          
          for (const cb of speechCallbacks) {
            cb({ transcript, isFinal });
          }
          if (isFinal) {
            for (const cb of speechEndCallbacks) {
              cb({ transcript });
            }
          }
        },
        onError: (err) => {
          if (isStopped) return;
          const reason = err === 'not-allowed' || err === 'aborted' ? 'cancelled' : 'error';
          session.status = { type: "ended", reason };
        },
        onEnd: () => {
          if (isStopped) return;
          session.status = { type: "ended", reason: "stopped" };
        }
      });

      session.status = { type: "running" };
      for (const cb of speechStartCallbacks) {
        cb();
      }
    } catch (error) {
      session.status = { type: "ended", reason: "error" };
    }

    return session;
  }
}
