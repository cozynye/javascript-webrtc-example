const SDKVER = "0.1.1";
const MAX_USER_CNT = 32;

let call = new Object();
let proc = new Object();

let audioPeerConnection;
let dataPeerConnection;
let dataChann;

let serviceID = 0;
let wss;

function Omnitalk(service) {
  this.serviceID = service;
  this.roomId = undefined;
  this.sessionid = undefined;

  initCallTbl();

  this.connect = function connect() {
    if (wss) return;
    return new Promise(function (resolve, reject) {
      wss = new WebSocket("wss://omnitalk.io:8080");
      wss.onopen = () => {
        console.log("Connect!");
        resolve();
      };
      wss.onerror = () => console.log("Not connect!");
      wss.onclose = () => console.log("Diconnect!");
      wss.onmessage = (msg) => {
        console.log(msg.data);
        TCALL(msg.data);
      };
    });
  };

  this.createSession = async function createSession() {
    await this.connect();
    return new Promise(function (resolve, reject) {
      let reqmsg = new Object();
      reqmsg.cmd = "WS_SESSION_REQ";
      reqmsg.service_id = service;
      reqmsg.sdk = SDKVER;
      OCALL(reqmsg);
      proc[0] = resolve;
    });
  };

  this.createRoom = async function createRoom(
    sessionId,
    opt = {
      subject: "",
      secret: undefined,
      room_type: "videoroom",
      start_date: getUnixTimestamp(),
      end_date: getUnixTimestamp() + 60 * 60,
    }
  ) {
    this.sessionId = sessionId;
    return new Promise(function (resolve, reject) {
      let reqmsg = new Object();
      reqmsg.cmd = "WS_CREATE_REQ";
      reqmsg.session = sessionId;
      reqmsg.subject = opt.subject;
      reqmsg.secret = opt.secret;
      reqmsg.start_date = opt.start_date;
      reqmsg.end_date = opt.end_date;
      reqmsg.room_type = opt.room_type;
      OCALL(reqmsg);
      proc[sessionId] = resolve;
    });
  };

  this.joinRoom = async function joinRoom(
    sessionId,
    roomId,
    opt = { secret: undefined, user_id: undefined, user_name: undefined }
  ) {
    //nickName=undefined, secret=undefined) {
    //let sessionId = this.sessionId;
    this.sessionId = sessionId;
    this.roomId = roomId;
    return new Promise(function (resolve, reject) {
      let reqmsg = new Object();
      reqmsg.cmd = "WS_JOIN_REQ";
      reqmsg.session = sessionId;
      reqmsg.room_id = roomId;
      reqmsg.user_id = opt.user_id;
      reqmsg.secret = opt.secret;
      reqmsg.user_name = opt.user_name;
      OCALL(reqmsg);
      proc[sessionId] = resolve;
    });
  };

  this.roomList = async function roomList(sessionId) {
    this.sessionId = sessionId;
    console.log("call");
    console.log(call);
    console.log("roomList�쒖옉");
    console.log(`sessionId ${sessionId}`);
    return new Promise(function (resolve, reject) {
      let reqmsg = new Object();
      reqmsg.cmd = "WS_ROOMLIST_REQ";
      reqmsg.session = sessionId;
      OCALL(reqmsg);
      proc[sessionId] = resolve;
    });
  };

  this.partiList = async function partiList(roomId) {
    let sessionId = this.sessionId;
    this.roomId = roomId;
    return new Promise(function (resolve, reject) {
      let reqmsg = new Object();
      reqmsg.cmd = "WS_PARTILIST_REQ";
      reqmsg.session = sessionId;
      reqmsg.room_id = roomId;
      OCALL(reqmsg);
      proc[sessionId] = resolve;
    });
  };

  this.publish = async function publish(
    opt = { video: true, audio: true, recording: false }
  ) {
    let sessionId = this.sessionId;
    let roomId = this.roomId;
    let audioOffer, videoOffer;
    let sessionCall = getCallTbl(sessionId);

    // Peerconnection
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    // Audio Peerconnection
    if (audioPeerConnection == undefined) {
      if (sessionCall != undefined) {
        audioPeerConnection = new RTCPeerConnection(configuration);
        sessionCall["audioStream"] = await this.makeAudio();
        sessionCall["publish"] = true;
        audioPeerConnection.addTrack(
          sessionCall["audioStream"].getTracks()[0],
          sessionCall["audioStream"]
        );
        audioPeerConnection.ontrack = (e) => {
          const localAudioElement = document.querySelector(
            "audio#Omnitalk-Audio-0"
          );
          localAudioElement.srcObject = e.streams[0];
        };

        audioOffer = await audioPeerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });
        await audioPeerConnection.setLocalDescription(audioOffer);
      } else {
        console.log("Can't search session, ");
        return;
      }
    }

    // Video Peerconnection
    const videoPeerConnection = new RTCPeerConnection(configuration);
    sessionCall["videoPC"] = videoPeerConnection;
    sessionCall["localVideoStream"] = await this.makeVideo();
    videoPeerConnection.addTrack(
      sessionCall["localVideoStream"].getTracks()[0],
      sessionCall["localVideoStream"]
    );
    videoPeerConnection.onicecandidate = (e) => {
      const message = {
        type: "candidate",
      };
      if (e.candidate) {
        message.candidate = e.candidate.candidate;
        message.sdpMid = e.candidate.sdpMid;
        message.sdpMLineIndex = e.candidate.sdpMLineIndex;
      } else {
        message.completed = true;
      }

      let reqmsg = {
        cmd: "WS_TRICKLE",
        session: sessionId,
        room_id: roomId,
        track_type: 1,
        candidate: message,
      };
      OCALL(reqmsg);
    };
    videoOffer = await videoPeerConnection.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: true,
    });
    await videoPeerConnection.setLocalDescription(videoOffer);

    return new Promise(function (resolve, reject) {
      let reqmsg = new Object();
      reqmsg.cmd = "WS_PUBLISH_REQ";
      reqmsg.session = sessionId;
      reqmsg.room_id = roomId;
      reqmsg.resolution = "720x480";
      reqmsg.recording = opt.recording;
      //reqmsg.jsep = offer;
      reqmsg.audio_jsep = audioOffer;
      reqmsg.video_jsep = videoOffer;
      OCALL(reqmsg);
      proc[sessionId] = resolve;
    });
  };

  this.subscribe = async function subscribe(publishIdx) {
    let sessionId = this.sessionId;
    let roomId = this.roomId;
    let sessionCall = getCallTbl(sessionId);

    console.log(sessionId);
    console.log(roomId);
    console.log(sessionCall);
    // Peerconnection
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    // Audio Peerconnection
    if (audioPeerConnection == undefined) {
      audioPeerConnection = new RTCPeerConnection(configuration);
      sessionCall["audioStream"] = await this.makeAudio();
      audioPeerConnection.addTrack(
        sessionCall["audioStream"].getTracks()[0],
        sessionCall["audioStream"]
      );
      audioPeerConnection.ontrack = (e) => {
        const localAudioElement = document.querySelector(
          "audio#Omnitalk-Audio-0"
        );
        localAudioElement.srcObject = e.streams[0];
      };

      audioPeerConnection.onicecandidate = (e) => {
        const message = {
          type: "candidate",
        };
        if (e.candidate) {
          message.candidate = e.candidate.candidate;
          message.sdpMid = e.candidate.sdpMid;
          message.sdpMLineIndex = e.candidate.sdpMLineIndex;
        } else {
          message.completed = true;
        }

        let reqmsg = {
          cmd: "WS_TRICKLE",
          session: sessionId,
          room_id: roomId,
          track_type: 0,
          candidate: message,
        };
        OCALL(reqmsg);
      };
    }

    return new Promise(function (resolve, reject) {
      let reqmsg = new Object();
      reqmsg.cmd = "WS_SUBSCRIBE_REQ";
      reqmsg.session = sessionId;
      reqmsg.room_id = roomId;
      reqmsg.publish_idx = publishIdx;
      reqmsg.resolution = "720x480";
      OCALL(reqmsg);
      proc[sessionId] = resolve;
    });
  };

  this.dataChannel = async function dataChannel() {
    let sessionId = this.sessionId;
    let roomId = this.roomId;

    // Peerconnection
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    // Audio Peerconnection
    if (dataPeerConnection == undefined) {
      dataPeerConnection = new RTCPeerConnection(configuration);

      dataPeerConnection.onicecandidate = (e) => {
        const message = {
          type: "candidate",
        };
        if (e.candidate) {
          message.candidate = e.candidate.candidate;
          message.sdpMid = e.candidate.sdpMid;
          message.sdpMLineIndex = e.candidate.sdpMLineIndex;
        } else {
          message.completed = true;
        }

        let reqmsg = {
          cmd: "WS_TRICKLE",
          session: sessionId,
          room_id: roomId,
          track_type: 0,
          candidate: message,
        };
        OCALL(reqmsg);
      };
    }

    return new Promise(function (resolve, reject) {
      let reqmsg = new Object();
      reqmsg.cmd = "WS_DATACHANNEL_REQ";
      reqmsg.session = sessionId;
      reqmsg.room_id = roomId;
      //reqmsg.publish_idx = publishIdx;
      OCALL(reqmsg);
      proc[sessionId] = resolve;
    });
  };

  this.leave = async function leave(sessionId) {
    let roomId = this.roomId;
    let sessionCall = getCallTbl(sessionId);

    return new Promise(function (resolve, reject) {
      let reqmsg = new Object();
      reqmsg.cmd = "WS_LEAVE_REQ";
      reqmsg.session = sessionId;
      reqmsg.room_id = roomId;
      OCALL(reqmsg);
      proc[sessionId] = resolve;

      if (sessionCall != undefined) {
        if (sessionCall["audioStream"])
          sessionCall["audioStream"]
            .getTracks()
            .forEach((track) => track.stop());
        if (sessionCall["localVideoStream"])
          sessionCall["localVideoStream"]
            .getTracks()
            .forEach((track) => track.stop());

        for (let i = 0; i < MAX_USER_CNT; i++) {
          if (sessionCall["remoteVideo"] != undefined) {
            sessionCall["remoteVideo"]
              .getTracks()
              .forEach((track) => track.stop());
          }
        }

        if (sessionCall["publish"] == true && audioPeerConnection)
          audioPeerConnection.close();

        if (sessionCall["videoPC"]) sessionCall["videoPC"].close();

        clearCallTbl(sessionId);
        delete proc[sessionId];
      }
    });
  };

  this.makeAudio = async function makeAudio() {
    try {
      let x = document.createElement("AUDIO");
      x.id = "Omnitalk-Audio-0";
      x.setAttribute("playsinline", "");
      x.setAttribute("autoplay", "");
      x.setAttribute("controls", "controls");
      //x.style.display ='none';
      document.body.appendChild(x);

      const constraints = { video: false, audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const localAudioElement = document.querySelector(
        "audio#Omnitalk-Audio-0"
      );
      localAudioElement.muted = true;
      //localAudioElement.srcObject = stream;
      return stream;
    } catch (error) {
      console.error("Error opening audio device.", error);
    }
  };

  /*
	async makeAudio2() {
		try {
			let x = document.createElement("AUDIO");
			x.id = "Omnitalk-Audio-1";
			x.setAttribute("playsinline", "");
			x.setAttribute("autoplay", "");
			x.setAttribute("controls", "controls");
			//x.style.display ='none';
			document.body.appendChild(x);

			const constraints = {'video': false, 'audio': true};
			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			//const localAudioElement = document.querySelector('audio#Omnitalk-Audio-0');
			//localAudioElement.muted = true;
			//localAudioElement.srcObject = stream;
			return stream;
		} catch(error) {
			console.error('Error opening audio device.', error);
		}
	}
	*/

  this.makeVideo = async function makeVideo() {
    try {
      const constraints = { video: true, audio: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const localVideoElement = document.querySelector(
        "video.Omnitalk-LocalVideo-0"
      );
      localVideoElement.srcObject = stream;
      return stream;
    } catch (error) {
      console.error("Error opening video camera.", error);
    }
  };
}

// OCALL ---------------------------------------------------------------------
//
async function OCALL(pmsg) {
  let sessionId = pmsg["session"];
  let sessionCall = getCallTbl(sessionId);
  console.log(`�삞�삞�삞�삞OCALL`);
  console.log(sessionCall);
  console.log(call);
  if (sessionCall) {
    switch (sessionCall["oCallState"]) {
      case "O_SESSION_STATE":
        switch (pmsg["cmd"]) {
          case "WS_ROOMLIST_REQ":
          case "WS_CREATE_REQ":
          case "WS_JOIN_REQ":
            sendMessage(pmsg);
            break;
          default:
            console.log("unknown state: " + pmsg["cmd"]);
            break;
        }
        break;
      case "O_ACTIVE_STATE":
        switch (pmsg["cmd"]) {
          case "WS_PARTILIST_REQ":
          case "WS_LEAVE_REQ":
          case "WS_TRICKLE":
            sendMessage(pmsg);
            break;
          case "WS_PUBLISH_REQ":
            sessionCall["oCallState"] = "O_PUBLISH_STATE";
            sessionCall["tCallState"] = "T_PUBLISH_STATE";
            sendMessage(pmsg);
            break;
          case "WS_SUBSCRIBE_REQ":
            sessionCall["oCallState"] = "O_SUBSCRIBE_STATE";
            sessionCall["tCallState"] = "T_SUBSCRIBE_STATE";
            sendMessage(pmsg);
            break;
          default:
            console.log("unknown state: " + pmsg["cmd"]);
            break;
        }
        break;
      case "O_PUBLISH_STATE":
        switch (pmsg["cmd"]) {
          case "WS_TRICKLE":
            sendMessage(pmsg);
            break;
        }
        break;
      case "O_CONNECT_STATE":
        switch (pmsg["cmd"]) {
          case "WS_PARTILIST_REQ":
          case "WS_LEAVE_REQ":
          case "WS_SUBSCRIBE_REQ":
            sendMessage(pmsg);
            break;
          case "WS_DATACHANNEL_REQ":
            sessionCall["oCallState"] = "O_DATACHANNEL_STATE";
            sessionCall["tCallState"] = "T_DATACHANNEL_STATE";
            sendMessage(pmsg);
            break;
        }
        break;
      case "O_SUBSCRIBE_STATE":
        switch (pmsg["cmd"]) {
          case "WS_SUBSCRIBE_COMP":
            sendMessage(pmsg);
            break;
        }
        break;
      case "O_DATACHANNEL_STATE":
        switch (pmsg["cmd"]) {
          case "WS_DATACHANNEL_COMP":
          case "WS_TRICKLE":
            sendMessage(pmsg);
            break;
        }
        break;
      default:
        console.log("Unknown OCallState, ", sessionCall["oCallState"]);
        break;
    }
  } else if (sessionId == undefined) {
    switch (pmsg["cmd"]) {
      case "WS_SESSION_REQ":
        sendMessage(pmsg);
        break;
    }
  } /*else if (sessionId && sessionCall == undefined) {
		let sessionCall = newCallTbl()
		console.log(sessionCall);
		if (sessionCall != undefined) {
			sessionCall = { 
				session: sessionId, 
				oCallState: "O_NULL_STATE", 
				tCallState: "T_NULL_STATE" 
			};
		}
	} 
	*/
}

// TCALL ---------------------------------------------------------------------
//
async function TCALL(recvmsg) {
  let pmsg = JSON.parse(recvmsg);
  let sessionId = pmsg["session"];
  let sessionCall = getCallTbl(sessionId);

  console.log(`�Ⅶ�Ⅶ�Ⅶ�Ⅶ�ⅦTCALL`);
  console.log(sessionCall);

  if (sessionCall == undefined) {
    sessionCall = newCallTbl(sessionId);
    sessionCall["oCallState"] = "O_NULL_STATE";
    sessionCall["tCallState"] = "T_NULL_STATE";
  }
  console.log(sessionCall);
  console.dir(`call `);
  console.dir(call);

  switch (sessionCall["tCallState"]) {
    case "T_NULL_STATE":
      switch (pmsg["cmd"]) {
        case "WS_SESSION_RSP":
          SessionResponse(sessionId, pmsg);
          break;
        case "WS_SUBSCRIBE_RSP":
          SubscribeResponse(sessionId, pmsg);
          break;
        default:
          proc[sessionId]("error");
          console.log("Unknown T_NULL Command: ", pmsg["cmd"]);
          break;
      }
      break;
    case "T_SESSION_STATE":
      switch (pmsg["cmd"]) {
        case "WS_CREATE_RSP":
          CreateResponse(sessionId, pmsg);
          break;
        case "WS_JOIN_RSP":
          JoinResponse(sessionId, pmsg);
          break;
        case "WS_ROOMLIST_RSP":
          RoomlistResponse(sessionId, pmsg);
          break;
        default:
          proc[sessionId]("error");
          console.log("Unknown T_SESSION Command: ", pmsg["cmd"]);
          break;
      }
      break;
    case "T_ACTIVE_STATE":
      switch (pmsg["cmd"]) {
        case "WS_ROOMLIST_RSP":
          RoomlistResponse(sessionId, pmsg);
          break;
        case "WS_PARTILIST_RSP":
          PartilistResponse(sessionId, pmsg);
          break;
        case "WS_LEAVE_RSP":
          LeaveResponse(sessionId, pmsg);
          break;
        case "WS_WEBRTCUP":
          WebrtcupNotify(sessionId, pmsg);
          break;
        default:
          proc[sessionId]("error");
          console.log("Unknown T_ACTIVE Command: ", pmsg["cmd"]);
          break;
      }
      break;
    case "T_PUBLISH_STATE":
      switch (pmsg["cmd"]) {
        case "WS_PUBLISH_RSP":
          PublishResponse(sessionId, pmsg);
          break;
        case "WS_PARTILIST_RSP":
          PartilistResponse(sessionId, pmsg);
          break;
        case "WS_TRICKLE":
          TrickleNotify(sessionId, pmsg);
          break;
        case "WS_WEBRTCUP":
          WebrtcupNotify(sessionId, pmsg);
          break;
        default:
          proc[sessionId]("error");
          console.log("Unknown T_PUBLISH Command: ", pmsg["cmd"]);
          break;
      }
      break;
    case "T_SUBSCRIBE_STATE":
      switch (pmsg["cmd"]) {
        case "WS_SUBSCRIBE_RSP":
          SubscribeResponse(sessionId, pmsg);
          break;
        case "WS_TRICKLE":
          TrickleNotify(sessionId, pmsg);
          break;
        case "WS_WEBRTCUP":
          WebrtcupNotify(sessionId, pmsg);
          break;
        default:
          proc[sessionId]("error");
          console.log("Unknown T_SUBSCRIBE Command: ", pmsg["cmd"]);
          break;
      }
      break;
    case "T_DATACHANNEL_STATE":
      switch (pmsg["cmd"]) {
        case "WS_DATACHANNEL_RSP":
          DataChannelResponse(sessionId, pmsg);
          break;
        case "WS_TRICKLE":
          DataTrickleNotify(sessionId, pmsg);
          break;
        case "WS_WEBRTCUP":
          WebrtcupNotify(sessionId, pmsg);
          break;
        default:
          proc[sessionId]("error");
          console.log("Unknown T_DATACHANNEL Command: ", pmsg["cmd"]);
          break;
      }
      break;
    case "T_CONNECT_STATE":
      switch (pmsg["cmd"]) {
        case "WS_SUBSCRIBE_RSP":
          SubscribeResponse(sessionId, pmsg);
          break;
        case "WS_TRICKLE":
          TrickleNotify(sessionId, pmsg);
          break;
        case "WS_WEBRTCUP":
          WebrtcupNotify(sessionId, pmsg);
          break;
        case "WS_LEAVE_RSP":
          LeaveResponse(sessionId, pmsg);
          break;
        case "WS_PARTILIST_RSP":
          PartilistResponse(sessionId, pmsg);
          break;
        default:
          proc[sessionId]("error");
          console.log("Unknown T_CONNECT Command: ", pmsg["cmd"]);
          break;
      }
      break;
    default:
      proc[sessionId]("error");
      console.log("Unknown Tcall State!");
  }
}

//
function sendMessage(obj) {
  let jsonmsg = JSON.stringify(obj);
  wss.send(jsonmsg);
}

function getUnixTimestamp() {
  return Math.floor(new Date().getTime() / 1000);
}

function randomString(length) {
  let chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  let string_length = length;
  let randomstring = "";
  for (let i = 0; i < string_length; i++) {
    let rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum, rnum + 1);
  }
  //document.randform.randomfield.value = randomstring;
  return randomstring;
}

function initCallTbl() {
  for (let i = 0; i < MAX_USER_CNT; i++) {
    call[i] = new Object();
  }
}

function newCallTbl(sessionId) {
  for (let i = 0; i < MAX_USER_CNT; i++) {
    if (call[i]["session"] == undefined) {
      call[i]["session"] = sessionId;
      return call[i];
    }
  }

  return undefined;
}

function getCallTbl(sessionId) {
  console.log(`getCallTbl`);
  console.log(call);
  for (let i = 0; i < MAX_USER_CNT; i++) {
    if (call[i]["session"] != undefined && call[i]["session"] == sessionId)
      return call[i];
  }
  return undefined;
}

function clearCallTbl(sessionId) {
  for (let i = 0; i < MAX_USER_CNT; i++) {
    if (call[i]["session"] != undefined && call[i]["session"] == sessionId)
      call[i]["session"] = undefined;
  }
}

async function SessionResponse(sessionId, pmsg) {
  console.log("---------------sessionResponse---------------");
  let sessionCall = getCallTbl(sessionId);
  console.log(sessionCall);
  if (sessionCall != undefined && pmsg["result"] == "success") {
    sessionCall["session"] = pmsg["session"];
    sessionCall["oCallState"] = "O_SESSION_STATE";
    sessionCall["tCallState"] = "T_SESSION_STATE";
  }
  //newCallTbl(sessionId);
  proc[0](sessionId);
}

async function CreateResponse(sessionId, pmsg) {
  let sessionCall = getCallTbl(sessionId);
  if (sessionCall != undefined && pmsg["result"] == "success") {
    sessionCall["room_id"] = pmsg["room_id"];
    sessionCall["oCallState"] = "O_SESSION_STATE";
    sessionCall["tCallState"] = "T_SESSION_STATE";
  }
  proc[sessionId](pmsg["room_id"]);
}

async function JoinResponse(sessionId, pmsg) {
  let sessionCall = getCallTbl(sessionId);
  if (sessionCall != undefined && pmsg["result"] == "success") {
    sessionCall["data_room_id"] = pmsg["data_room_id"];
    sessionCall["room_type"] = pmsg["room_type"];
    sessionCall["oCallState"] = "O_ACTIVE_STATE";
    sessionCall["tCallState"] = "T_ACTIVE_STATE";
    sessionCall["user_id"] = pmsg["user_id"];
    sessionCall["user_name"] = pmsg["user_name"];

    proc[sessionId](sessionCall["data_room_id"]);
  }
}

async function PartilistResponse(sessionId, pmsg) {
  proc[sessionId](pmsg["partilist"]);
}

async function RoomlistResponse(sessionId, pmsg) {
  proc[sessionId](pmsg["roomlist"]);
}

async function LeaveResponse(sessionId, pmsg) {
  proc[sessionId](pmsg["result"]);
}

async function WebrtcupNotify(sessionId, pmsg) {
  let sessionCall = getCallTbl(sessionId);
  if (sessionCall != undefined) {
    sessionCall["oCallState"] = "O_CONNECT_STATE";
    sessionCall["tCallState"] = "T_CONNECT_STATE";
    proc[sessionId](sessionCall["publish_idx"]);
  }
}

async function TrickleNotify(sessionId, pmsg) {
  let sessionCall = getCallTbl(sessionId);
  if (pmsg["track_type"] == 0) {
    let candidate = pmsg["candidate"];
    if (!candidate.candidate) {
      await audioPeerConnection.addIceCandidate(null);
    } else {
      await audioPeerConnection.addIceCandidate(candidate);
    }
  } else if (sessionCall != undefined) {
    let candidate = pmsg["candidate"];
    if (!candidate.candidate) {
      await sessionCall["videoPC"].addIceCandidate(null);
    } else {
      await sessionCall["videoPC"].addIceCandidate(candidate);
    }
  }
}

async function DataTrickleNotify(sessionId, pmsg) {
  let candidate = pmsg["candidate"];
  if (!candidate.candidate) {
    await dataPeerConnection.addIceCandidate(null);
  } else {
    await dataPeerConnection.addIceCandidate(candidate);
  }
}

async function PublishResponse(sessionId, pmsg) {
  let sessionCall = getCallTbl(sessionId);
  if (pmsg["audio_jsep"]) {
    audioPeerConnection.onicecandidate = (e) => {
      const message = {
        type: "candidate",
      };
      if (e.candidate) {
        message.candidate = e.candidate.candidate;
        message.sdpMid = e.candidate.sdpMid;
        message.sdpMLineIndex = e.candidate.sdpMLineIndex;
      } else {
        message.completed = true;
      }

      let reqmsg = {
        cmd: "WS_TRICKLE",
        session: sessionId,
        // room_id: roomId,
        track_type: 0,
        candidate: message,
      };
      OCALL(reqmsg);
    };
    await audioPeerConnection.setRemoteDescription(
      new RTCSessionDescription(pmsg["audio_jsep"])
    );
  }

  if (sessionCall != undefined) {
    if (pmsg["video_jsep"]) {
      await sessionCall["videoPC"].setRemoteDescription(
        new RTCSessionDescription(pmsg["video_jsep"])
      );
    }

    sessionCall["publish_idx"] = pmsg["publish_idx"];
  }
  proc[sessionId](pmsg["publish_idx"]);
}

async function SubscribeResponse(sessionId, pmsg) {
  let newSessionId = pmsg["new_session"];

  let sessionCall = getCallTbl(sessionId);
  let newSessionCall = getCallTbl(newSessionId);
  /*
	if (newSessionCall == undefined) {
		newSessionCall = newCallTbl(newSessionId);
		if (newSessionCall == undefined) {
			console.log("Unable to create more session!");
			return
		}
	}
	*/

  //let audioOffer = pmsg["audio_jsep"];
  //let videoOffer = pmsg["video_jsep"];
  let offer = pmsg["jsep"];
  let roomId = pmsg["room_id"];
  let trackType = pmsg["track_type"];

  proc[newSessionId] = proc[sessionId];
  newSessionCall = sessionCall;
  newSessionCall["session"] = newSessionId;
  newSessionCall["oCallState"] = "O_SUBSCRIBE_STATE";
  newSessionCall["tCallState"] = "T_SUBSCRIBE_STATE";

  // Audio
  let audioAnswer;
  if (trackType == 0 && audioPeerConnection == undefined) {
    await audioPeerConnection.setRemoteDescription(
      new RTCSessionDescription(offer)
    );
    audioAnswer = await audioPeerConnection.createAnswer();
    await audioPeerConnection.setLocalDescription(audioAnswer);
  }

  // Video
  let videoAnswer;
  if (trackType == 1) {
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };
    newSessionCall["videoPC"] = new RTCPeerConnection(configuration);
    console.log(MAX_USER_CNT, MAX_USER_CNT);
    for (let i = 0; i < MAX_USER_CNT; i++) {
      if (newSessionCall["remoteVideo"] == undefined) {
        newSessionCall["remoteVideo"] = document.querySelector(
          "video.Omnitalk-RemoteVideo-" + i
        );
        newSessionCall["videoPC"].ontrack = (e) => {
          newSessionCall["remoteVideo"].srcObject = e.streams[0];
        };

        newSessionCall["videoIdx"] = i;
      }
    }
    console.log("newSessionCall");
    console.log(newSessionCall);
    await newSessionCall["videoPC"].setRemoteDescription(
      new RTCSessionDescription(offer)
    );
    videoAnswer = await newSessionCall["videoPC"].createAnswer();
    await newSessionCall["videoPC"].setLocalDescription(videoAnswer);
  }

  if (proc[sessionId] != undefined) proc[sessionId](sessionId);
  proc[newSessionId](newSessionId);

  {
    //Send Subscribe Complete
    let reqmsg = new Object();
    reqmsg.cmd = "WS_SUBSCRIBE_COMP";
    reqmsg.session = newSessionId;
    reqmsg.room_id = roomId;
    reqmsg.track_type = pmsg["track_type"];

    if (trackType == 0) {
      reqmsg.jsep = audioAnswer;
    } else if (trackType == 1) {
      reqmsg.jsep = videoAnswer;
    }

    sendMessage(reqmsg);
    console.log(newSessionCall["tCallState"], ": ", reqmsg);
  }
}

async function DataChannelResponse(sessionId, pmsg) {
  //let sessionId = pmsg["session"];
  let offer = pmsg["jsep"];
  let roomId = pmsg["room_id"];
  let trackType = pmsg["track_type"];
  let sessionCall = getCallTbl(sessionId);
  let dataRoomId = sessionCall["data_room_id"];

  let config = { iceServers: [{ url: "stun:stun.l.google.com:19302" }] };

  dataPeerConnection = new RTCPeerConnection(config);
  await dataPeerConnection.setRemoteDescription(
    new RTCSessionDescription(offer)
  );
  let answer = await dataPeerConnection.createAnswer();
  await dataPeerConnection.setLocalDescription(answer);

  dataPeerConnection.onicecandidate = (e) => {
    const message = {
      type: "candidate",
    };
    if (e.candidate) {
      message.candidate = e.candidate.candidate;
      message.sdpMid = e.candidate.sdpMid;
      message.sdpMLineIndex = e.candidate.sdpMLineIndex;
    } else {
      message.completed = true;
    }

    let reqmsg = {
      cmd: "WS_TRICKLE",
      session: sessionId,
      room_id: roomId,
      candidate: message,
    };
    console.log(reqmsg);
    OCALL(reqmsg);
  };

  dataChann = dataPeerConnection.createDataChannel("OmniTalk-DataChannel");

  dataChann.onmessage = (event) => {
    console.log(`received: ${event.data}`);
  };

  dataChann.onopen = () => {
    console.log("datachannel open");
    /*
		if (test == undefined) {
			var msg = {
				'textroom': 'create',
				'room': dataRoomId,
				'transaction': randomString(6),
				'username': call[sessionId]["user_id"]
			};
			dataChann.send(JSON.stringify(msg));

			var msg = {
				'textroom': 'join',
				'room': dataRoomId,
				'transaction': randomString(6),
				'username': call[sessionId]["user_id"]
			};
			dataChann.send(JSON.stringify(msg));

			var msg = {
				'textroom': 'message',
				'room': dataRoomId,
				'transaction': randomString(6),
				'username': call[sessionId]["user_id"],
				'display': call[sessionId]["user_name"],
				'text': "Hello~ Omnitak!",
				'ack': false
			};
			dataChann.send(JSON.stringify(msg));

			test = true;
		} else {
			var msg = {
				'textroom': 'join',
				'room': dataRoomId,
				'transaction': randomString(6),
				'username': call[sessionId]["user_id"]
			};
			dataChann.send(JSON.stringify(msg));

			var msg = {
				'textroom': 'message',
				'room': dataRoomId,
				'transaction': randomString(6),
				'username': call[sessionId]["user_id"],
				'display': call[sessionId]["user_name"],
				'text': "Hello~ Omnitak!",
				'ack': false
			};
			dataChann.send(JSON.stringify(msg));
		}
		*/
  };

  dataChann.onclose = () => {
    console.log("datachannel close");
  };

  proc[sessionId](sessionId);
  {
    let reqmsg = new Object();
    reqmsg.cmd = "WS_DATACHANNEL_COMP";
    reqmsg.session = sessionId;
    reqmsg.room_id = roomId;
    reqmsg.jsep = answer;
    sendMessage(reqmsg);
    console.log(sessionCall["tCallState"], ": ", reqmsg);
  }
}
