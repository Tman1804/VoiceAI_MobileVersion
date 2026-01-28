export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private onDataAvailable: ((blob: Blob) => void) | null = null;
  private onError: ((error: Error) => void) | null = null;

  async initialize(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 16000 },
      });
    } catch (error) {
      throw new Error('Microphone access denied. Please allow microphone access to record audio.');
    }
  }

  setOnDataAvailable(callback: (blob: Blob) => void): void { this.onDataAvailable = callback; }
  setOnError(callback: (error: Error) => void): void { this.onError = callback; }

  async startRecording(): Promise<void> {
    if (!this.stream) await this.initialize();
    this.audioChunks = [];
    const mimeType = this.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(this.stream!, { mimeType, audioBitsPerSecond: 128000 });
    this.mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) this.audioChunks.push(event.data); };
    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.audioChunks, { type: mimeType });
      if (this.onDataAvailable) this.onDataAvailable(audioBlob);
    };
    this.mediaRecorder.onerror = () => { if (this.onError) this.onError(new Error('Recording error occurred')); };
    this.mediaRecorder.start(1000);
  }

  stopRecording(): void { if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop(); }
  isRecording(): boolean { return this.mediaRecorder?.state === 'recording'; }

  cleanup(): void {
    this.stopRecording();
    if (this.stream) { this.stream.getTracks().forEach((track) => track.stop()); this.stream = null; }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  private getSupportedMimeType(): string {
    const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/mpeg'];
    for (const mimeType of mimeTypes) { if (MediaRecorder.isTypeSupported(mimeType)) return mimeType; }
    return 'audio/webm';
  }
}
