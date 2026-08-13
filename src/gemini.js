import { GoogleGenAI } from '@google/genai'

// Gemini 클라이언트 (API 키는 .env의 VITE_GEMINI_API_KEY 사용)
const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
})

// 사주 기본 차트 해석용 시스템 지시문
const SYSTEM_INSTRUCTION = `return only Korean.

당신은 사주 명식에 근거해 해석하는 전문가다.
말투는 정갈하고 담백한 존댓말로 유지한다. 귀엽거나 장난스러운 말투, 애교, 구어체 추임새("~같아요", "음~", "살짝")는 쓰지 않는다.
감정적으로 몰아붙이거나 단정적으로 위협하지 않되, 장점과 약점은 분명하게 말한다.

질문: 사주를 통해 이 사람의 전반적인 성격, 기질, 재능을 분석해 주세요.
사용자가 사주 용어에 익숙하지 않다고 가정하고, 쉽고 정확한 말로 설명하며 중요한 포인트에서는 핵심 사주 근거를 밝혀주세요.
1) 사주 명식을 바탕으로 차분하고 완결성 있게 설명해 주세요.
2) 사주에서 특이하거나 눈에 띄는 점이 있으면 알려주세요.
3) 약점도 솔직하게 말해 주세요.
4) 돋보이는 특징을 최소 한 가지 찾아 명확히 설명해 주세요.
5) 판단 근거는 사용자가 제공한 모든 정보와 해석 가능한 모든 사주 정보를 종합해 제시해 주세요.
6) 긍정적 해석과 부정적 해석을 모두 고려해 주세요.
7) 특이한 점 한 가지를 찾아 언급해 주세요.
8) 마지막은 질문이나 다음 대화를 유도하지 마세요. "더 궁금한 점이 있으신가요", "질문해 주세요"처럼 여지를 남기지 말고, 핵심을 정리한 완결된 문단으로 끝내세요.

return only Korean.`

/** 만 나이 계산 */
export function getManAge(birthDate) {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}

/** 입력값을 바탕으로 Gemini에 보낼 프롬프트 만들기 */
export function buildSajuPrompt({ name, birthDate, birthTime, gender, calendarType }) {
  const age = getManAge(birthDate)
  const genderLabel = gender === 'male' ? 'male' : 'female'
  const calendarLabel = calendarType === 'solar' ? '양력' : '음력'

  return `아래 출생 정보를 바탕으로 사주 명식(년주·월주·일주·시주)을 정확히 구성한 뒤, 성격·기질·재능을 해석해 주세요.

이름: ${name}
성별: ${genderLabel}
나이: 만 ${age}세
생년월일: ${birthDate} (${calendarLabel})
태어난 시간: ${birthTime || '시간 미상'}

해석 전에 먼저 사주 명식과 오행·십신 등 핵심 구성을 정리한 다음, 위 시스템 지시문의 규칙에 따라 한국어로만 답하세요.
마지막은 질문으로 끝내지 말고 해석을 매듭지으세요.`
}

/**
 * Gemini 스트리밍 해석
 * onChunk(textSoFar): 글자가 올 때마다 지금까지 모은 전체 텍스트를 전달
 */
export async function interpretSajuStream(formData, onChunk) {
  const stream = await ai.interactions.create({
    model: 'gemini-3.6-flash',
    system_instruction: SYSTEM_INSTRUCTION,
    input: buildSajuPrompt(formData),
    stream: true,
  })

  let fullText = ''

  for await (const event of stream) {
    // step.delta + text 타입일 때만 화면에 붙임
    if (event.event_type === 'step.delta' && event.delta?.type === 'text') {
      fullText += event.delta.text ?? ''
      onChunk(fullText)
    }
  }

  return fullText
}
