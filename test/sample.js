// Button DOM
const createSessionBtn = document.getElementById("createSessionBtn");
const createRoomBtn = document.getElementById("createRoomBtn");
const roomListBtn = document.getElementById("roomListBtn");
const publishBtn = document.getElementById("publishBtn");
const partlistBtn = document.getElementById("partlistBtn");
const subscribeBtn = document.getElementById("subscribeBtn");

// Input DOM
let sessionInput = document.getElementById("session");
let subject = document.getElementById("subject");
let password = document.getElementById("password");
let nickname = document.getElementById("name");

// Varibale
/**
 * @description 옴니톡 생성자 함수
 */
let omnitalk;
let partRoomId;
let roomList;
let sessionId;
let pubIdx;
let partlist;

/**
 * @description 세션 생성 함수
 * 1. 세션을 만들기전 웹소켓 연결을 진행한다.
 * 2. 웹 소켓 객체(wss)가 이미 존재한다면 그대로 반환
 * 3. 웹 소켓 객체가 존재하지 않는다면 웹 소켓 생성 후 이벤트 수신
 */
async function getSession() {
  sessionId = await omnitalk.createSession();
  console.log(sessionId);
  sessionInput.value = sessionId;
}

/**
 *@description 방 생성 함수
 */
async function makeRoom() {
  let opt = {
    subject: subject.value || "Untitled",
    secret: password.value,
    room_type: "videoroom",
    start_date: getUnixTimestamp(),
    end_date: getUnixTimestamp() + 60 * 60,
  };

  roomId = await omnitalk.createRoom(sessionId, opt);
}

/**
 * 룸 리스트 요청 함수
 */
async function getRoomList() {
  // sessionId - createSession()을 통해 만든 세션 아이디
  roomList = await omnitalk.roomList(sessionId);
  console.log("roomList");
  console.log(roomList);

  const roomNode = document.getElementById("roomList");
  roomList.map((item) => {
    console.log("roomItem");
    console.log(item);

    const room = document.createElement("div");
    const joinRoomBtn = document.createElement("button");
    const title = document.createElement("div");
    const content = document.createElement("div");

    title.setAttribute("class", "title");
    title.innerHTML = item.subject || "제목 없음";

    content.setAttribute("class", "content");

    joinRoomBtn.innerHTML = "참석";
    joinRoomBtn.setAttribute("class", "smallBtn");
    joinRoomBtn.onclick = function () {
      joinRoom(item.room_id);
    };

    room.setAttribute("class", "room");

    content.appendChild(joinRoomBtn);
    room.appendChild(title);
    room.appendChild(content);
    roomNode.appendChild(room);
  });
}

/**
 * @event 방 참여 요청 이벤트
 */
async function joinRoom(roomId) {
  partRoomId = roomId;
  console.log("pubIdx");
  console.log(pubIdx);
  let opt = {
    secret: undefined,
    user_id: undefined,
    user_name: nickname.value,
  };

  result = await omnitalk.joinRoom(sessionId, roomId, opt);
}

async function handleSubscribe(pubIdx) {
  await omnitalk.subscribe(pubIdx);
}

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

  publishBtn.onclick = async () => {
    let opt = {
      audio: true,
      video: true,
      recording: true,
    };

    pubIdx = await omnitalk.publish(opt);
  };

  partlistBtn.onclick = async () => {
    partlist = await omnitalk.partiList(partRoomId);
    console.log(partlist);

    const roomNode = document.getElementById("partiList");
    partlist.map((item) => {
      console.log("여기");
      console.log(item);
      const room = document.createElement("div");
      const joinButton = document.createElement("button");
      joinButton.innerHTML = "구독하기";
      room.setAttribute("class", "room");
      joinButton.setAttribute("class", "smallBtn");
      room.innerHTML = item.publish_idx || "제목 없음";
      joinButton.onclick = function () {
        handleSubscribe(item.publish_idx);
      };
      roomNode.appendChild(room);
      room.appendChild(joinButton);
    });
  };

  subscribeBtn.onclick = async () => {
    console.log("----------------------------subscribeBtn");
    console.log(pubIdx);
    console.log(partlist);
    await omnitalk.subscribe(pubIdx);
  };
};
