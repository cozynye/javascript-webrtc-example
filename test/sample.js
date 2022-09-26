// 버튼 객체
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const publishBtn = document.getElementById("publishBtn");
const listBtn = document.getElementById("listBtn");

// 인풋 객체
let subject = document.getElementById("subject");
let password = document.getElementById("password");

let omnitalk;
let list;

/**
 * 룸 리스트 요청 함수
 */
async function getRoomList() {
  /**
   * 옴니톡 객체 생성
   *@param {string} serviceId - 옴니톡에서 발급 받은 서비스 아이디
   * 객체를 생성하면서 roomId, sessionId를 초기화
   */
  omnitalk = new Omnitalk("AMNL-VPMG-VVD1-ZCGS");

  /**
   * 웹 소켓 객체(wss)가 이미 존재한다면 그대로 반환
   * 웹 소켓 객체가 존재하지 않는다면 웹 소켓 생성 후 이벤트 수신
   */
  sessionId = await omnitalk.createSession();
  console.log("sessionId", sessionId);

  /**
   * 방 리스트 요청
   *@param {string} sessionId - createSession()을 통해 만든 세션 아이디
   *@
   */
  list = await omnitalk.roomList(sessionId);

  console.log("list");
  console.log(list);
}

window.onload = function () {
  getRoomList();

  createRoomBtn.onclick = async () => {
    console.log(subject.value);
    console.log(password.value);
    let opt = {
      subject: subject.value,
      secret: password.value,
      room_type: "videoroom",
      start_date: getUnixTimestamp(),
      end_date: getUnixTimestamp() + 60 * 60,
    };

    roomId = await omnitalk.createRoom(sessionId, opt);
  };

  createRoomBtn.onclick = async () => {
    console.log(subject.value);
    console.log(password.value);
    let opt = {
      subject: subject.value,
      secret: password.value,
      room_type: "videoroom",
      start_date: getUnixTimestamp(),
      end_date: getUnixTimestamp() + 60 * 60,
    };

    roomId = await omnitalk.createRoom(sessionId, opt);
  };
};

//getRoomList();
