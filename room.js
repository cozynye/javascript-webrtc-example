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
  console.log("ππππππππππππππππππππππ");
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

  console.log("ππππππππππππππππππππππ");
  socket.send(JSON.stringify(message));
};

myPeerConnection.addIceCandidate = (e) => {
  // if (myPeerConnection.candidate) {
  //   message.candidate = e.candidate.candidate;
  //   message.sdpMid = e.candidate.sdpMid;
  //   message.sdpMLineIndex = e.candidate.sdpMLineIndex;
  // }
  console.log("π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯");
  console.log(e);
  console.log("π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯π₯");
};
myPeerConnection.ontrack = (e) => {
  console.log("onTrack μμλλ€");
  // console.log(e)((remoteVideo.srcObject = e.streams[0]));
};

/**
 * @event λ²νΌ μ΄λ²€νΈ λ§λ€κΈ°
 */
const leaveRoomButton = document.getElementById("leaveRoomButton");
const subscribeButton = document.getElementById("subscribeButton");

window.onload = function () {
  let urlStr = window.location.href;
  getUserMedia();
  socket = new WebSocket(`wss://omnitalk.io:8080`);

  /** μμΌ μ°κ²° λμ λ */
  socket.addEventListener("open", () => {
    console.log("connected to Browse β");
  });
  /** μμΌ μ°κ²° ν΄μ  λμ λ */
  socket.addEventListener("close", () => {
    console.log("closed Server β");
  });
  socket.addEventListener("message", (message) => {
    const lbsMessage = JSON.parse(message.data);
    if (lbsMessage.result === "failed") {
      console.log("μ€ν¨νμ΅λλ€ β", lbsMessage);
      return;
    }

    if (
      lbsMessage.cmd === "WS_SESSION_RSP" &&
      lbsMessage.result === "success"
    ) {
      console.log(lbsMessage);
      session = lbsMessage.session;
      console.log("μΈμμ λ°μμμ΅λλ€. π₯", "μΈμμ", session);
    } else if (
      lbsMessage.cmd === "WS_JOIN_RSP" &&
      lbsMessage.result === "success"
    ) {
      console.log(lbsMessage);
      console.log("λ°© μ°Έμ¬ μμ²­μ μ±κ³΅νμ΅λλ€. πΌ");
    } else if (
      lbsMessage.cmd === "WS_PARTILIST_RSP" &&
      lbsMessage.result === "success"
    ) {
      console.log(lbsMessage);
      partlist = lbsMessage.partlist;
      console.log("λ°© μ°Έμ¬ λ¦¬μ€νΈ μμ²­μ λ°μμμ΅λλ€ π");
    }
    // μλΈμ€ν¬λΌμ΄λΈ μμ
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

      console.log("κ΅¬λνκΈ°λ₯Ό μλ£νμ΅λλ€ π²");
    } else if (
      lbsMessage.cmd === "WS_LEAVE_NOTI" &&
      lbsMessage.result === "success"
    ) {
      console.log(lbsMessage);
      console.log("λκ΅°κ°κ° λ°©μ λ λ¬μ΅λλ€ π₯");
    } else if (
      lbsMessage.cmd === "WS_LEAVE_RSP" &&
      lbsMessage.result === "success"
    ) {
      console.log(lbsMessage);
      window.location.href = "/index.html";

      console.log("λ°© λ λκΈ° μμ²­μ μ±κ³΅νμ΅λλ€ πΆ");
    } else if (lbsMessage.cmd === "WS_TRICKLE") {
      console.log(lbsMessage);
      console.log("Trickle π₯«");
    } else {
      console.log("λ€λ₯Έ μμ²­μλλ€ π₯");
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
 * @event λ°© μ°Έμ¬ μμ²­ μ΄λ²€νΈ
 */
function handlePartList() {
  console.log("λ°© μ°Έμ¬ λ¦¬μ€νΈ μμ²­μ νμ΅λλ€ π");
  const message = {
    cmd: "WS_PARTILIST_REQ",
    session: session,
    groom_id: groom_id,
  };
  socket.send(JSON.stringify(message));
}

function handleJoinRoom() {
  console.log("λ°© μ°Έμ¬ μμ²­ πΌ");
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
  console.log("μΈμμ μμ²­νμ΅λλ€. π₯");
  socket.send(
    JSON.stringify({
      cmd: "WS_SESSION_REQ",
      domain: "omnitalk.io",
      token: "1234-abcd-kqlk-1ab9",
      email: "test@omnistory.net",
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
  console.log("λ°© λ λκΈ° μμ²­μ νμ΅λλ€ πΆ");
  const message = {
    cmd: "WS_LEAVE_REQ",
    session: session,
    groom_id: groom_id,
  };
  socket.send(JSON.stringify(message));
};

subscribeButton.onclick = () => {
  console.log("κ΅¬λνκΈ° π²");
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
 * μ μ μ λ―Έλμ΄ μ λ³΄ κ°μ Έμ€κΈ°
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

/** @event λ―Έλμ΄ κ°μ Έμ€κΈ° μ±κ³΅μ νΈμΆ */
async function gotLocalMediaStream(stream) {
  console.log("Add local streamπ");
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
 * @event λ―Έλμ΄ μ΄κΈ°ν μλ¬
 */
function handleLocalMediaStreamError(error) {
  console.log("navigator.getUserMedia error: ", error);
}
