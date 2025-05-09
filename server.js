import 'dotenv/config';
import express from 'express';
import { Buffer } from 'buffer';
import AdmZip from 'adm-zip';

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

// NovelAI 이미지 생성 엔드포인트
app.post('/api/generate-novelai-image', async (req, res) => {
  const { prompt } = req.body;
  const novelaiToken = process.env.NOVELAI_TOKEN; // .env에 저장 필요

  if (!novelaiToken) {
    return res.status(500).json({ error: "NovelAI 토큰이 설정되어 있지 않습니다." });
  }

  // NovelAI API 요청 본문
  const payload = {
    input: prompt,
    model: "nai-diffusion-4-5-curated", //"nai-diffusion-4-full",
    action: "generate",
    parameters: {
      params_version: 3,
      width: 256,
      height: 256,
      scale: 11,
      steps: 28,
      sampler: "k_euler_ancestral",
      cfg_rescale: 0,
      noise_schedule: "karras",
      characterPrompts: [],
      v4_prompt: {
          caption: {
              base_caption: prompt,
              char_captions: []
          },
      },
      v4_negative_prompt: {
          caption: {
              base_caption: "blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, logo, dated, signature, multiple views, gigantic breasts",
              char_captions: []
          }
      },
      negative_prompt: "blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, logo, dated, signature, multiple views, gigantic breasts",
      reference_image_multiple: [],
      reference_information_extracted_multiple: [],
      reference_strength_multiple: [],
      deliberate_euler_ancestral_bug: false,
      prefer_brownian: true
    }
  };

  try {
    const response = await fetch('https://image.novelai.net/ai/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${novelaiToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let err = {};
      try { err = await response.json(); } catch {}
      return res.status(500).json({ error: err.error || response.statusText });
    }    
    // zip 파일을 buffer로 받기
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // adm-zip으로 zip 파일에서 PNG 추출
    const zip = new AdmZip(buffer);
    const pngEntry = zip.getEntries().find(entry => entry.entryName.toLowerCase().endsWith('.png'));
    if (!pngEntry) {
      return res.status(500).json({ error: "PNG 파일을 찾을 수 없습니다." });
    }
    const pngBuffer = pngEntry.getData();
    const base64 = pngBuffer.toString('base64');
    res.json({ base64 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("서버가 3000번 포트에서 실행 중"));
