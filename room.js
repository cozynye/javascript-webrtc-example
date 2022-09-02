let session;
let partlist;

let localVideo = document.getElementById("localVideo");
let remoteVideo = document.getElementById("remoteVideo");

let localStream;
let remoteStream;

let myPeerConnection = new RTCPeerConnection();

console.log("myPeerConnection");
console.log(myPeerConnection);

myPeerConnection.onicecandidate = (e) => {
  console.log("🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅");
  console.log(e);
  console.log("myPeerConnection.iceGatheringState");
  console.log(myPeerConnection.iceGatheringState);
  let message;
  if (e.candidate) {
    message = {
      cmd: "WS_TRICKLE",
      session: session,
      groom_id: groom_id,
      candidate: e.candidate.candidate,
    };
  } else {
    message = {
      cmd: "WS_TRICKLE",
      session: session,
      groom_id: groom_id,
      candidate: "completed:true",
    };
  }

  console.log("🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅🍅");
  socket.send(JSON.stringify(message));
};

myPeerConnection.addIceCandidate = (e) => {
  // if (myPeerConnection.candidate) {
  //   message.candidate = e.candidate.candidate;
  //   message.sdpMid = e.candidate.sdpMid;
  //   message.sdpMLineIndex = e.candidate.sdpMLineIndex;
  // }
  console.log("🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝");
  console.log(e);
  console.log("🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝🥝");
};
myPeerConnection.ontrack = (e) => {
  console.log("onTrack 안입니다");
  // console.log(e)((remoteVideo.srcObject = e.streams[0]));
};

/**
 * @event 버튼 이벤트 만들기
 */
const leaveRoomButton = document.getElementById("leaveRoomButton");
const subscribeButton = document.getElementById("subscribeButton");

window.onload = function () {
  let urlStr = window.location.href;
  getUserMedia();
  socket = new WebSocket(`wss://omnitalk.io:8080`);

  /** 소켓 연결 됐을 때 */
  socket.addEventListener("open", () => {
    console.log("connected to Browse ✅");
  });
  /** 소켓 연결 해제 됐을 때 */
  socket.addEventListener("close", () => {
    console.log("closed Server ❌");
  });
  socket.addEventListener("message", (message) => {
    const lbsMessage = JSON.parse(message.data);
    if (lbsMessage.result === "failed") {
      console.log("실패했습니다 ❌", lbsMessage);
      return;
    }

    if (
      lbsMessage.cmd === "WS_SESSION_RSP" &&
      lbsMessage.result === "success"
    ) {
      console.log(lbsMessage);
      session = lbsMessage.session;
      console.log("세션을 받아왔습니다. 🟥", "세션은", session);
    } else if (
      lbsMessage.cmd === "WS_JOIN_RSP" &&
      lbsMessage.result === "success"
    ) {
      console.log(lbsMessage);
      console.log("방 참여 요청을 성공했습니다. 🌼");
    } else if (
      lbsMessage.cmd === "WS_PARTILIST_RSP" &&
      lbsMessage.result === "success"
    ) {
      console.log(lbsMessage);
      partlist = lbsMessage.partlist;
      console.log("방 참여 리스트 요청을 받아왔습니다 🌕");
    }
    // 서브스크라이브 시작
    else if (
      lbsMessage.cmd === "WS_SUBSCRIBE_RSP" &&
      lbsMessage.result === "success"
    ) {
      console.log(lbsMessage);
      session = lbsMessage.new_session;

      myPeerConnection.setRemoteDescription(
        new RTCSessionDescription(lbsMessage.jsep)
      );

      handleCreateAnswer();

      console.log("구독하기를 완료했습니다 🐲");
    } else if (
      lbsMessage.cmd === "WS_LEAVE_NOTI" &&
      lbsMessage.result === "success"
    ) {
      console.log(lbsMessage);
      console.log("누군가가 방을 떠났습니다 🥊");
    } else if (
      lbsMessage.cmd === "WS_LEAVE_RSP" &&
      lbsMessage.result === "success"
    ) {
      console.log(lbsMessage);
      window.location.href = "/index.html";

      console.log("방 떠나기 요청을 성공했습니다 🐶");
    } else if (lbsMessage.cmd === "WS_TRICKLE") {
      console.log(lbsMessage);
      console.log("Trickle 🥫");
    } else {
      console.log("다른 요청입니다 🔥");
    }
  });

  myPeerConnection.ontrack = (event) => {
    console.log(myPeerConnection);
    console.log(myPeerConnection.remoteDescription);
    console.log("---------------------------------");
    console.log("event");
    console.log(event);
    console.log("mediaStream!!!!!");
    console.log(event.streams);
    remoteVideo.srcObject = event.streams[0];
  };
};
const urlStr = window.location.href;
const url = new URL(urlStr);
const urlParams = url.searchParams;
const groom_id = urlParams.get("groom_id");

console.log("groom_id", groom_id);

/**
 * @event 방 참여 요청 이벤트
 */
function handlePartList() {
  console.log("방 참여 리스트 요청을 했습니다 🌕");
  const message = {
    cmd: "WS_PARTILIST_REQ",
    session: session,
    groom_id: groom_id,
  };
  socket.send(JSON.stringify(message));
}

function handleJoinRoom() {
  console.log("방 참여 요청 🌼");
  const message = {
    cmd: "WS_JOIN_REQ",
    session: session,
    groom_id: groom_id,
    user_name: "Tom",
    secret: "",
  };
  socket.send(JSON.stringify(message));
}

setTimeout(() => {
  console.log("세션을 요청했습니다. 🟥");
  socket.send(
    JSON.stringify({
      cmd: "WS_SESSION_REQ",
      domain: "omnitalk.io",
      token: "1234-abcd-kqlk-1ab9",
      email: "jason@omnistory.net",
      sdk: "0.9.1",
    })
  );
}, 300);

setTimeout(() => {
  handleJoinRoom();
}, 600);

setTimeout(() => {
  handlePartList();
}, 1200);

leaveRoomButton.onclick = () => {
  console.log("방 떠나기 요청을 했습니다 🐶");
  const message = {
    cmd: "WS_LEAVE_REQ",
    session: session,
    groom_id: groom_id,
  };
  socket.send(JSON.stringify(message));
};

subscribeButton.onclick = () => {
  console.log("구독하기 🐲");
  console.log(partlist);
  const message = {
    cmd: "WS_SUBSCRIBE_REQ",
    session: session,
    groom_id: groom_id,
    publish_idx: partlist[0].publish_id,
  };
  socket.send(JSON.stringify(message));
};

/**
 * createAnswer
 */
async function handleCreateAnswer() {
  const answer = await myPeerConnection.createAnswer();
  await myPeerConnection.setLocalDescription(answer);

  console.log(answer);
  console.log("answer");

  const message = {
    cmd: "WS_SUBSCRIBE_COMP",
    session: session,
    groom_id: groom_id,
    jsep: answer,
  };
  socket.send(JSON.stringify(message));
}

/**
 * 유저의 미디어 정보 가져오기
 * */
async function getUserMedia() {
  console.log("dd");
  await navigator.mediaDevices
    .getUserMedia({
      audio: false,
      video: true,
    })
    .then(gotLocalMediaStream)
    .catch(handleLocalMediaStreamError);
}

/** @event 미디어 가져오기 성공시 호출 */
async function gotLocalMediaStream(stream) {
  console.log("Add local stream😀");
  console.log(stream);
  console.log(typeof stream);
  console.log((await navigator.mediaDevices.enumerateDevices())[3]);
  console.log(stream);
  localStream = stream;
  localVideo.srcObject = localStream;

  myPeerConnection.addStream(localStream);
}

/**
 * @param {*} error
 * @event 미디어 초기화 에러
 */
function handleLocalMediaStreamError(error) {
  console.log("navigator.getUserMedia error: ", error);
}
