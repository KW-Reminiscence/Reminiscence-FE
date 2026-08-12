export class ConversationCompletionGate {
  private uploadInFlight = false
  private finishRequested = false
  private completed = false
  private completionInFlight: Promise<void> | null = null

  beginUpload() {
    this.uploadInFlight = true
  }

  endUpload() {
    this.uploadInFlight = false
    return this.finishRequested
  }

  requestFinish() {
    this.finishRequested = true
    return !this.uploadInFlight
  }

  run(task: () => Promise<unknown>): Promise<void> {
    if (this.completed) return Promise.resolve()
    if (this.completionInFlight) return this.completionInFlight

    this.completionInFlight = task()
      .then(() => {
        this.completed = true
      })
      .finally(() => {
        this.completionInFlight = null
      })
    return this.completionInFlight
  }
}
