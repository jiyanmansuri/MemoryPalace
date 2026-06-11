import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Volume2, X, Bell } from 'lucide-react'

// Web Speech API interfaces
let recognition = null
if (typeof window !== 'undefined') {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (SpeechRecognition) {
    recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
  }
}

export default function VoiceAssistant({ user, elderId, currentTab, setCurrentTab, medicines, appointments }) {
  const userLanguage = user?.language || 'gu'
  const lang = userLanguage === 'gu' ? 'gu-IN' : 'en-US'

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [showBubble, setShowBubble] = useState(false)
  const [visualAlerts, setVisualAlerts] = useState([])
  
  // Conversational Medicine States
  const [confirmingMedicine, setConfirmingMedicine] = useState(null)
  const [confirmingAttempt, setConfirmingAttempt] = useState(0)
  const [isMedicalCheckup, setIsMedicalCheckup] = useState(false)
  const [medicalTranscript, setMedicalTranscript] = useState('')
  const [isFamilyMessage, setIsFamilyMessage] = useState(false)
  
  const spokenAlertsRef = useRef(new Set())
  const noAnswerTimeoutRef = useRef(null)

  const triggerVisualAlert = (message) => {
    const id = Date.now()
    setVisualAlerts(prev => [...prev, { id, message }])
    setTimeout(() => {
      setVisualAlerts(prev => prev.filter(a => a.id !== id))
    }, 6000)
  }

  // Child-like caring titles: દાદી/દાદા (Grandma/Grandpa)
  const getElderTitle = () => {
    if (userLanguage === 'gu') {
      return user?.name?.toLowerCase().includes('hector') ? 'દાદા' : 'દાદી'
    } else {
      return user?.name?.toLowerCase().includes('hector') ? 'Grandpa' : 'Grandma'
    }
  }

  // Speech helper
  const speak = (text) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      
      const voices = window.speechSynthesis.getVoices()
      const matchingVoice = voices.find(voice => voice.lang.startsWith(userLanguage))
      if (matchingVoice) {
        utterance.voice = matchingVoice
      }
      window.speechSynthesis.speak(utterance)
    }
  }

  // Speech helper with end callback
  const speakWithCallback = (text, onEndCallback) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      
      const voices = window.speechSynthesis.getVoices()
      const matchingVoice = voices.find(voice => voice.lang.startsWith(userLanguage))
      if (matchingVoice) {
        utterance.voice = matchingVoice
      }
      if (onEndCallback) {
        utterance.onend = () => {
          onEndCallback()
        }
      }
      window.speechSynthesis.speak(utterance)
    } else {
      if (onEndCallback) onEndCallback()
    }
  }

  // Handle sleep log POST directly
  const triggerSleepToggle = async (toSleep) => {
    const moodVal = toSleep ? 'sleeping' : 'awake'
    localStorage.setItem(`sleep_status_${elderId}`, moodVal)
    
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    try {
      await fetch(`${API_BASE}/api/mood/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: elderId, mood: moodVal })
      })
      window.dispatchEvent(new CustomEvent('sleep-status-updated', { detail: moodVal }))
    } catch (e) {
      console.error(e)
    }
  }

  // Response checkers
  const checkPositiveResponse = (text) => {
    const t = text.toLowerCase().trim()
    if (userLanguage === 'gu') {
      return t.includes('હા') || t.includes('લીધી') || t.includes('હા લીધી') || t.includes('પી લીધી') || t.includes('હા પીધી') || t.includes('ચોક્કસ') || t.includes('યસ')
    } else {
      return t.includes('yes') || t.includes('yeah') || t.includes('take') || t.includes('taken') || t.includes('did') || t.includes('done') || t.includes('i did') || t.includes('i have') || t.includes('ok') || t.includes('sure')
    }
  }

  const checkNegativeResponse = (text) => {
    const t = text.toLowerCase().trim()
    if (userLanguage === 'gu') {
      return t.includes('ના') || t.includes('નથી') || t.includes('બાકી') || t.includes('નથી લીધી') || t.includes('ના બાકી') || t.includes('નો')
    } else {
      return t.includes('no') || t.includes('not') || t.includes('haven') || t.includes('dont') || t.includes('don\'t') || t.includes('not yet') || t.includes('skip')
    }
  }

  // Emergency Alert trigger
  const sendEmergencyAlert = async (med) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    try {
      await fetch(`${API_BASE}/api/family/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: elderId,
          medicine_name: med.name,
          message: `Elder did not take medicine ${med.name} within 15 minutes.`
        })
      })
      
      const title = getElderTitle()
      const alertReply = userLanguage === 'gu'
        ? `અરે રે ${title}, તમે હજી સુધી દવા નથી લીધી એટલે મેં અર્જુનને ફોન કરીને એલર્ટ મોકલી દીધો છે હોં! પ્લીઝ હવે તો દવા લઈ લો!`
        : `Oh ${title}, since you didn't take your pills, I had to send an emergency alert to Arjun! Please take them now.`
      
      setResponse(alertReply)
      speak(alertReply)
      setShowBubble(true)
    } catch (e) {
      console.error('Failed to send emergency alert:', e)
    }
  }

  // Conversational Handlers
  const handleConfirmTakeMedicine = async (med) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    try {
      await fetch(`${API_BASE}/api/medicine/take/${med.medicine_id}?scheduled_at=${encodeURIComponent(med.scheduled_at)}&user_id=${elderId}`, {
        method: 'POST'
      })
      
      const title = getElderTitle()
      const reply = userLanguage === 'gu'
        ? `ખૂબ સરસ દાદા! મેં નોંધી લીધું છે કે તમે દવા લઈ લીધી છે. કુટુંબને તેની જાણ કરી દીધી છે હોં!`
        : `Wonderful! I have marked your ${med.name} as taken and updated the family, ${title}.`
      
      setResponse(reply)
      speak(reply)
      
      window.dispatchEvent(new CustomEvent('medicine-taken-updated'))
      
      setConfirmingMedicine(null)
      setConfirmingAttempt(0)
      setTimeout(() => setShowBubble(false), 6000)
    } catch (e) {
      console.error(e)
    }
  }

  const handleDenyTakeMedicine = (med) => {
    const nextAttempt = confirmingAttempt + 1
    setConfirmingAttempt(nextAttempt)
    const title = getElderTitle()
    
    let reply = ''
    if (userLanguage === 'gu') {
      if (nextAttempt <= 2) {
        reply = `અરે વહાલા ${title}, જીદ ન કરો પ્લીઝ! દવા લેશો તો જ જલ્દી સાજા થશો ને. શું તમે હવે ${med.name} લેશો?`
      } else {
        reply = `ચેતવણી: વહાલા ${title}, આ દવા તમારા માટે ખૂબ જરૂરી છે. પ્લીઝ હમણાં જ ${med.name} લો.`
      }
    } else {
      if (nextAttempt <= 2) {
        reply = `Oh ${title}, please don't say no! Taking your pills is so important to feel better. Will you take your ${med.name} now?`
      } else {
        reply = `Warning: You must take this medicine, dear ${title}. Please take your ${med.name} immediately.`
      }
    }
    
    setResponse(reply)
    speakWithCallback(reply, () => {
      try {
        setIsListening(true)
        recognition.start()
      } catch (e) {
        console.error(e)
      }
    })
  }

  const handleAmbiguousResponse = (med) => {
    const nextAttempt = confirmingAttempt + 1
    setConfirmingAttempt(nextAttempt)
    const title = getElderTitle()
    
    let reply = ''
    if (userLanguage === 'gu') {
      reply = `મને બરાબર સમજાણું નથી ${title}. તમે દવા લીધી કે નહીં? પ્લીઝ હા અથવા ના માં કહો ને.`
    } else {
      reply = `I didn't quite catch that, ${title}. Did you take your ${med.name}? Please say yes or no.`
    }
    
    setResponse(reply)
    speakWithCallback(reply, () => {
      try {
        setIsListening(true)
        recognition.start()
      } catch (e) {
        console.error(e)
      }
    })
  }

  const handleNoAnswer = (med) => {
    if (noAnswerTimeoutRef.current) clearTimeout(noAnswerTimeoutRef.current)
    
    const nextAttempt = confirmingAttempt + 1
    setConfirmingAttempt(nextAttempt)
    const title = getElderTitle()
    
    if (nextAttempt > 3) {
      const quitReply = userLanguage === 'gu'
        ? `કોઈ જવાબ મળ્યો નથી ${title}. મેં તમારા ઘરના સભ્યોને એલર્ટ મોકલી આપ્યો છે.`
        : `No response received, ${title}. I am alerting the family.`
      setResponse(quitReply)
      speak(quitReply)
      
      // Auto-trigger alert if 3 attempts of silence occur
      sendEmergencyAlert(med)
      
      setConfirmingMedicine(null)
      setConfirmingAttempt(0)
      setTimeout(() => setShowBubble(false), 5000)
      return
    }

    let reply = ''
    if (userLanguage === 'gu') {
      reply = `વહાલા ${title}, હું ફરીથી પૂછું છું. શું તમે ${med.name} દવા લીધી?`
    } else {
      reply = `My dear ${title}, I am asking again. Did you take your ${med.name} pills?`
    }
    
    setResponse(reply)
    setShowBubble(true)
    
    speakWithCallback(reply, () => {
      try {
        setIsListening(true)
        recognition.start()
      } catch (e) {
        console.error(e)
      }
    })
  }

  const handleMedicalCheckup = async (text) => {
    const fullTranscript = medicalTranscript + " " + text
    setMedicalTranscript(fullTranscript)
    
    const isDone = text.toLowerCase().includes('બસ') || text.toLowerCase().includes('that\'s it') || text.toLowerCase().includes('done') || text.toLowerCase().includes('ના') || text.toLowerCase().includes('no')
    
    if (isDone || fullTranscript.length > 60) {
      const title = getElderTitle()
      const reply = userLanguage === 'gu' 
        ? `ઠીક છે ${title}, મેં બધી વિગતો ડૉક્ટર માટે નોંધ લીધી છે.`
        : `Okay ${title}, I have noted down your symptoms for the doctor.`
      setResponse(reply)
      speak(reply)
      setIsMedicalCheckup(false)
      
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        await fetch(`${API_BASE}/api/medical_summary/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: elderId, transcript: fullTranscript })
        })
        window.dispatchEvent(new CustomEvent('medical-summary-updated'))
      } catch (e) {
        console.error(e)
      }
      setTimeout(() => setShowBubble(false), 6000)
    } else {
      const reply = userLanguage === 'gu' 
        ? `બીજું કંઈ દુખે છે? કે બસ આટલું જ?`
        : `Does anything else hurt, or is that all?`
      setResponse(reply)
      speakWithCallback(reply, () => {
        try {
          setIsListening(true)
          recognition.start()
        } catch (e) { console.error(e) }
      })
    }
  }

  const handleFamilyMessage = async (text) => {
    const title = getElderTitle()
    const reply = userLanguage === 'gu'
      ? `ખૂબ સરસ ${title}, મેં તમારો મેસેજ અર્જુનને મોકલી દીધો છે હોં!`
      : `Great ${title}, I have sent your message to the family!`
      
    setResponse(reply)
    speak(reply)
    setIsFamilyMessage(false)
    
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      await fetch(`${API_BASE}/api/family/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: elderId, message: text })
      })
      window.dispatchEvent(new CustomEvent('family-feed-updated'))
    } catch(e) {
      console.error(e)
    }
    setTimeout(() => setShowBubble(false), 6000)
  }

  // Process voice commands
  const processCommand = (text) => {
    const t = text.toLowerCase().trim()
    let reply = ''
    const title = getElderTitle()
    
    if (userLanguage === 'gu') {
      if (t.includes('ઘર') || t.includes('હોમ') || t.includes('મુખ્ય') || t.includes('ડેસ્કબોર્ડ')) {
        setCurrentTab('home')
        reply = `હા ${title}, આપણે ઘર પેજ પર જઈએ છીએ હોં!`
      } else if (t.includes('યાદ') || t.includes('વાર્તા') || t.includes('યાદગીરી') || t.includes('માઈક')) {
        setCurrentTab('memories')
        reply = `લાવો ${title}, તમારી સરસ વાર્તાઓ વાળું પેજ ખોલી આપું!`
      } else if (t.includes('દવા') || t.includes('મેડિસિન') || t.includes('ગોળી')) {
        setCurrentTab('medicine')
        reply = `${title}, દવાઓનું પેજ ખોલ્યું છે, જોઈ લો હોં!`
      } else if (t.includes('સુવા') || t.includes('ઊંઘ') || t.includes('નિદ્રા') || t.includes('સૂઈ')) {
        triggerSleepToggle(true)
        reply = `${title}, શુભ રાત્રિ! પ્લીઝ જલ્દી સુઈ જજો હોં, હું નોંધી લઉં છું!`
      } else if (t.includes('જાગી') || t.includes('સવાર') || t.includes('જાગો')) {
        triggerSleepToggle(false)
        reply = `શુભ સવાર ${title}! હું તમારા જાગવાની ખુશખબરી નોંધી લઉં છું!`
      } else if (t.includes('અપોઇન્ટમેન્ટ') || t.includes('મુલાકાત') || t.includes('ડૉક્ટર')) {
        const nextAppt = appointments && appointments[0]
        reply = nextAppt 
          ? `${title}, તમારી આગામી અપોઈન્ટમેન્ટ ${toGujaratiDigits(nextAppt.time)} વાગ્યે ${nextAppt.titleGu || nextAppt.title} છે.`
          : `આજે તમારી કોઈ અપોઈન્ટમેન્ટ નથી હોં ${title}.`
      } else if (t.includes('તબિયત') || t.includes('ચેકઅપ')) {
        setIsMedicalCheckup(true)
        setMedicalTranscript('')
        reply = `હા ${title}, તમને શું તકલીફ થાય છે? ક્યાં દુખે છે?`
        speakWithCallback(reply, () => { try { setIsListening(true); recognition.start() } catch (e) {} })
        return
      } else if (t.includes('મેસેજ') || t.includes('સંદેશો')) {
        setIsFamilyMessage(true)
        reply = `હા ${title}, કહો તમારે શું મેસેજ મોકલવો છે?`
        speakWithCallback(reply, () => { try { setIsListening(true); recognition.start() } catch (e) {} })
        return
      } else if (t.includes('કેમ છો') || t.includes('તમે કોણ')) {
        reply = `હું તમારી મદદ કરનાર લાડકું પૌત્ર જેવો છું. કહો, તમારી શું સેવા કરું ${title}?`
      } else {
        reply = `માફ કરજો ${title}, મને સમજાયું નહીં. પ્લીઝ ફરીથી કહેશો?`
      }
    } else {
      if (t.includes('home') || t.includes('go home') || t.includes('dashboard')) {
        setCurrentTab('home')
        reply = `Sure ${title}, let's go back to the home page!`
      } else if (t.includes('memories') || t.includes('story') || t.includes('stories') || t.includes('mic')) {
        setCurrentTab('memories')
        reply = `Here you go ${title}, your beautiful stories page is open!`
      } else if (t.includes('medicine') || t.includes('medicines') || t.includes('pill') || t.includes('pills')) {
        setCurrentTab('medicine')
        reply = `Here is your medicine page, ${title}. Let's make sure everything is taken!`
      } else if (t.includes('sleep') || t.includes('go to sleep')) {
        triggerSleepToggle(true)
        reply = `Good night, ${title}! Sleep tight, I will let everyone know you are sleeping.`
      } else if (t.includes('awake') || t.includes('wake up') || t.includes('woke up')) {
        triggerSleepToggle(false)
        reply = `Good morning, ${title}! I am so happy you are awake, I will tell the family.`
      } else if (t.includes('appointment') || t.includes('appointments') || t.includes('doctor')) {
        const nextAppt = appointments && appointments[0]
        reply = nextAppt
          ? `My dear ${title}, your next appointment is ${nextAppt.title} at ${nextAppt.time}.`
          : `You have no appointments today, ${title}.`
      } else if (t.includes('health') || t.includes('checkup')) {
        setIsMedicalCheckup(true)
        setMedicalTranscript('')
        reply = `Okay ${title}, tell me what's bothering you. Where does it hurt?`
        speakWithCallback(reply, () => { try { setIsListening(true); recognition.start() } catch (e) {} })
        return
      } else if (t.includes('message') || t.includes('send message')) {
        setIsFamilyMessage(true)
        reply = `Sure ${title}, what would you like me to tell the family?`
        speakWithCallback(reply, () => { try { setIsListening(true); recognition.start() } catch (e) {} })
        return
      } else if (t.includes('how are you') || t.includes('who are you') || t.includes('hello') || t.includes('hi')) {
        reply = `I am your caring assistant, like your own grandchild! How can I help you today, ${title}?`
      } else {
        reply = `I didn't quite catch that, ${title}. Could you repeat it for me?`
      }
    }
    
    setResponse(reply)
    speak(reply)
    
    setTimeout(() => {
      setShowBubble(false)
    }, 6000)
  }

  // Initialize Speech Recognition handlers
  useEffect(() => {
    if (!recognition) return

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      const resultText = event.results[0][0].transcript
      setTranscript(resultText)
      
      if (confirmingMedicine) {
        const isPositive = checkPositiveResponse(resultText)
        const isNegative = checkNegativeResponse(resultText)
        
        if (isPositive) {
          handleConfirmTakeMedicine(confirmingMedicine)
        } else if (isNegative) {
          handleDenyTakeMedicine(confirmingMedicine)
        } else {
          handleAmbiguousResponse(confirmingMedicine)
        }
      } else if (isMedicalCheckup) {
        handleMedicalCheckup(resultText)
      } else if (isFamilyMessage) {
        handleFamilyMessage(resultText)
      } else {
        processCommand(resultText)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event)
      setIsListening(false)
      
      if (confirmingMedicine) {
        if (noAnswerTimeoutRef.current) clearTimeout(noAnswerTimeoutRef.current)
        noAnswerTimeoutRef.current = setTimeout(() => {
          if (confirmingMedicine) {
            handleNoAnswer(confirmingMedicine)
          }
        }, 15000)
      } else {
        const title = getElderTitle()
        const errReply = userLanguage === 'gu' 
          ? `માફ કરજો ${title}, હું સાંભળી શકી નથી.` 
          : `Sorry ${title}, I couldn't hear you.`
        setResponse(errReply)
        speak(errReply)
        setTimeout(() => setShowBubble(false), 5000)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      
      if (confirmingMedicine && !transcript) {
        if (noAnswerTimeoutRef.current) clearTimeout(noAnswerTimeoutRef.current)
        noAnswerTimeoutRef.current = setTimeout(() => {
          if (confirmingMedicine) {
            handleNoAnswer(confirmingMedicine)
          }
        }, 15000)
      }
    }
  }, [userLanguage, appointments, confirmingMedicine, transcript])

  // Reminder checking interval
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date()
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      // 1. Medicine reminder checks
      if (medicines && medicines.length > 0) {
        medicines.forEach(med => {
          const medTimeObj = new Date(med.scheduled_at)
          const medHHMM = `${String(medTimeObj.getHours()).padStart(2, '0')}:${String(medTimeObj.getMinutes()).padStart(2, '0')}`
          
          // A. Trigger voice assistant conversation at exact minute
          if (medHHMM === currentHHMM && !med.taken) {
            const alertId = `med_${med.medicine_id}_${currentHHMM}`
            if (!spokenAlertsRef.current.has(alertId)) {
              spokenAlertsRef.current.add(alertId)
              
              setConfirmingMedicine(med)
              setConfirmingAttempt(1)
              setTranscript('')
              setResponse('')
              setShowBubble(true)
              
              const title = getElderTitle()
              const promptText = userLanguage === 'gu'
                ? `${title}, તમારી દવા લેવાનો સમય થઈ ગયો છે. પ્લીઝ તમારી વહાલી ${med.name} દવા લઈ લો ને! શું તમે દવા લીધી?`
                : `My dear ${title}, it's time to take your medicine. Please take your sweet ${med.name} pill for me! Did you take it?`
              
              setResponse(promptText)
              speakWithCallback(promptText, () => {
                try {
                  setIsListening(true)
                  recognition.lang = lang
                  recognition.start()
                } catch (e) {
                  console.error(e)
                }
              })
              
              triggerVisualAlert(userLanguage === 'gu' 
                ? `દવા લેવાનો સમય થઈ ગયો છે: ${med.name}` 
                : `Time to take your medicine: ${med.name}`
              )
            }
          }

          // B. Trigger Emergency alert to caregiver if overdue by 15+ minutes
          if (!med.taken) {
            const diffMs = now.getTime() - medTimeObj.getTime()
            const diffMins = Math.floor(diffMs / 60000)

            if (diffMins >= 15) {
              const emergencyAlertId = `med_emergency_${med.medicine_id}_15`
              if (!spokenAlertsRef.current.has(emergencyAlertId)) {
                spokenAlertsRef.current.add(emergencyAlertId)
                sendEmergencyAlert(med)
              }
            }
          }
        })
      }

      // 2. Appointment checks
      if (appointments && appointments.length > 0) {
        appointments.forEach(appt => {
          const apptTimeParts = appt.time.split(':')
          const apptHour = parseInt(apptTimeParts[0])
          const apptMinute = parseInt(apptTimeParts[1])
          
          const apptDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), apptHour, apptMinute)
          const diffMs = apptDate.getTime() - now.getTime()
          const diffMins = Math.round(diffMs / 60000)

          if (diffMins === 15) {
            const alertId = `appt_${appt.id}_15`
            if (!spokenAlertsRef.current.has(alertId)) {
              spokenAlertsRef.current.add(alertId)
              
              const title = getElderTitle()
              if (userLanguage === 'gu') {
                speak(`વહાલા ${title}, તમારી અપોઈન્ટમેન્ટ ૧૫ મિનિટમાં શરૂ થવાની છે: ${appt.titleGu || appt.title}.`)
              } else {
                speak(`Reminder dear ${title}, your appointment is starting in fifteen minutes: ${appt.title}.`)
              }
              triggerVisualAlert(userLanguage === 'gu'
                ? `અપોઈન્ટમેન્ટ નજીક છે: ${appt.titleGu || appt.title} (૧૫ મિનિટમાં)`
                : `Upcoming appointment: ${appt.title} (in 15 mins)`
              )
            }
          }
        })
      }
    }

    checkReminders()
    const checkInterval = setInterval(checkReminders, 30000)
    return () => clearInterval(checkInterval)
  }, [medicines, appointments, userLanguage])

  // Voice assistant button handler
  const toggleListening = () => {
    if (isListening) {
      try {
        recognition.stop()
      } catch (e) {
        console.error(e)
      }
      setIsListening(false)
    } else {
      setIsListening(true)
      setTranscript('')
      setResponse('')
      setShowBubble(true)
      
      try {
        recognition.lang = lang
        recognition.start()
      } catch (e) {
        console.error(e)
      }
      
      const title = getElderTitle()
      const welcome = userLanguage === 'gu' ? `હા સાંભળું છું ${title}, કહો ક્યાં જઈએ?` : `Listening, my dear ${title}...`
      speak(welcome)
    }
  }

  return (
    <>
      {/* Top Visual Alerts (Toast Notifications) */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-3 w-full max-w-md px-4 pointer-events-none">
        {visualAlerts.map(alert => (
          <div key={alert.id} className="bg-indigo-900/90 text-white backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-indigo-500/30 animate-fade-in pointer-events-auto">
            <Bell size={24} className="text-yellow-400 animate-bounce" />
            <p className="font-bold text-lg flex-1">{alert.message}</p>
            <button 
              onClick={() => setVisualAlerts(prev => prev.filter(a => a.id !== alert.id))}
              className="text-white/60 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>

      {/* Floating Orb Container */}
      <div className="fixed bottom-36 right-6 z-50 flex flex-col items-end">
        {/* Transcription Speech Bubble */}
        {showBubble && (
          <div className="mb-4 bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl p-5 rounded-3xl w-72 md:w-80 text-left flex flex-col gap-3 animate-fade-in relative">
            <div className="absolute right-6 bottom-[-8px] w-4 h-4 bg-white/90 border-r border-b border-white/60 transform rotate-45"></div>
            
            {/* Close Button */}
            <button 
              onClick={() => {
                setShowBubble(false)
                setConfirmingMedicine(null)
                setConfirmingAttempt(0)
              }} 
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>

            <div>
              <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider mb-1">
                {userLanguage === 'gu' ? 'તમે કહ્યું:' : 'You said:'}
              </p>
              <p className="text-lg font-bold text-elder-brown leading-snug font-display">
                {transcript || (userLanguage === 'gu' ? 'સાંભળી રહ્યું છે...' : 'Listening...')}
              </p>
            </div>

            {response && (
              <div className="border-t border-gray-100 pt-2 flex gap-2 items-start">
                <Volume2 size={18} className="text-indigo-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider mb-1">
                    {userLanguage === 'gu' ? 'મદદગાર:' : 'Assistant:'}
                  </p>
                  <p className="text-lg font-bold text-[#4F46E5] leading-snug font-display">
                    {response}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating Voice Assistant Button (Orb) */}
        <button
          onClick={toggleListening}
          className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-2xl relative transition-all duration-500 hover:scale-105 active:scale-95 ${
            isListening 
              ? 'bg-gradient-to-br from-indigo-600 to-[#4F46E5] ring-8 ring-indigo-500/20' 
              : 'bg-gradient-to-br from-[#4F46E5] to-[#818CF8] hover:shadow-[0_12px_36px_rgba(79,70,229,0.3)]'
          }`}
        >
          {/* Audio Wave Pulsing Background (only when listening) */}
          {isListening && (
            <>
              <span className="absolute inset-0 rounded-full bg-indigo-400/30 animate-ping"></span>
              <span className="absolute inset-2 rounded-full bg-indigo-500/20 animate-pulse"></span>
            </>
          )}
          
          {/* Core Orb Center */}
          <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all ${
            isListening ? 'bg-indigo-700' : 'bg-white/10 backdrop-blur border border-white/20'
          }`}>
            {isListening ? (
              <Mic size={32} className="text-white animate-pulse" />
            ) : (
              <Mic size={32} className="text-white" />
            )}
          </div>
        </button>
      </div>
    </>
  )
}
