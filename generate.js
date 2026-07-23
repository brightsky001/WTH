export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { word, history } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' });
  }

  // AI 프롬프트 구성: 한국식 끝말잇기 규칙 엄격 적용
  const prompt = `
너는 한국어 끝말잇기 게임의 AI 대국자야.
아래 규칙을 엄격히 지켜서 단 하나만의 단어로 답해줘:

[끝말잇기 규칙]
1. 사용자가 제시한 단어("${word}")의 마지막 음절로 시작하는 표준 국어사전 등록 명사(2글자 이상)를 제시해.
2. 한국어 두음법칙을 허용해 (예: '리' -> '이', '라' -> '나', '녀' -> '여', '로' -> '노/오' 등).
3. 이미 사용된 단어 목록: [${history ? history.join(', ') : ''}] 에 있는 단어는 절대 재사용 금지.
4. 한 글자 단어나 방언, 외래어 표기법에 맞지 않는 단어는 금지.
5. 오직 단어 이름만 딱 출력해. 다른 인사말, 설명, 마크다운, 문장부호는 절대 포함하지 마.
6. 만약 더 이상 이을 단어가 없거나 패배했다고 판단되면 정확히 "GG" 라고만 답해.

상대방의 단어: "${word}"
너의 답:
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2, // 일관되고 정확한 단어 선택을 위해 낮은 온도 설정
          },
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Gemini API 호출 실패');
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return res.status(200).json({ reply: replyText });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || '서버 오류가 발생했습니다.' });
  }
}