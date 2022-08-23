
const startButton = document.getElementById('startButton');
const hangupButton = document.getElementById('hangupButton');
hangupButton.disabled = true;

// 비디오 태그 정보 가져오기
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// 비디오, 오디오 기기 설정하기
const audioInputSelect = document.querySelector('select#audioSource');
const audioOutputSelect = document.querySelector('select#audioOutput');
const videoSelect = document.querySelector('select#videoSource');

const selectors = [audioInputSelect, audioOutputSelect, videoSelect];

let pc;
let localStream;

// BroadcastChannel - 동일한 출처의 다른 창,탭,iframe 간에 통신할 수 있는 API
const signaling = new BroadcastChannel('webrtc');
signaling.onmessage = e => {
  if (!localStream) {
    console.log('not ready yet');
    return;
  }
  switch (e.data.type) {
    case 'ready':
      if (pc) {
        console.log('already in call, ignoring');
        return;
      }
      makeCall();
      break;
    case 'offer':
      handleOffer(e.data);
      break;
    case 'answer':
      handleAnswer(e.data);
      break;
    case 'candidate':
      handleCandidate(e.data);
      break;
    
    case 'bye':
      if (pc) {
        hangup();
      }
      break;
    default:
      console.log('unhandled', e);
      break;
  }
};

console.log('signaling')
console.log(signaling)

startButton.onclick = async () => {
    //비디오 가져오기 / getUserMediadml 첫 번째 파라미터로 어느 미디어를 사용할 것인지 객체로 전달하고, 성공하면 첫번째 콜백, 실패하면 두번째 콜백이 실행된다.
  localStream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});
  console.log('localStream')
  console.log(localStream)
  localVideo.srcObject = localStream;


  startButton.disabled = true;
  hangupButton.disabled = false;

  signaling.postMessage({type: 'ready'});
};



hangupButton.onclick = async () => {
  hangup();
  signaling.postMessage({type: 'bye'});
};

async function hangup() {
    console.log('hangup function')
  if (pc) {
    pc.close();
    pc = null;
  }
  localStream.getTracks().forEach(track => track.stop());
  localStream = null;
  startButton.disabled = false;
  hangupButton.disabled = true;
};

function createPeerConnection() {
    console.log('2. createPeerConnection function')
  pc = new RTCPeerConnection();
  pc.onicecandidate = e => {
    const message = {
      type: 'candidate',
      candidate: null,
    };
    if (e.candidate) {
      message.candidate = e.candidate.candidate;
      message.sdpMid = e.candidate.sdpMid;
      message.sdpMLineIndex = e.candidate.sdpMLineIndex;
    }
    signaling.postMessage(message);
  };
  pc.ontrack = e => remoteVideo.srcObject = e.streams[0];
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
}

async function makeCall() {
    console.log('1. makeCall function')
  await createPeerConnection();

  const offer = await pc.createOffer();
  signaling.postMessage({type: 'offer', sdp: offer.sdp});
  await pc.setLocalDescription(offer);
}


async function handleOffer(offer) {
    console.log('3. handleOffer function')
  if (pc) {
    console.error('existing peerconnection');
    return;
  }
  await createPeerConnection();
  await pc.setRemoteDescription(offer);

  const answer = await pc.createAnswer();
  signaling.postMessage({type: 'answer', sdp: answer.sdp});
  await pc.setLocalDescription(answer);
}

async function handleAnswer(answer) {
    console.log('4. handleAnswer function')
    console.log('전화 받는 사람!!')
  if (!pc) {
    console.error('no peerconnection');
    return;
  }
  await pc.setRemoteDescription(answer);
}

async function handleCandidate(candidate) {
    console.log('5. handleCandidate function')
  if (!pc) {
    console.error('no peerconnection');
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
  console.log('--------------gotStream function start----------------------')
  window.stream = stream; // make stream available to console
  localVideo.srcObject = stream;
  return navigator.mediaDevices.enumerateDevices();
  console.log('--------------gotStream function start----------------------')
}


function gotDevices(deviceInfos) {
  console.log('--------------gotDevices function start----------------------')
  // selectors  [select#audioSource, select#audioOutput, select#videoSource]
  // values 처음 로드 됐을 때 ['', '', ''] selector의 값을 바꾸면 values 값 변한다.
  const values = selectors.map(select => select.value);
  console.log('selectors')
  console.log(selectors)
  selectors.forEach(select => {
    console.log('select.firstChild')
    console.log(select.firstChild)
    while (select.firstChild) { // select.firstChild 처음 로드됐을때는 전부 null이다
      select.removeChild(select.firstChild);
    }
  });
  // device 종류에 따라 분류해 옵션에 넣어주기
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    const option = document.createElement('option');
    option.value = deviceInfo.deviceId;
    // device 종류에 따라 option에 값 넣기
    if (deviceInfo.kind === 'audioinput') {
      option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
      audioInputSelect.appendChild(option);
    } else if (deviceInfo.kind === 'audiooutput') {
      option.text = deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`;
      audioOutputSelect.appendChild(option);
    } else if (deviceInfo.kind === 'videoinput') {
      option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    } else {
      console.log('Some other kind of source/device: ', deviceInfo);
    }
  }

  
  console.log('values')
  console.log(values)
  selectors.forEach((select, selectorIndex) => {
    console.log('select2')
    console.log(select)
    console.log('select.value')
    console.log(select.value)
    console.log(Array.prototype.slice.call(select.childNodes)) 
    // select.childNodes -> select의 option들
    // Array.prototype.slice.call(select.childNodes) -> NodeList(select.childNodes)를 Array로 바꿔준다
    // Array.prototype.slice.call(select.childNodes) -> Array.from(select.childNodes)으로 바꿔도 작동
    // some 함수는 배열의 요소 중 하나라도 callbackFunction에서 true를 리턴하면 true를 리턴 합니다.
    if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
      select.value = values[selectorIndex];
    }
    console.log('select3')
    console.log(select)
  });
  console.log('---------------gotDevices function end---------------------')
}

// Attach audio output device to video element using device/sink ID.
function attachSinkId(element, sinkId) {
  if (typeof element.sinkId !== 'undefined') {
    element.setSinkId(sinkId)
        .then(() => {
          console.log(`Success, audio output device attached: ${sinkId}`);
        })
        .catch(error => {
          let errorMessage = error;
          if (error.name === 'SecurityError') {
            errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`;
          }
          console.error(errorMessage);
          // Jump back to first output device in the list as it's the default.
          audioOutputSelect.selectedIndex = 0;
        });
  } else {
    console.warn('Browser does not support output device selection.');
  }
}

function changeAudioDestination() {
  const audioDestination = audioOutputSelect.value;
  attachSinkId(videoElement, audioDestination);
}

async function start() {
  console.log('--------------start function start----------------------')
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
  }
  console.log('window.stream')
  console.log(window.stream)
  const audioSource = audioInputSelect.value;
  const videoSource = videoSelect.value;
  
  const constraints = {
    audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
    video: {deviceId: videoSource ? {exact: videoSource} : undefined}
  };
  console.log('constraints')
  console.log(constraints)
  // const devices = navigator.mediaDevices.getUserMedia(constraints).then(gotStream).then(gotDevices).catch(handleError);
  // navigator 객체는 브라우저 공급자 및 버전 정보 등을 포함한 브라우저에 대한 다양한 정보를 저장하는 객체
  // MediaDevices 인터페이스의 getUserMedia() 메서드는 사용자에게 미디어 입력 장치 사용 권한을 요청하며, 
  // 사용자가 수락하면 요청한 미디어 종류의 트랙을 포함한 MediaStream (en-US)을 반환
  mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
  console.log('mediaStream')
  console.log(mediaStream)
  const devices = await gotStream(mediaStream);

  console.log('devices')
  console.log(devices)

 await gotDevices(devices)
 

 console.log('--------------start function end----------------------')
}


{
audioInputSelect.onchange = start;
audioOutputSelect.onchange = changeAudioDestination;

videoSelect.onchange = start;
}

start()