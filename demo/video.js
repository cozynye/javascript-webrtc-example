// Button DOM
const createSessionBtn = document.getElementById("createSessionBtn");
const createRoomBtn = document.getElementById("createRoomBtn");
const roomListBtn = document.getElementById("roomListBtn");
const leaveRoomBtn = document.getElementById("leaveRoomBtn");

// 로그 박스 DOM
const logImageBox = document.getElementById("logImageBox");
const logBox = document.getElementById("logBox");
const closeLog = document.getElementById("closeLog");

let sessionDiv = document.getElementById("session");
let subject = document.getElementById("subject");
let password = document.getElementById("password");

// Varibale
//@description 옴니톡 생성자 함수
let omnitalk;
let partRoomId;
let roomList;
let sessionId;
let pubIdx;
let partlist;
let listClickedIndex;

/**
 * @description 세션 생성
 * 1. 세션을 만들기전 웹소켓 연결을 진행한다.
 * 2. 웹 소켓 객체(wss)가 이미 존재한다면 그대로 반환
 * 3. 웹 소켓 객체가 존재하지 않는다면 웹 소켓 생성 후 이벤트 수신
 */
async function getSession() {
  sessionId = await omnitalk.createSession();
  sessionDiv.innerHTML = sessionId;
  sessionDiv.setAttribute("disabled", true);
  createSessionBtn.setAttribute("disabled", true);
  createRoomBtn.removeAttribute("disabled");
  roomListBtn.removeAttribute("disabled");
}

/**
 *@description 방 생성
 */
async function makeRoom() {
  let opt = {
    subject: subject.value || (Math.random() * 1000).toFixed(),
    secret: password.value,
    room_type: "videoroom",
    start_date: getUnixTimestamp(),
    end_date: getUnixTimestamp() + 60 * 60,
  };

  roomId = await omnitalk.createRoom(sessionId, opt);
  subject.value = "";

  createRoomBtn.setAttribute("disabled", true);
  subject.setAttribute("disabled", true);
  password.setAttribute("disabled", true);
}

/**
 * @description 룸 리스트 요청
 */
async function getRoomList() {
  // sessionId - createSession()을 통해 만든 세션 아이디
  roomList = await omnitalk.roomList(sessionId);

  const roomListBody = document.getElementById("roomListBody");
  if (roomListBody.hasChildNodes()) {
    roomListBody.textContent = "";
  }

  roomList.map((item, index) => {
    const room = document.createElement("div");
    const roomName = document.createElement("div");
    const nicknameDiv = document.createElement("div");
    const passwordDiv = document.createElement("div");
    const nicknameInput = document.createElement("input");
    const passwordInput = document.createElement("input");
    const participant = document.createElement("div");
    const joinRoomBtn = document.createElement("button");
    const roomId = document.createElement("div");

    roomName.setAttribute("class", "roomListItem");
    nicknameDiv.setAttribute("class", "roomListItem");
    passwordDiv.setAttribute("class", "roomListItem");
    participant.setAttribute("class", "roomListItem");
    roomId.setAttribute("hidden", "true");

    roomName.innerHTML = item.subject || "제목 없음";
    joinRoomBtn.innerHTML = "참석";
    joinRoomBtn.setAttribute("class", "smallBtn");
    joinRoomBtn.onclick = function () {
      roomListBtn.setAttribute("disabled", true);
      joinRoom(item.room_id, item.subject, index);
    };

    roomId.innerHTML = item.room_id;

    room.setAttribute("class", "room");

    participant.appendChild(joinRoomBtn);

    nicknameDiv.appendChild(nicknameInput);
    passwordDiv.appendChild(passwordInput);
    room.appendChild(roomName);
    room.appendChild(nicknameDiv);
    room.appendChild(passwordDiv);
    room.appendChild(participant);
    room.appendChild(roomId);
    roomListBody.appendChild(room);
  });

  subject.setAttribute("disabled", true);
  password.setAttribute("disabled", true);
  createRoomBtn.setAttribute("disabled", true);
}

/**
 * @description 방 참여 요청
 */
async function joinRoom(roomId, roomNm, index) {
  try {
    const randomNickname = (Math.random() * 1000).toFixed();
    let nickName = "";
    let password = "";

    const roomListBody = document.getElementById("roomListBody");
    let roomListBodyLength =
      document.getElementById("roomListBody").childElementCount;

    // 참석자 리스트 버튼 추가
    for (let i = 0; i < roomListBodyLength; i++) {
      const roomListItem = roomListBody.childNodes[i];
      const nameInput = roomListItem.childNodes[1].childNodes[0];
      const passwordInput = roomListItem.childNodes[2].childNodes[0];
      const joinBtn = roomListItem.childNodes[3].childNodes[0];

      nameInput.setAttribute("disabled", true);
      passwordInput.setAttribute("disabled", true);
      joinBtn.setAttribute("disabled", true);

      // 클릭한 조인버튼 옆에 참석자 리스트 버튼 추가
      if (i === index) {
        listClickedIndex = index;
        nickName = nameInput.value;
        password = passwordInput.value;

        const partilistDiv = document.createElement("div");
        const participantListBtn = document.createElement("button");

        partilistDiv.setAttribute("class", "roomListItem");

        participantListBtn.innerHTML = "5. 참석자 리스트";
        participantListBtn.setAttribute("class", "smallBtn");
        participantListBtn.onclick = function () {
          getPartiList(roomId, nickName || randomNickname);
        };
        partilistDiv.appendChild(participantListBtn);
        roomListItem.appendChild(partilistDiv);
      }
    }

    let opt = {
      secret: password || undefined,
      user_id: undefined,
      user_name: nickName || randomNickname,
    };

    await omnitalk.joinRoom(sessionId, roomId, opt);
    leaveRoomBtn.removeAttribute("disabled");
  } catch (error) {
    console.log(error);
  }
}

/**
 * @description 퍼블리쉬
 */
async function publish() {
  let opt = {
    audio: true,
    video: true,
    recording: true,
  };

  await omnitalk.publish(opt);
}

/**
 * @description 참여자 불러오기
 */
async function getPartiList(roomId, nickName) {
  partlist = await omnitalk.partiList(roomId);

  if (document.getElementById("contentBox")) {
    document.getElementById("contentBox").remove();
  }

  const clickedRow =
    document.getElementById("roomListBody").childNodes[listClickedIndex];

  const contentBox = document.createElement("div");
  const partilistBox = document.createElement("div");
  const partilistHeader = document.createElement("div");

  const partilistHeaderDiv1 = document.createElement("div");
  const partilistHeaderDiv2 = document.createElement("div");

  contentBox.setAttribute("class", "contentBox");
  contentBox.setAttribute("id", "contentBox");
  partilistBox.setAttribute("class", "partilist");
  partilistHeader.setAttribute("class", "partilistheader");

  partilistHeaderDiv1.innerHTML = "닉네임";
  partilistHeaderDiv2.innerHTML = "6. 방송보기";

  partilistHeader.appendChild(partilistHeaderDiv1);
  partilistHeader.appendChild(partilistHeaderDiv2);
  partilistBox.appendChild(partilistHeader);

  if (partlist.length > 0) {
    partlist.forEach((item) => {
      const partilistItem = document.createElement("div");
      const nicknameDiv = document.createElement("div");
      const subscribeDiv = document.createElement("div");
      const subscribeBtn = document.createElement("button");

      nicknameDiv.innerHTML =
        item.user === nickName ? `${item.user} (본인)` : item.user;
      partilistItem.setAttribute("class", "parti");
      nicknameDiv.setAttribute("class", "partilistItem");
      subscribeDiv.setAttribute("class", "partilistItem");

      subscribeBtn.innerHTML = "방송 보기";
      subscribeBtn.setAttribute("class", "smallBtn");
      subscribeBtn.onclick = function () {
        handleSubscribe(item.publish_idx);
      };

      subscribeDiv.appendChild(subscribeBtn);

      partilistItem.appendChild(nicknameDiv);
      partilistItem.appendChild(subscribeDiv);

      partilistBox.appendChild(partilistItem);
    });
  }
  const publishDiv = document.createElement("div");
  const publishBtn = document.createElement("button");

  publishDiv.setAttribute("class", "partilistItem");
  publishBtn.setAttribute("class", "smallBtn");
  publishBtn.innerHTML = "방송하기";
  publishBtn.onclick = function () {
    publish();
    publishBtn.innerHTML = "방송중입니다";
    publishBtn.setAttribute("disabled", true);
  };

  // 로컬 미디어 스트림 일 시 버튼 disabled 설정
  // if (!document.getElementById("Omnitalk-Video-0").paused) {
  //   publishBtn.innerHTML = "방송중입니다";
  //   publishBtn.setAttribute("disabled", true);
  // }

  publishDiv.appendChild(publishBtn);
  contentBox.appendChild(partilistBox);
  contentBox.appendChild(publishDiv);
  clickedRow.after(contentBox);
}

/**
 * @description 구독하기
 */
async function handleSubscribe(pubIdx) {
  await omnitalk.subscribe(pubIdx);
}

/**
 * @description 방 떠나기
 */
async function leaveRoom() {
  createSessionBtn.removeAttribute("disabled");
  roomListBtn.removeAttribute("disabled");
  await omnitalk.leave(sessionId);
}

const logOpen = () => {
  logBox.style.display = "block";
  logImageBox.style.display = "none";
};

const logClose = () => {
  logImageBox.style.display = "block";
  logBox.style.display = "none";
};

window.onload = function () {
  // serviceId - 옴니톡에서 발급 받은 서비스 아이디 / 객체를 생성하면서 roomId, sessionId를 초기화
  omnitalk = new Omnitalk("AMNL-VPMG-VVD1-ZCGS");

  createSessionBtn.onclick = () => {
    getSession();
  };

  createRoomBtn.onclick = async () => {
    makeRoom();
  };

  roomListBtn.onclick = async () => {
    getRoomList();
  };

  leaveRoomBtn.onclick = async () => {
    leaveRoom();
  };

  logImageBox.onclick = () => {
    logOpen();
  };
  closeLog.onclick = () => {
    logClose();
  };

  publishBtn.onclick = async () => {
    publish();
  };
};
