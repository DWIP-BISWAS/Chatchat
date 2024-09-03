'use client'
import 'regenerator-runtime/runtime'
import { useEffect, useState, useRef } from 'react'
import { Message, Session } from '@/lib/types'
import TalkingHeadComponent from '../app/avatarai/page'
import { useChat } from 'ai/react'
import fetch_and_play_audio from '@/lib/chat/fetch_and_play_audio'
import SpeechRecognition, {
  useSpeechRecognition
} from 'react-speech-recognition'

export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string
  session?: Session
  missingKeys: string[]
}

export function Chat({ id }: ChatProps) {
  const [audioBuffer, setAudioBuffer] = useState<Uint8Array | undefined>(
    undefined
  )
  const [textResponse, setTextResponse] = useState('')
  const [isEditing, setIsEditing] = useState(false) // Track whether the user is editing

  const [isChatOpen, setIsChatOpen] = useState(true) // State to manage chat visibility
  const [allMessages, setAllMessages] = useState<Message[]>([])
  let {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading
  } = useChat({})
  const lastAiMessageRef = useRef<Message | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null) // Ref for the textarea
  const [isResponding, setIsResponding] = useState(false) // Track if we are waiting for a response

  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition,
    listening
  } = useSpeechRecognition()

  useEffect(() => {
    setInput(transcript)
  }, [transcript])

  useEffect(() => {
    console.log('running lsistener')
    if (!browserSupportsSpeechRecognition) {
      console.error('Browser does not support speech recognition.')
      return
    }

    if (!isResponding) {
      // Start listening for speech immediately when the component mounts
      SpeechRecognition.startListening({ continuous: true })
      console.log('Listening for speech...')
    }

    if (isResponding) {
      SpeechRecognition.stopListening() // Clean up on unmount or when editing starts
      console.log('Stopped listening for speech.')
    }

    return () => {
      SpeechRecognition.stopListening() // Clean up on unmount or when editing starts
      console.log('Stopped listening for speech.')
    }
  }, [isResponding, isEditing, browserSupportsSpeechRecognition])

  useEffect(() => {
    async function getAudioAndPlay() {
      if (messages.length === 0) {
        return
      }
      console.log('Last message', messages[messages.length - 1])
      console.log('Messages:', messages[messages.length - 1]?.role)
      console.log('Messages:', messages[messages.length - 1].content.length)
      if (messages[messages.length - 1]?.role === 'assistant') {
        const lastMessage = messages[messages.length - 1]
        console.log('Last message:', lastMessage.content)

        setTextResponse(lastMessage.content)

        const audiB = await fetch_and_play_audio({
          text: lastMessage.content
        })
        console.log('Audio ', audiB)
        setAudioBuffer(audiB as any)
      }
    }
    getAudioAndPlay()
  }, [isLoading])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent sending another message while waiting for a response
    if (isResponding) return

    // Call handleSubmit with the updated input state
    handleSubmit()

    // Reset the transcript after submission
    resetTranscript()

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    lastAiMessageRef.current = null // Reset for the next AI message
  }
  function transformContentToString(content: any): string {
    if (typeof content === 'string') {
      return content
    }

    if (Array.isArray(content)) {
      return content
        .map(part => {
          if (typeof part === 'string') return part
          if (part.text) return part.text
          return '' // Fallback in case of an unknown structure
        })
        .join('')
    }

    return ''
  }

  useEffect(() => {
    if (textareaRef.current) {
      adjustTextareaHeight() // Adjust height whenever transcript is updated
    }
  }, [transcript])

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto' // Reset the height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px` // Adjust based on scroll height
    }
  }

  const handleTextareaChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setIsEditing(true) // Stop transcription when the user starts typing
    handleInputChange(event) // Allow manual editing of the input
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100%'
      }}
    >
      <TalkingHeadComponent
        textToSay={textResponse}
        audioToSay={audioBuffer}
        setIsResponding={setIsResponding}
      />
      <div
        style={{
          width: '100%',
          height: 'calc(100vh - 65px)',
          display: 'flex',
          flexDirection: 'column-reverse',
          alignItems: 'space-evenly'
        }}
      >
        {isChatOpen ? (
          <div
            style={{
              width: '100%', // Responsive width based on viewport
              height: '75vh', // Fixed height
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              backgroundColor: '#fff',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end' // Align chat to the bottom
            }}
          >
            {/* Close Button */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end'
              }}
            >
              <button
                onClick={() => setIsChatOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#34B7F1'
                }}
              >
                ✖
              </button>
            </div>

            <div
              style={{
                flex: '1',
                overflowY: 'auto' // Scrollable
              }}
            >
              {messages.map((message, index) => (
                <div
                  key={index}
                  style={{
                    textAlign: message.role === 'user' ? 'right' : 'left',
                    marginBottom: '8px',
                    padding: '2px'
                  }}
                >
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '8px 12px',
                      borderRadius: '20px',
                      backgroundColor:
                        message.role === 'user' ? '#DCF8C6' : '#E5E5EA',
                      color: '#000',
                      maxWidth: '75%',
                      wordWrap: 'break-word'
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={onSubmit}
              style={{
                display: 'flex',
                padding: '8px',
                borderTop: '1px solid #E5E5EA'
              }}
            >
              <textarea
                name="prompt"
                value={input} // Always keep the input updated
                onChange={handleTextareaChange}
                ref={textareaRef} // Attach ref to the textarea
                rows={1}
                style={{
                  flex: '1',
                  padding: '8px',
                  borderRadius: '20px',
                  border: 'none',
                  resize: 'none', // Disable manual resizing
                  overflow: 'hidden', // Hide overflow to make it look clean
                  backgroundColor: '#F0F0F0'
                }}
              />
              <button
                type="submit"
                style={{
                  marginLeft: '8px',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: '#34B7F1',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Send
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div
              style={{
                position: 'fixed',
                right: '2vh',
                bottom: '55vh',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: '#34B7F1',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer',
                zIndex: 1000,
                fontSize: '24px'
              }}
              onClick={() => setIsChatOpen(true)}
            >
              📅
            </div>
            <div
              style={{
                position: 'fixed',
                right: '2vh',
                bottom: '45vh',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: '#34B7F1',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer',
                zIndex: 1000,
                fontSize: '24px'
              }}
              onClick={() => setIsChatOpen(true)}
            >
              🏆
            </div>
            <div
              style={{
                position: 'fixed',
                right: '2vh',
                bottom: '35vh',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: '#34B7F1',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer',
                zIndex: 1000,
                fontSize: '24px'
              }}
              onClick={() => setIsChatOpen(true)}
            >
              🎁
            </div>
            <div
              style={{
                position: 'fixed',
                right: '2vh',
                bottom: '25vh',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: '#34B7F1',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer',
                zIndex: 1000,
                fontSize: '24px'
              }}
              onClick={() => setIsChatOpen(true)}
            >
              📖
            </div>
            <div
              style={{
                position: 'fixed',
                right: '2vh',
                bottom: '15vh',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: '#34B7F1',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer',
                zIndex: 1000,
                fontSize: '24px'
              }}
              onClick={() => setIsChatOpen(true)}
            >
              📞
            </div>
            <div
              style={{
                position: 'fixed',
                right: '2vh',
                bottom: '5vh',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: '#34B7F1',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer',
                zIndex: 1000,
                fontSize: '24px'
              }}
              onClick={() => setIsChatOpen(true)}
            >
              💬
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
