"use strict";
// document.write("<script src='adapter.js'></script>");
const SDKVER = "0.1.0";

let call = new Object();
let proc = new Object();

let audioPeerConnection;
let dataPeerConnection;
let dc;

let test;

let serviceID = 0;
let wss;

class Omnitalk {
  constructor(service) {
    serviceID = service;
    this.roomId = undefined;
    this.sessionid = undefined;
  }

  connect() {
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
  }

  async createSession() {
    await this.connect();
    return new Promise(function (resolve, reject) {
      let reqmsg = new Object();
      reqmsg.cmd = "WS_SESSION_REQ";
      reqmsg.service_id = serviceID;
      reqmsg.sdk = SDKVER;
      OCALL(reqmsg);
      proc[0] = resolve;
      console.log("proc");
      console.log(proc);
      console.log("😈😈😈😈😈😈😈createSession");
    });
  }

  createRoom(
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
      resolve();
    });
  }

  joinRoom(
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
  }

  roomList(sessionId) {
    console.log("👹👹👹👹👹roomList함수");
    this.sessionId = sessionId;
    return new Promise(function (resolve, reject) {
      let reqmsg = new Object();
      reqmsg.cmd = "WS_ROOMLIST_REQ";
      reqmsg.session = sessionId;
      OCALL(reqmsg);
      proc[sessionId] = resolve;
    });
  }

  partiList(roomId) {
    let sessionId = this.sessionId;
    console.log("+++++++++++++partiList");
    console.log(roomId);
    return new Promise(function (resolve, reject) {
      let reqmsg = new Object();
      reqmsg.cmd = "WS_PARTILIST_REQ";
      reqmsg.session = sessionId;
      reqmsg.room_id = roomId;
      OCALL(reqmsg);
      proc[sessionId] = resolve;
    });
  }

  async publish(opt = { video: true, audio: true, recording: false }) {
    let sessionId = this.sessionId;
    let roomId = this.roomId;
    let audioOffer, videoOffer;

    // Peerconnection
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    // Audio Peerconnection
    if (audioPeerConnection == undefined) {
      audioPeerConnection = new RTCPeerConnection(configuration);
      call[sessionId]["audioStream"] = await this.makeAudio();
      audioPeerConnection.addTrack(
        call[sessionId]["audioStream"].getTracks()[0],
        call[sessionId]["audioStream"]
      );
      audioPeerConnection.ontrack = (e) => {
        const localAudioElement = document.querySelector(
          "audio#Omnitalk-Audio-0"
        );
        localAudioElement.srcObject = e.streams[0];
      };

      /*
                          audioPeerConnection.onicecandidate = e => {
                                  const message = {
                                          type: 'candidate'
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
                                  }
                                  OCALL(reqmsg);
                          };
                          */
      audioOffer = await audioPeerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await audioPeerConnection.setLocalDescription(audioOffer);
    }

    // Video Peerconnection
    const videoPeerConnection = new RTCPeerConnection(configuration);
    call[sessionId]["videoPC"] = videoPeerConnection;
    call[sessionId]["localVideoStream"] = await this.makeVideo();
    videoPeerConnection.addTrack(
      call[sessionId]["localVideoStream"].getTracks()[0],
      call[sessionId]["localVideoStream"]
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
  }

  async subscribe(publishIdx) {
    console.log("🥶🥶🥶🥶🥶🥶", publishIdx);
    let sessionId = this.sessionId;
    let roomId = this.roomId;

    // Peerconnection
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    // Audio Peerconnection
    if (audioPeerConnection == undefined) {
      audioPeerConnection = new RTCPeerConnection(configuration);
      call[sessionId]["audioStream"] = await this.makeAudio();
      audioPeerConnection.addTrack(
        call[sessionId]["audioStream"].getTracks()[0],
        call[sessionId]["audioStream"]
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
  }

  async dataChannel() {
    let sessionId = this.sessionId;
    let roomId = this.roomId;

    // Peerconnection
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    // Audio Peerconnection
    if (dataPeerConnection == undefined) {
      dataPeerConnection = new RTCPeerConnection(configuration);
      /*
        call[sessionId]["audioStream"] = await this.makeAudio2();
        dataPeerConnection.addTrack(
          call[sessionId]["audioStream"].getTracks()[0],
          call[sessionId]["audioStream"]
        );
        dataPeerConnection.ontrack = (e) => {
          const localAudioElement = document.querySelector(
            "audio#Omnitalk-Audio-1"
          );
          localAudioElement.srcObject = e.streams[0];
        };
            */

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
      reqmsg.publish_idx = publishIdx;
      OCALL(reqmsg);
      proc[sessionId] = resolve;
    });
  }

  async leave(sessionId) {
    let roomId = this.roomId;

    return new Promise(function (resolve, reject) {
      let reqmsg = new Object();
      reqmsg.cmd = "WS_LEAVE_REQ";
      reqmsg.session = sessionId;
      reqmsg.room_id = roomId;
      OCALL(reqmsg);
      proc[sessionId] = resolve;

      if (call[sessionId]["audioStream"])
        call[sessionId]["audioStream"]
          .getTracks()
          .forEach((track) => track.stop());
      if (call[sessionId]["localVideoStream"])
        call[sessionId]["localVideoStream"]
          .getTracks()
          .forEach((track) => track.stop());
      if (call[sessionId]["remoteStream"])
        call[sessionId]["remoteStream"]
          .getTracks()
          .forEach((track) => track.stop());

      if (audioPeerConnect) audioPeerConnection.close();
      if (call[sessionId]["videoPC"]) call[sessionId]["videoPC"].close();

      delete call[sessionId];
      delete proc[sessionId];
    });
  }

  async makeAudio() {
    try {
      const audioDiv = document.getElementById("audio");
      var x = document.createElement("AUDIO");
      x.id = "Omnitalk-Audio-0";
      x.setAttribute("playsinline", "");
      x.setAttribute("autoplay", "");
      x.setAttribute("controls", "controls");
      //x.style.display ='none';
      audioDiv.appendChild(x);

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
  }

  /*
    async makeAudio2() {
      try {
        var x = document.createElement("AUDIO");
        x.id = "Omnitalk-Audio-1";
        x.setAttribute("playsinline", "");
        x.setAttribute("autoplay", "");
        x.setAttribute("controls", "controls");
        //x.style.display ='none';
        document.body.appendChild(x);
  
        const constraints = { video: false, audio: true };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        //const localAudioElement = document.querySelector('audio#Omnitalk-Audio-0');
        //localAudioElement.muted = true;
        //localAudioElement.srcObject = stream;
        return stream;
      } catch (error) {
        console.error("Error opening audio device.", error);
      }
    }
    */
  async makeVideo() {
    try {
      const constraints = { video: true, audio: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const localVideoElement = document.querySelector(
        "video#Omnitalk-Video-0"
      );
      // localVideoElement.setAttribute("style", "display:inline");
      localVideoElement.srcObject = stream;
      //call[sessionId]["localVideoStream"] = stream;
      return stream;
    } catch (error) {
      console.error("Error opening video camera.", error);
    }
  }
}

// UTILS ---------------------------------------------------------------------
//
function sendMessage(obj) {
  console.log("--------sendMessage-------");
  console.log(obj);
  let jsonmsg = JSON.stringify(obj);
  wss.send(jsonmsg);
}

function getUnixTimestamp() {
  return Math.floor(new Date().getTime() / 1000);
}

function randomString(length) {
  var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var string_length = length;
  var randomstring = "";
  for (var i = 0; i < string_length; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum, rnum + 1);
  }
  //document.randform.randomfield.value = randomstring;
  return randomstring;
}

// OCALL ---------------------------------------------------------------------
//
async function OCALL(pmsg) {
  let sessionId = pmsg["session"];
  console.log("💩💩💩💩OCALL💩💩💩💩");
  if (sessionId) {
    console.dir(call);
    console.log("pmsg", pmsg);
    console.log(call[sessionId]["oCallState"]);
    switch (call[sessionId]["oCallState"]) {
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
            call[sessionId]["oCallState"] = "O_PUBLISH_STATE";
            call[sessionId]["tCallState"] = "T_PUBLISH_STATE";
            sendMessage(pmsg);
            break;
          case "WS_SUBSCRIBE_REQ":
            call[sessionId]["oCallState"] = "O_SUBSCRIBE_STATE";
            call[sessionId]["tCallState"] = "T_SUBSCRIBE_STATE";
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
            call[sessionId]["oCallState"] = "O_DATACHANNEL_STATE";
            call[sessionId]["tCallState"] = "T_DATACHANNEL_STATE";
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
        console.log("Unknown OCallState, ", call[sessionId]["oCallState"]);
        break;
    }
  } else if (sessionId == undefined) {
    console.log("세션이 없을 때");
    console.log(pmsg);
    switch (pmsg["cmd"]) {
      case "WS_SESSION_REQ":
        sendMessage(pmsg);
        break;
    }
  } else if (sessionId && call[sessionId] == undefined) {
    call[sessionId] = {
      session: sessionId,
      oCallState: "O_NULL_STATE",
      tCallState: "T_NULL_STATE",
    };
  }
}

// TCALL ---------------------------------------------------------------------
//
async function TCALL(recvmsg) {
  console.log("💩💩💩💩TCALL💩💩💩💩");
  console.log("recvmsg:", recvmsg);
  let pmsg = JSON.parse(recvmsg);
  let sessionId = pmsg["session"];

  if (call[sessionId] == undefined) {
    call[sessionId] = {
      session: sessionId,
      oCallState: "O_NULL_STATE",
      tCallState: "T_NULL_STATE",
    };
  }
  console.log(call[sessionId]);
  console.log(pmsg["cmd"]);
  switch (call[sessionId]["tCallState"]) {
    case "T_NULL_STATE":
      switch (pmsg["cmd"]) {
        case "WS_SESSION_RSP":
          SessionResponse(sessionId, pmsg);
          break;
        case "WS_SUBSCRIBE_RSP":
          SubscribeResponse(sessionId, pmsg);
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
          console.log("Unknown T_CONNECT Command: ", pmsg["cmd"]);
          break;
      }
      break;
    default:
      console.log("Unknown Tcall State!");
  }
}

async function SessionResponse(sessionId, pmsg) {
  if (pmsg["result"] == "success") {
    call[sessionId]["session"] = pmsg["session"];
    call[sessionId]["oCallState"] = "O_SESSION_STATE";
    call[sessionId]["tCallState"] = "T_SESSION_STATE";
  }
  console.log("--------sessionResponse");
  console.log(proc);
  proc[0](sessionId);
}

async function CreateResponse(sessionId, pmsg) {
  if (pmsg["result"] == "success") {
    call[sessionId]["room_id"] = pmsg["room_id"];
    call[sessionId]["oCallState"] = "O_SESSION_STATE";
    call[sessionId]["tCallState"] = "T_SESSION_STATE";
  }
  proc[sessionId](pmsg["room_id"]);
}

async function JoinResponse(sessionId, pmsg) {
  if (pmsg["result"] == "success") {
    call[sessionId]["data_room_id"] = pmsg["data_room_id"];
    call[sessionId]["room_type"] = pmsg["room_type"];
    call[sessionId]["oCallState"] = "O_ACTIVE_STATE";
    call[sessionId]["tCallState"] = "T_ACTIVE_STATE";
    call[sessionId]["user_id"] = pmsg["user_id"];
    call[sessionId]["user_name"] = pmsg["user_name"];
  }
  proc[sessionId](call[sessionId]["data_room_id"]);
}

async function PartilistResponse(sessionId, pmsg) {
  console.log("------PartilistResponse------");
  console.dir(proc[sessionId]);
  console.dir(pmsg);
  proc[sessionId](pmsg["partilist"]);
}

async function RoomlistResponse(sessionId, pmsg) {
  console.log("------RoomlistResponse------");
  console.dir(proc[sessionId]);
  console.dir(pmsg);

  proc[sessionId](pmsg["roomlist"]);
}

async function LeaveResponse(sessionId, pmsg) {
  proc[sessionId](pmsg["result"]);
}

async function WebrtcupNotify(sessionId, pmsg) {
  call[sessionId]["oCallState"] = "O_CONNECT_STATE";
  call[sessionId]["tCallState"] = "T_CONNECT_STATE";
  proc[sessionId](call[sessionId]["publish_idx"]);
}

async function TrickleNotify(sessionId, pmsg) {
  if (pmsg["track_type"] == 0) {
    let candidate = pmsg["candidate"];
    if (!candidate.candidate) {
      await audioPeerConnection.addIceCandidate(null);
    } else {
      await audioPeerConnection.addIceCandidate(candidate);
    }
  } else {
    let candidate = pmsg["candidate"];
    if (!candidate.candidate) {
      await call[sessionId]["videoPC"].addIceCandidate(null);
    } else {
      await call[sessionId]["videoPC"].addIceCandidate(candidate);
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
  console.log("!!!!!!!!!!!PublishResponse");
  //if (pmsg["track_type"] == 0) {
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
        room_id: roomId,
        track_type: 0,
        candidate: message,
      };
      OCALL(reqmsg);
    };
    await audioPeerConnection.setRemoteDescription(
      new RTCSessionDescription(pmsg["audio_jsep"])
    );
  }
  //} else if (pmsg["track_type"] == 1) {
  //
  if (pmsg["video_jsep"]) {
    await call[sessionId]["videoPC"].setRemoteDescription(
      new RTCSessionDescription(pmsg["video_jsep"])
    );
  }
  //}
  console.log("!!!!!!!!!!!!!!!!!!!!");
  console.log(call[sessionId]["publish_idx"]);

  call[sessionId]["publish_idx"] = pmsg["publish_idx"];
  console.log(call[sessionId]["publish_idx"]);
  proc[sessionId](pmsg["publish_idx"]);
}

async function SubscribeResponse(sessionId, pmsg) {
  let newSessionId = pmsg["new_session"];

  //let audioOffer = pmsg["audio_jsep"];
  //let videoOffer = pmsg["video_jsep"];
  let offer = pmsg["jsep"];
  let roomId = pmsg["room_id"];
  let trackType = pmsg["track_type"];

  proc[newSessionId] = proc[sessionId];
  call[newSessionId] = call[sessionId];
  call[newSessionId]["session"] = newSessionId;
  call[newSessionId]["oCallState"] = "O_SUBSCRIBE_STATE";
  call[newSessionId]["tCallState"] = "T_SUBSCRIBE_STATE";
  //delete call[newSessionId]["localStream"];

  // Audio
  let audioAnswer;
  if (trackType == 0) {
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
    call[newSessionId]["videoPC"] = new RTCPeerConnection(configuration);

    const remoteVideo = document.querySelector("video#Omnitalk-Video-1");
    call[newSessionId]["videoPC"].ontrack = (e) => {
      // localVideoElement.setAttribute("style", "display:inline");
      remoteVideo.srcObject = e.streams[0];
      call[newSessionId]["remoteStream"] = e.streams[0];
    };

    await call[newSessionId]["videoPC"].setRemoteDescription(
      new RTCSessionDescription(offer)
    );
    videoAnswer = await call[newSessionId]["videoPC"].createAnswer();
    await call[newSessionId]["videoPC"].setLocalDescription(videoAnswer);
  }

  proc[sessionId](sessionId);
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
    console.log(call[sessionId]["tCallState"], ": ", reqmsg);
  }
}

async function DataChannelResponse(sessionId, pmsg) {
  //let sessionId = pmsg["session"];
  let offer = pmsg["jsep"];
  let roomId = pmsg["room_id"];
  let trackType = pmsg["track_type"];
  let dataRoomId = call[sessionId]["data_room_id"];

  var config = { iceServers: [{ url: "stun:stun.l.google.com:19302" }] };

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

  dc = dataPeerConnection.createDataChannel("OmniTalk-DataChannel");

  dc.onmessage = (event) => {
    console.log(`received: ${event.data}`);
  };

  dc.onopen = () => {
    console.log("datachannel open");
    /*
                  if (test == undefined) {
                          var msg = {
                                  'textroom': 'create',
                                  'room': dataRoomId,
                                  'transaction': randomString(6),
                                  'username': call[sessionId]["user_id"]
                          };
                          dc.send(JSON.stringify(msg));
  
                          var msg = {
                                  'textroom': 'join',
                                  'room': dataRoomId,
                                  'transaction': randomString(6),
                                  'username': call[sessionId]["user_id"]
                          };
                          dc.send(JSON.stringify(msg));
  
                          var msg = {
                                  'textroom': 'message',
                                  'room': dataRoomId,
                                  'transaction': randomString(6),
                                  'username': call[sessionId]["user_id"],
                                  'display': call[sessionId]["user_name"],
                                  'text': "Hello~ Omnitak!",
                                  'ack': false
                          };
                          dc.send(JSON.stringify(msg));
  
                          test = true;
                  } else {
                          var msg = {
                                  'textroom': 'join',
                                  'room': dataRoomId,
                                  'transaction': randomString(6),
                                  'username': call[sessionId]["user_id"]
                          };
                          dc.send(JSON.stringify(msg));
  
                          var msg = {
                                  'textroom': 'message',
                                  'room': dataRoomId,
                                  'transaction': randomString(6),
                                  'username': call[sessionId]["user_id"],
                                  'display': call[sessionId]["user_name"],
                                  'text': "Hello~ Omnitak!",
                                  'ack': false
                          };
                          dc.send(JSON.stringify(msg));
                  }
                  */
  };

  dc.onclose = () => {
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
    console.log(call[sessionId]["tCallState"], ": ", reqmsg);
  }
}
