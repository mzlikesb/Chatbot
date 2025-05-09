const chatForm = document.getElementById('chat-form');
const imageInput = document.getElementById('image-input');
const imagePreview = document.getElementById('image-preview');
const chatDiv = document.getElementById('chat');

let imageBase64 = null;
let messages = [
  { role: "system", content: "너는 친절한 도우미야." }
];

// marked의 옵션에 highlight.js 연동
marked.setOptions({
  highlight: function(code, lang) {
    if (hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  }
});

// 이미지 미리보기 및 base64 변환
imageInput.addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      imageBase64 = e.target.result.split(',')[1]; // base64 부분만 추출
      imagePreview.innerHTML = `<img src="${e.target.result}" alt="미리보기" style="max-width:200px; max-height:200px; margin-top:8px;">`;
    };
    reader.readAsDataURL(file);
  } else {
    imageBase64 = null;
    imagePreview.innerHTML = '';
  }
});

chatForm.addEventListener('submit', async function(event) {
  event.preventDefault();
  const userInput = document.getElementById('input').value;
  chatDiv.innerHTML += `<div><b>나:</b> ${userInput}</div>`;
  if (imageBase64) {
    chatDiv.innerHTML += `<div><b>나(이미지):</b><br><img src="data:image/png;base64,${imageBase64}" style="max-width:200px; max-height:200px;"></div>`;
  }

  // 메시지 객체 만들기
  let userMessage;
  if (imageBase64) {
    userMessage = {
      role: "user",
      content: [
        { type: "text", text: userInput },
        { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }
      ]
    };
  } else {
    userMessage = { role: "user", content: userInput };
  }
  messages.push(userMessage);

  document.getElementById('input').value = "";
  imageInput.value = "";
  imagePreview.innerHTML = "";

  // 서버로 messages 전체를 전송
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages: messages
    })
  });
  const data = await response.json();
  const md = marked.parse(data.content);
  chatDiv.innerHTML += `<div><b>GPT-4o:</b> <div>${md}</div></div>`;

  // 코드블럭 하이라이트 적용!
  document.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block);
  });

  // assistant의 답변도 messages에 누적!
  messages.push({ role: "assistant", content: data.content });
});


const textarea = document.getElementById('input');

// textarea에서 Enter/Shift+Enter 제어
textarea.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    if (!e.shiftKey) {
      e.preventDefault(); // 기본 줄바꿈 방지
      chatForm.requestSubmit(); // 폼 전송(버튼 클릭과 동일)
    }
    // Shift+Enter는 기본 동작(줄바꿈) 그대로 둠
  }
});
