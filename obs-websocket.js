// --- 設定 ---

let port = "";
let address = "localhost"; // OBS WebSocketサーバーのアドレス
let password = ""; // OBSで設定したパスワード (なければ空文字'')
const directoryName = "frame"; // 画像を保存するディレクトリ名
const IMAGE_DISPLAY_DURATION_MS = 3000; // 画像を表示しておく時間 (ミリ秒)

// --- グローバル変数 ---
let obsSocket = null;
let obsConnected = false;
let obsRequestId = 0;
let obsAuthDetails = null; // 認証用情報 (salt, challenge)
let imageHideTimer = null; // 画像を非表示にするためのタイマー

let frameList = {}; // frameフォルダにあるアイテムのリスト

async function connectOBS() {
  if (!OBSWebSocket) {
    console.error("NO OBSWebSocket found");
    return;
  }

  saveOBSSettings(); // フォームに入力されている設定を保存

  updateOBSStatus("接続中...", "disconnected");

  obsSocket = new OBSWebSocket();

  try {
    const obsWebSocketUrl = `ws://${address}:${port}`; // OBS WebSocketサーバーのアドレスとポート
    console.log("Connecting to OBS WebSocket:", obsWebSocketUrl);
    const { obsWebSocketVersion, negotiatedRpcVersion } =
      await obsSocket.connect(obsWebSocketUrl, password, {
        rpcVersion: 1, // obs-websocket v5用
      });
    updateOBSStatus("接続済み", "connected");
    obsConnected = true;

    frameList = await obsSocket.call("GetGroupSceneItemList", {
      sceneName: directoryName,
    });

    if (frameList.sceneItems.length === 0) {
      console.warn(`No items found in scene "${directoryName}".`);
      updateOBSStatus(
        "frameフォルダ内にファイルが見つかりません。使い方ガイドを確認してください",
        "disconnected"
      );
      obsConnected = false;
      obsSocket.disconnect();
      return;
    }

    console.log("Frame List:", frameList);
    console.info(`Connected to server ${obsWebSocketVersion} `);
  } catch (error) {
    console.error("OBS WebSocket connection error:", error);
    console.error(error);

    updateOBSStatus("接続失敗。使い方ガイドを確認してください", "disconnected");
    return;
  }
}

function getSceneItemIdByName(name) {
  const item = frameList.sceneItems.find((item) => item.sourceName === name);
  if (item) {
    return item.sceneItemId;
  } else {
    console.warn(`Item with name "${name}" not found in frameList.`);
    updateOBSStatus(
      `${name}という名前の画像ファイルが見つかりません`,
      "disconnected"
    );

    return null;
  }
}

function updateOBSStatus(text, cssClass) {
  if (obsStatusEl) {
    obsStatusEl.textContent = text;
    obsStatusEl.className = cssClass;
  }
  if (connectButton) {
    connectButton.disabled =
      cssClass === "connected" || cssClass === "接続中...";
  }
}

// --- 画像ソースの表示/非表示制御 (obs.callを使用) ---
async function setSourceVisibility(sourceName, visible) {
  if (!obsConnected) {
    console.warn("Cannot change source visibility, not connected to OBS.");
    return;
  }
  console.log(`${visible ? "Showing" : "Hiding"} source: ${sourceName}`);

  try {
    console.log("itemid", getSceneItemIdByName(sourceName));
    const sceneItemId = getSceneItemIdByName(sourceName);

    const response = await obsSocket.call("SetSceneItemEnabled", {
      sceneItemId,
      sceneItemEnabled: visible,
      sceneName: directoryName,
    });
    setTimeout(async () => {
      await obsSocket.call("SetSceneItemEnabled", {
        sceneItemId,
        sceneItemEnabled: false,
        sceneName: directoryName,
      });
    }, IMAGE_DISPLAY_DURATION_MS);

    console.debug("SetSceneItemEnabled response:", response); // 成功時は空のオブジェクトが返るはず
  } catch (error) {
    console.error(`Failed to set source visibility for ${sourceName}:`, error);
  }
}

loadOBSSettings();

function loadOBSSettings() {
  try {
    port = localStorage.getItem("obsWebSocketPort") || "4455";
    password = localStorage.getItem("obsWebSocketPassword") || "";

    // 入力フォームに値を設定 (フォームがあれば)
    const ipInput = document.getElementById("address");
    const portInput = document.getElementById("port");
    const passwordInput = document.getElementById("password");
    if (ipInput) ipInput.value = address;
    if (portInput) portInput.value = port;
    if (passwordInput) passwordInput.value = password;
  } catch (e) {
    console.error("Failed to load settings from localStorage:", e);
  }
}

function saveOBSSettings() {
  port = document.getElementById("port").value.trim() || "4455"; // 空なら4455
  password = document.getElementById("password").value; // パスワードは空を許容

  try {
    localStorage.setItem("obsWebSocketPort", port);
    localStorage.setItem("obsWebSocketPassword", password);
    console.log("OBS WebSocket settings saved to localStorage.");
  } catch (e) {
    console.error("Failed to save settings to localStorage:", e);
    alert(
      "設定の保存に失敗しました。localStorageが利用できない可能性があります。"
    );
  }
}
