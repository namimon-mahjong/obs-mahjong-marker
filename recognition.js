// --- 音声認識 (Web Speech API) 関連 ---
let recognition = null;
let isRecognizing = false;

// ブラウザがWeb Speech APIに対応しているかチェック
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true; // 継続的に認識
  recognition.lang = "ja-JP"; // 日本語に設定
  recognition.interimResults = true; // 途中結果も取得

  recognition.onresult = (event) => {
    let finalTranscript = "";
    let interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    finalTranscript = finalTranscript.trim().replace(" ", ""); // 前後の空白を削除

    // 確定したテキストでキーワードチェック
    if (finalTranscript) {
      recognizeResult.textContent = `認識結果：${finalTranscript}`; // 認識結果を表示
      checkKeywords(finalTranscript);
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech Recognition Error:", event.error);
    transcriptEl.textContent = `エラー: ${event.error}`;
  };

  recognition.onstart = () => {
    recognizeResult.textContent = `認識中・・・`; // 認識結果を表示
  };

  recognition.onend = () => {
    if (isRecognizing) {
      console.log("Restarting recognition...");
      try {
        recognition.start();
      } catch (e) {
        console.error("Error restarting recognition:", e);
      }
    } else {
      if (startButton) startButton.disabled = false;
      if (stopButton) stopButton.disabled = true;
    }
  };
} else {
  console.error("Web Speech API is not supported in this browser.");
  alert("お使いのブラウザはWeb Speech API(音声認識)に対応していません。");
  if (startButton) startButton.disabled = true;
  if (stopButton) stopButton.disabled = true;
}

function startRecognition() {
  if (recognition && !isRecognizing) {
    console.log(obsSocket);
    if (!obsSocket || obsSocket.socket.readyState !== WebSocket.OPEN) {
      console.error("OBS WebSocket is not connected.");
    }

    try {
      recognition.start();
      isRecognizing = true;
      if (startButton) startButton.disabled = true;
      if (stopButton) stopButton.disabled = false;
    } catch (e) {
      console.error("Error starting recognition:", e);
      alert(`音声認識を開始できませんでした: ${e.message}`);
    }
  }
}

function stopRecognition() {
  if (recognition && isRecognizing) {
    console.log("Stopping speech recognition...");
    recognizeResult.textContent = ``;
    recognition.stop();
    isRecognizing = false;

    if (startButton) startButton.disabled = false;
    if (stopButton) stopButton.disabled = true;
  }
}

function checkKeywords(text) {
  for (const chair in wordList) {
    for (const key of wordList[chair]) {
      if (text.includes(key)) {
        console.log(`Keyword found: "${key}"`);
        setSourceVisibility(`${chair}`, true); // 画像を表示
        break; // 一致するキーワードが見つかったらループを抜ける
      }
    }
  }
}
