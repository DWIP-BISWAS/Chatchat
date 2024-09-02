'use client'
import 'regenerator-runtime/runtime'

import { cn } from '@/lib/utils'
import { ChatList } from '@/components/chat-list'
import { ChatPanel } from '@/components/chat-panel'
import { EmptyScreen } from '@/components/empty-screen'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import { useEffect, useState } from 'react'
import { useUIState, useAIState } from 'ai/rsc'
import { Message, Session } from '@/lib/types'
import { usePathname, useRouter } from 'next/navigation'
import { useScrollAnchor } from '@/lib/hooks/use-scroll-anchor'
import { toast } from 'sonner'
import TalkingHeadComponent from '../app/avatarai/page'

export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string
  session?: Session
  missingKeys: string[]
}

export function Chat({ id, className, session, missingKeys }: ChatProps) {
  const router = useRouter()
  const path = usePathname()
  const [input, setInput] = useState('')
  const [messages] = useUIState()
  const [aiState] = useAIState()

  const [_, setNewChatId] = useLocalStorage('newChatId', id)
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(stream => {
        setAudioStream(stream)
        // Set MIME type to 'audio/mpeg' or 'audio/webm' depending on what's supported
        const mimeType = 'audio/webm;codecs=opus' // 'audio/mpeg' or 'audio/mp4' can also be tried if supported by the browser
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          console.error(`${mimeType} is not supported in your browser.`)
          return
        }

        const recorder = new MediaRecorder(stream, { mimeType })
        recorder.ondataavailable = event => {
          if (event.data.size > 0) {
            setAudioBlob(event.data)
          }
        }
        recorder.start()
        setTimeout(() => {
          recorder.stop()
        }, 25000)
      })
      .catch(err => {
        console.error('Error accessing microphone:', err)
      })
  }, [audioBlob])

  useEffect(() => {
    if (audioBlob) {
      const formData = new FormData()
      formData.append('audio', audioBlob, `${Date.now().toString()}.webm`) // Append the Blob as a file
      setAudioStream(null)
      fetch('/api/groq', {
        method: 'POST',
        body: formData
      })
        .then(response => response.json())
        .then(data => {
          console.log('Transcription result:', data)
          setInput(`${input} ${data.transcription.text}`)
        })
        .catch(error => {
          console.error('Error during transcription:', error)
        })
    }
  }, [audioBlob])
  useEffect(() => {
    console.log(audioStream)
  }, [audioStream])
  useEffect(() => {
    if (session?.user) {
    }
  }, [id, path, session?.user, messages])

  useEffect(() => {
    const messagesLength = aiState.messages?.length
    if (messagesLength === 2) {
      router.refresh()
    }
  }, [aiState.messages, router])

  useEffect(() => {
    // setNewChatId(id)
  })

  useEffect(() => {
    missingKeys.map(key => {
      toast.error(`Missing ${key} environment variable!`)
    })
  }, [missingKeys])

  const { messagesRef, scrollRef, visibilityRef, isAtBottom, scrollToBottom } =
    useScrollAnchor()

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <TalkingHeadComponent />
      <div
        className="group w-full overflow-auto pl-0 peer-[[data-state=open]]:lg:pl-[250px] peer-[[data-state=open]]:xl:pl-[300px]"
        ref={scrollRef}
        style={{
          maxHeight: 'calc(100vh - 4rem)',
          height: 'calc(100vh - 4rem)'
        }}
      >
        <div
          className={cn('pb-[200px] pt-4 md:pt-10', className)}
          ref={messagesRef}
        >
          {messages.length ? (
            <ChatList messages={messages} isShared={false} session={session} />
          ) : (
            <EmptyScreen />
          )}
          <div className="w-full h-px" ref={visibilityRef} />
        </div>

        <ChatPanel
          id={id}
          input={input}
          setInput={setInput}
          isAtBottom={isAtBottom}
          scrollToBottom={scrollToBottom}
        />
      </div>
    </div>
  )
}
