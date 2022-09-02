const startButton = document.getElementById("startButton");
const hangupButton = document.getElementById("hangupButton");
hangupButton.disabled = true;

// 비디오 태그 정보 가져오기
// const localVideo = document.getElementById("localVideo");
// const remoteVideo = document.getElementById("remoteVideo");

// 비디오, 오디오 기기 설정하기
const audioInputSelect = document.querySelector("select#audioSource");
const audioOutputSelect = document.querySelector("select#audioOutput");
const videoSelect = document.querySelector("select#videoSource");

const selectors = [audioInputSelect, audioOutputSelect, videoSelect];

// let pc;
// let localStream;

// BroadcastChannel - 동일한 출처의 다른 창,탭,iframe 간에 통신할 수 있는 API
const signaling = new BroadcastChannel("webrtc");
signaling.onmessage = (e) => {
  if (!localStream) {
    console.log("not ready yet");
    return;
  }
  switch (e.data.type) {
    case "ready":
      if (pc) {
        console.log("already in call, ignoring");
        return;
      }
      makeCall();
      break;
    case "offer":
      handleOffer(e.data);
      break;
    case "answer":
      handleAnswer(e.data);
      break;
    case "candidate":
      handleCandidate(e.data);
      break;

    case "bye":
      if (pc) {
        hangup();
      }
      break;
    default:
      console.log("unhandled", e);
      break;
  }
};

startButton.onclick = async () => {
  //비디오 가져오기 / getUserMediadml 첫 번째 파라미터로 어느 미디어를 사용할 것인지 객체로 전달
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  });
  console.log("localStream");
  console.log(localStream);
  localVideo.srcObject = localStream;

  startButton.disabled = true;
  hangupButton.disabled = false;

  signaling.postMessage({ type: "ready" });
};

hangupButton.onclick = async () => {
  hangup();
  signaling.postMessage({ type: "bye" });
};

async function hangup() {
  console.log("hangup function");
  if (pc) {
    pc.close();
    pc = null;
  }
  localStream.getTracks().forEach((track) => track.stop());
  localStream = null;
  startButton.disabled = false;
  hangupButton.disabled = true;
}

// function createPeerConnection() {
//   console.log("2. createPeerConnection function");
//   pc = new RTCPeerConnection();
//   pc.onicecandidate = (e) => {
//     const message = {
//       type: "candidate",
//       candidate: null,
//     };
//     if (e.candidate) {
//       message.candidate = e.candidate.candidate;
//       message.sdpMid = e.candidate.sdpMid;
//       message.sdpMLineIndex = e.candidate.sdpMLineIndex;
//     }
//     signaling.postMessage(message);
//   };
//   pc.ontrack = (e) => (remoteVideo.srcObject = e.streams[0]);
//   localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
// }

async function makeCall() {
  console.log("1. makeCall function");
  await createPeerConnection();

  const offer = await pc.createOffer();
  signaling.postMessage({ type: "offer", sdp: offer.sdp });
  await pc.setLocalDescription(offer);
}

async function handleOffer(offer) {
  console.log("3. handleOffer function");
  if (pc) {
    console.error("existing peerconnection");
    return;
  }
  await createPeerConnection();
  await pc.setRemoteDescription(offer);

  const answer = await pc.createAnswer();
  signaling.postMessage({ type: "answer", sdp: answer.sdp });
  await pc.setLocalDescription(answer);
}

async function handleAnswer(answer) {
  console.log("4. handleAnswer function");
  console.log("전화 받는 사람!!");
  if (!pc) {
    console.error("no peerconnection");
    return;
  }
  await pc.setRemoteDescription(answer);
}

async function handleCandidate(candidate) {
  console.log("5. handleCandidate function");
  if (!pc) {
    console.error("no peerconnection");
    return;
  }
  if (!candidate.candidate) {
    await pc.addIceCandidate(null);
  } else {
    await pc.addIceCandidate(candidate);
  }
}

// 로컬에 비디오 붙이기
function gotStream(stream) {
  console.log("--------------gotStream function start----------------------");
  window.stream = stream; // make stream available to console
  localVideo.srcObject = stream;
  return navigator.mediaDevices.enumerateDevices();
  console.log("--------------gotStream function start----------------------");
}

function gotDevices(deviceInfos) {
  console.log("--------------gotDevices function start----------------------");
  // selectors  [select#audioSource, select#audioOutput, select#videoSource]
  // values 처음 로드 됐을 때 ['', '', ''] selector의 값을 바꾸면 values 값 변한다.
  const values = selectors.map((select) => select.value);
  console.log("selectors");
  console.log(selectors);
  selectors.forEach((select) => {
    console.log("select.firstChild");
    console.log(select.firstChild);
    while (select.firstChild) {
      // select.firstChild 처음 로드됐을때는 전부 null이다
      select.removeChild(select.firstChild);
    }
  });
  // device 종류에 따라 분류해 옵션에 넣어주기
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    const option = document.createElement("option");
    option.value = deviceInfo.deviceId;
    // device 종류에 따라 option에 값 넣기
    if (deviceInfo.kind === "audioinput") {
      option.text =
        deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
      audioInputSelect.appendChild(option);
    } else if (deviceInfo.kind === "audiooutput") {
      option.text =
        deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`;
      audioOutputSelect.appendChild(option);
    } else if (deviceInfo.kind === "videoinput") {
      option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    } else {
      console.log("Some other kind of source/device: ", deviceInfo);
    }
  }

  console.log("values");
  console.log(values);
  selectors.forEach((select, selectorIndex) => {
    console.log("select2");
    console.log(select);
    console.log("select.value");
    console.log(select.value);
    console.log(Array.prototype.slice.call(select.childNodes));
    // select.childNodes -> select의 option들
    // Array.prototype.slice.call(select.childNodes) -> NodeList(select.childNodes)를 Array로 바꿔준다
    // Array.prototype.slice.call(select.childNodes) -> Array.from(select.childNodes)으로 바꿔도 작동
    // some 함수는 배열의 요소 중 하나라도 callbackFunction에서 true를 리턴하면 true를 리턴 합니다.
    if (
      Array.prototype.slice
        .call(select.childNodes)
        .some((n) => n.value === values[selectorIndex])
    ) {
      select.value = values[selectorIndex];
    }
    console.log("select3");
    console.log(select);
  });
  console.log("---------------gotDevices function end---------------------");
}

// Attach audio output device to video element using device/sink ID.
function attachSinkId(element, sinkId) {
  if (typeof element.sinkId !== "undefined") {
    element
      .setSinkId(sinkId)
      .then(() => {
        console.log(`Success, audio output device attached: ${sinkId}`);
      })
      .catch((error) => {
        let errorMessage = error;
        if (error.name === "SecurityError") {
          errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`;
        }
        console.error(errorMessage);
        // Jump back to first output device in the list as it's the default.
        audioOutputSelect.selectedIndex = 0;
      });
  } else {
    console.warn("Browser does not support output device selection.");
  }
}

function changeAudioDestination() {
  const audioDestination = audioOutputSelect.value;
  attachSinkId(videoElement, audioDestination);
}

async function start() {
  console.log("--------------start function start----------------------");
  if (window.stream) {
    window.stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
  console.log("window.stream");
  console.log(window.stream);
  const audioSource = audioInputSelect.value;
  const videoSource = videoSelect.value;

  const constraints = {
    audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
    video: { deviceId: videoSource ? { exact: videoSource } : undefined },
  };
  console.log("constraints");
  console.log(constraints);
  // const devices = navigator.mediaDevices.getUserMedia(constraints).then(gotStream).then(gotDevices).catch(handleError);
  // navigator 객체는 브라우저 공급자 및 버전 정보 등을 포함한 브라우저에 대한 다양한 정보를 저장하는 객체
  // MediaDevices 인터페이스의 getUserMedia() 메서드는 사용자에게 미디어 입력 장치 사용 권한을 요청하며,
  // 사용자가 수락하면 요청한 미디어 종류의 트랙을 포함한 MediaStream (en-US)을 반환
  mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
  console.log("mediaStream");
  console.log(mediaStream);
  const devices = await gotStream(mediaStream);

  console.log("devices");
  console.log(devices);

  await gotDevices(devices);

  console.log("--------------start function end----------------------");
}

{
  audioInputSelect.onchange = start;
  audioOutputSelect.onchange = changeAudioDestination;

  videoSelect.onchange = start;
}

// start();

/**
 * 옴니스토리 테스트  시작
 */

let socket;
let session;
let roomId;
let groom_id;
let publish_idx;
let partlist;

let localVideo = document.getElementById("localVideo");
let remoteVideo = document.getElementById("remoteVideo");

let localStream;
let remoteStream;

let myPeerConnection;

/**
 * @event  기본 소켓 이벤트 걸어두기
 */
function omni() {
  socket = new WebSocket(`wss://omnitalk.io:8080`); // ws://omnitalk.io:8000/ws -> 직접 접속이라 하면 안됨
  // console.log("socket");
  // console.log(socket);

  /** 소켓 연결 됐을 때 */
  socket.addEventListener("open", () => {
    console.log("connected to Browse ✅");
  });

  /** 소켓 연결 해제 됐을 때 */
  socket.addEventListener("close", () => {
    console.log("closed Server ❌");
  });

  /** 서버에서 메시지 받을 때 메시지 종류에 따라 이벤트 분류 */
  socket.addEventListener("message", (message) => {
    console.log("message:", message);
    const lbsMessage = JSON.parse(message.data);
    if (lbsMessage.result === "failed") {
      console.log("실패했습니다", lbsMessage);
      return;
    }
    if (
      lbsMessage.cmd === "WS_SESSION_RSP" &&
      lbsMessage.result === "success"
    ) {
      console.log(lbsMessage);
      console.log("세션을 받아왔습니다. 🟥");
      session = lbsMessage.session;
    } else if (
      lbsMessage.cmd === "WS_CREATE_RSP" &&
      lbsMessage.result === "success"
    ) {
      console.log(lbsMessage);
      console.log("룸을 생성을 완료 했습니다. 🟧");
      groom_id = lbsMessage.groom_id;
    } else if (
      lbsMessage.cmd === "WS_JOIN_RSP" &&
      lbsMessage.result === "success"
    ) {
      console.log(lbsMessage);
      console.log("방에 참여를 완료 했습니다. 🟨");
    } else if (lbsMessage.cmd === "WS_PUBLISH_RSP") {
      console.log(lbsMessage);
      myPeerConnection.setRemoteDescription(
        new RTCSessionDescription(lbsMessage.jsep)
      );
      console.log("퍼블리셔가 방 공개를 성공 했습니다. 🧤");
    } else if (lbsMessage.cmd === "WS_PUBLISH_NOTI") {
      publish_idx = lbsMessage.publish_idx;
      console.log("🏎publish_idx를 받아왔습니다🏎");
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
      lbsMessage.cmd === "WS_LEAVE_RSP" &&
      lbsMessage.result === "success"
    ) {
      console.log(lbsMessage);
      window.location.href = "/index.html";

      console.log("방 떠나기 요청을 성공했습니다 🐶");
    } else if (lbsMessage.cmd === "WS_DESTROY_RSP") {
      console.log(lbsMessage);
      window.location.href = "/index.html";
      console.log("퍼블리셔가 방을 파괴 완료!!. 🚗");
    } else if (lbsMessage.cmd === "WS_TRICKLE") {
      console.log(lbsMessage);
      console.log("Trickle 🥫");
    } else {
      console.log("다른 요청 👎", message, lbsMessage);
    }
  });
}

// myPeerConnection.addEventListener("track", (e) => {
//   document.getElementById("remoteVideo").srcObject = new MediaStream([e.track]);
// });

/**
 * @event 버튼 이벤트 만들기
 */
const sessionRequest = document.getElementById("sessionRequest");
const createRoomRequest = document.getElementById("createRoomRequest");
const joinRoomRequest = document.getElementById("joinRoomRequest");
const publishRequest = document.getElementById("publishRequest");
const partListRequest = document.getElementById("partListRequest");
const subscribeRequest = document.getElementById("subscribeRequest");
const leaveRequest = document.getElementById("leaveRequest");
const destroyRequest = document.getElementById("destroyRequest");

/**
 * @event 세션 요청 이벤트
 */
sessionRequest.onclick = () => {
  console.log("세션 요청 🟥");
  const message = {
    cmd: "WS_SESSION_REQ",
    domain: "omnitalk.io",
    token: "1234-abcd-kqlk-1ab9",
    email: "test111@test.net",
    sdk: "0.9.1",
  };
  socket.send(JSON.stringify(message));
};

/**
 * @event 방만들기 요청 이벤트
 */
createRoomRequest.onclick = () => {
  console.log("룸 만들기 🟧");
  const startDate = Math.floor(new Date().getTime() / 1000 + 60);
  const endDate = Math.floor(new Date().getTime() / 1000 + 720);
  const message = {
    cmd: "WS_CREATE_REQ",
    session: session,
    title: "my room title is wow",
    secret: "",
    rtype: "videoroom",
    start_date: startDate,
    end_date: endDate,
    maxnum: 10,
  };
  socket.send(JSON.stringify(message));
};

/**
 * @event 퍼블리셔의 방 참여 이벤트
 */
joinRoomRequest.onclick = () => {
  console.log("퍼블리셔의 방 참여 🟨");
  const message = {
    cmd: "WS_JOIN_REQ",
    session: session,
    groom_id: groom_id,
    secret: "",
    user_name: "owen",
  };
  socket.send(JSON.stringify(message));
};

/**
 * @event 퍼블리셔의 방을 공개한다.
 */
publishRequest.onclick = async () => {
  console.log("퍼블리셔의 방 공개 🧤");

  /**
   * 유저의 미디어 정보 가져오기
   * */
  await navigator.mediaDevices
    .getUserMedia({
      audio: false,
      video: true,
    })
    .then(gotLocalMediaStream)
    .catch(handleLocalMediaStreamError);

  console.log("localStream", localStream);

  createPeerConnection();

  const offer = await myPeerConnection.createOffer();
  await myPeerConnection.setLocalDescription(offer);

  // console.log("offer", offer);
  // console.log("sdp", offer.sdp);

  const message = {
    cmd: "WS_PUBLISH_REQ",
    session: session,
    groom_id: groom_id,
    resolution: "960x720",
    jsep: offer,
    recording: false,
  };
  socket.send(JSON.stringify(message));
};

/**
 * @event 퍼블리셔의 참여자 목록 요청 이벤트
 */
partListRequest.onclick = () => {
  console.log("방 참여 리스트 요청을 했습니다 🌕");
  const message = {
    cmd: "WS_PARTILIST_REQ",
    session: session,
    groom_id: groom_id,
  };
  socket.send(JSON.stringify(message));
};

/**
 * @event 퍼블리셔의 구독 요청 이벤트
 */
subscribeRequest.onclick = () => {
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
 * @event 퍼블리셔의 방 떠나기 이벤트
 */
leaveRequest.onclick = () => {
  console.log("방 떠나기 요청을 했습니다 🐶");
  const message = {
    cmd: "WS_LEAVE_REQ",
    session: session,
    groom_id: groom_id,
  };
  socket.send(JSON.stringify(message));
};

/**
 * @event 퍼블리셔의 방 파괴 이벤트
 */
destroyRequest.onclick = () => {
  console.log("퍼블리셔가 방을 파괴 요청!!. 🚗");
  const message = {
    cmd: "WS_DESTROY_REQ",
    session: session,
    groom_id: groom_id,
    secret: "",
  };
  socket.send(JSON.stringify(message));
};

/**
 * @event 피어커넥션 함수
 */
function createPeerConnection() {
  myPeerConnection = new RTCPeerConnection();

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

  // myPeerConnection에 미디어 정보를 넣어주어야 오류가 안 생김
  localStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, localStream));
  console.log("myPeerConnection", myPeerConnection);
}

/** @event 미디어 가져오기 성공시 호출 */
async function gotLocalMediaStream(stream) {
  console.log("Add local stream😀");
  console.log((await navigator.mediaDevices.enumerateDevices())[3]);
  console.log("stream!!!", stream);
  console.log("video", stream.getVideoTracks());
  localStream = stream;
  localVideo.srcObject = localStream;

  // myPeerConnection.addStream(localStream);
}

/**
 * @param {*} error
 * @event 미디어 초기화 에러
 */
function handleLocalMediaStreamError(error) {
  console.log("navigator.getUserMedia error: ", error);
}

omni();
