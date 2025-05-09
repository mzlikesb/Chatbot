import 'dotenv/config';
import express from 'express';

const app = express();
app.use(express.json({limit: '10mb'})); // 이미지 base64를 위해 크기 제한 늘림
app.use(express.static('.'));

app.post('/api/chat', async (req, res) => {
  const { messages, hasImage } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  // 메시지 포맷 결정
  let openaiMessages;
  if (hasImage) {
    // GPT-4o 멀티모달 메시지 포맷
    openaiMessages = messages.map(msg => {
      if (Array.isArray(msg.content)) {
        return {
          role: msg.role,
          content: msg.content
        };
      }
      return msg;
    });
  } else {
    openaiMessages = messages;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: openaiMessages
    })
  });
  const data = await response.json();
  res.json({ content: data.choices[0].message.content });
});

app.listen(3000, () => console.log("서버가 3000번 포트에서 실행 중"));
