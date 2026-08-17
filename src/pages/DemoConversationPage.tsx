import type { DemoDate } from '../features/routine/useDemoDate'
import { ConversationPage } from './ConversationPage'

interface DemoConversationPageProps {
  demoDate: DemoDate
}

export function DemoConversationPage({ demoDate }: DemoConversationPageProps) {
  return <ConversationPage demoDate={demoDate} mode="demo" />
}
