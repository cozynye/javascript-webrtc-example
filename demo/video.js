// Button DOM
const createSessionBtn = document.getElementById("createSessionBtn");
const createRoomBtn = document.getElementById("createRoomBtn");
const roomListBtn = document.getElementById("roomListBtn");
const publishBtn = document.getElementById("publishBtn");
const partiListBtn = document.getElementById("partiListBtn");

// Input DOM
let sessionInput = document.getElementById("session");
let subject = document.getElementById("subject");
let password = document.getElementById("password");
let nickname = document.getElementById("name");

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
  console.log(sessionId);
  sessionInput.innerHTML = sessionId;
  sessionInput.setAttribute("disabled", true);
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
  console.log("roomList");
  console.log(roomList);

  const roomTbody = document.getElementById("roomTbody");
  if (roomTbody.hasChildNodes()) {
    console.log("자식을 가지고 있습니다");
    roomTbody.textContent = "";
  }

  roomList.map((item, index) => {
    const tr = document.createElement("tr");
    const td1 = document.createElement("td");
    const td2 = document.createElement("td");
    const td3 = document.createElement("td");
    const td4 = document.createElement("td");
    const td5 = document.createElement("td");
    const room = document.createElement("div");
    const roomName = document.createElement("div");
    const nickname = document.createElement("input");
    const password = document.createElement("input");
    const participant = document.createElement("div");
    const joinRoomBtn = document.createElement("button");
    const roomId = document.createElement("div");

    roomName.setAttribute("class", "title");
    roomName.innerHTML = item.subject || "제목 없음";

    participant.setAttribute("class", "content");
    td5.setAttribute("hidden", true);

    joinRoomBtn.innerHTML = "참석";
    joinRoomBtn.setAttribute("class", "smallBtn");
    joinRoomBtn.onclick = function () {
      joinRoom(item.room_id, item.subject, index);
    };

    roomId.innerHTML = item.room_id;

    room.setAttribute("class", "room");

    participant.appendChild(joinRoomBtn);

    td1.appendChild(roomName);
    td2.appendChild(nickname);
    td3.appendChild(password);
    td4.appendChild(participant);
    td5.appendChild(roomId);
    tr.appendChild(td1);
    tr.appendChild(td2);
    tr.appendChild(td3);
    tr.appendChild(td4);
    tr.appendChild(td5);
    roomTbody.appendChild(tr);
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
    // partRoomId = roomId;
    // let opt = {
    //   secret: undefined,
    //   user_id: undefined,
    //   user_name: nickname.value || randomNickname,
    // };

    // await omnitalk.joinRoom(sessionId, roomId, opt);

    const roomListTr = document.getElementById("roomListTr");
    const partilistTh = document.createElement("th");
    const partilistDiv = document.createElement("div");
    const partilistStrong = document.createElement("strong");

    const roomTbody = document.getElementById("roomTbody");
    let roomTbodyLength =
      document.getElementById("roomTbody").childElementCount;

    // 참석자 리스트 버튼 추가
    for (let i = 0; i < roomTbodyLength; i++) {
      const partilistTr = roomTbody.childNodes[i];
      const nameInput = partilistTr.childNodes[1].childNodes[0];
      const passwordInput = partilistTr.childNodes[2].childNodes[0];
      const joinBtn = partilistTr.childNodes[3].childNodes[0].childNodes[0];

      nameInput.setAttribute("disabled", true);
      passwordInput.setAttribute("disabled", true);
      joinBtn.setAttribute("disabled", true);
      if (i === index) {
        listClickedIndex = index;
        const partilistTd = document.createElement("td");
        const partilistDiv = document.createElement("div");
        const participantListBtn = document.createElement("button");
        const nameVal = partilistTr.childNodes[1].childNodes[0].value;
        const passwordVal = partilistTr.childNodes[2].childNodes[0].value;
        nickName = nameVal;
        password = passwordVal;

        participantListBtn.innerHTML = "리스트 보기";
        participantListBtn.setAttribute("class", "smallBtn");
        participantListBtn.onclick = function () {
          getPartiList(partilistTr.childNodes[4].childNodes[0].innerHTML);
        };

        partilistDiv.appendChild(participantListBtn);
        partilistTd.appendChild(partilistDiv);
        partilistTr.appendChild(partilistTd);
      }
    }

    console.log("nickName", nickName);
    console.log("password", password);
    let opt = {
      secret: password || undefined,
      user_id: undefined,
      user_name: nickname || randomNickname,
    };

    await omnitalk.joinRoom(sessionId, roomId, opt);

    subscribeTh.setAttribute("width", "150px");
    subscribeStrong.innerHTML = "5. 참석자 리스트";

    subscribeDiv.appendChild(subscribeStrong);
    subscribeTh.appendChild(subscribeDiv);
    roomListTr.appendChild(subscribeTh);
  } catch (error) {
    console.log(error);
  }
}

/**
 * @description 퍼블리쉬
 */
async function publish(roomId) {
  let opt = {
    audio: true,
    video: true,
    recording: true,
  };

  pubIdx = await omnitalk.publish(opt);
}

/**
 * @description 참여자 불러오기
 */
async function getPartiList(partRoomId) {
  console.log("listClickedIndex");
  console.log(listClickedIndex);
  partlist = await omnitalk.partiList(partRoomId);
  console.log("partlist");
  console.log(partlist);

  const roomNode = document.getElementById("partiItem");
  if (roomNode.hasChildNodes()) {
    console.log("자식을 가지고 있습니다");
    roomNode.textContent = "";
  }

  const subscribeTr = roomTbody.childNodes[listClickedIndex];
  console.log(subscribeTr);
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const theadTr = document.createElement("tr");
  const theadTh1 = document.createElement("th");
  const theadTh2 = document.createElement("th");
  const theadDiv1 = document.createElement("div");
  const theadDiv2 = document.createElement("div");

  theadDiv1.innerHTML = "닉네임";
  theadDiv2.innerHTML = "7. 구독하기";

  theadTh1.appendChild(theadDiv1);
  theadTh2.appendChild(theadDiv2);
  theadTr.appendChild(theadTh1);
  theadTr.appendChild(theadTh2);
  thead.appendChild(theadTr);
  table.appendChild(thead);
  partlist.map((item) => {
    console.log("partiItem");
    console.log(item);
    const room = document.createElement("div");
    const subscribeBtn = document.createElement("button");
    const title = document.createElement("div");
    const content = document.createElement("div");
    const name = document.createElement("div");
    title.setAttribute("class", "title");
    title.innerHTML = item.publish_idx || "제목 없음";
    name.innerHTML = item.user || "닉네임 없음";
    name.setAttribute("class", "content");
    content.setAttribute("class", "content");
    subscribeBtn.innerHTML = "구독";
    subscribeBtn.setAttribute("class", "smallBtn");
    subscribeBtn.onclick = function () {
      handleSubscribe(item.publish_idx);
    };
    room.setAttribute("class", "room");
    content.appendChild(subscribeBtn);
    room.appendChild(title);
    room.appendChild(name);
    room.appendChild(content);
    roomNode.appendChild(room);
  });
}

/**
 * @description 구독하기
 */
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
    publish();
  };

  partiListBtn.onclick = async () => {
    getPartiList();
  };
};
