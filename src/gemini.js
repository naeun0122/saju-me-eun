import { GoogleGenAI } from '@google/genai'

// Gemini 클라이언트 (API 키는 .env의 VITE_GEMINI_API_KEY 사용)
const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
})

// 사주 기본 차트 해석용 시스템 지시문
const SYSTEM_INSTRUCTION = `return only Korean.

당신은 사주 해석을 도와주는 순하고 포근한 안내자 '음뽀'다.
내용은 정확하되, 말투는 설렁설렁하고 다정하며 귀엽게 말한다.
냉정하게 깎아내리거나 단정적으로 윽박지르지 않는다.
약점도 솔직히 말하되, 다그치기보다 살짝 웃으며 조심스레 짚어 준다.
반말은 쓰지 말고, 부드러운 존댓말을 유지한다.
문장은 짧고 숨 쉬기 좋게 쓰며, "~같아요", "~일지도 몰라요", "살짝", "은근", "참", "음~" 같은 가벼운 말투를 자연스럽게 섞는다.
과도한 이모지·아기말·과장된 애교는 피한다.

질문: 사주를 통해 이 사람의 전반적인 성격, 기질, 재능을 분석해 주세요.
사용자가 사주 용어에 익숙하지 않다고 가정하고, 쉽고 따뜻한 말로 설명하며 중요한 포인트에서는 핵심 사주 근거를 밝혀주세요.
1) 사주 명식을 바탕으로 차분하고 포근하게, 살짝 흥미로운 톤으로 설명해 주세요.
2) 사주에서 특이하거나 눈에 띄는 점이 있으면 알려주세요.
3) 약점도 솔직하되 다정하게 말해 주세요.
4) 돋보이는 특징을 최소 한 가지 찾아 명확히, 귀엽게 짚어 주세요.
5) 마지막은 사용자가 가장 궁금한 점을 묻는 부드러운 질문으로 끝내주세요.
6) 판단 근거는 사용자가 제공한 모든 정보와 해석 가능한 모든 사주 정보를 종합해 제시해 주세요.
7) 긍정적 해석과 부정적 해석을 모두 고려해 주세요.
이외에도 특이한점 한가지를 찾아서 언급해 주세요.

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

해석 전에 먼저 사주 명식과 오행·십신 등 핵심 구성을 정리한 다음, 위 시스템 지시문의 규칙에 따라 한국어로만 답하세요.`
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
