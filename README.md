# WebRTC



## 개념

### MediaStream
사용자의 카메라와 마이크 같은 곳의 데이터 스트림에 접근합니다. 우리의 애플리케이션이 사용자의 음성, 영상 데이터를 채집해 올 때 자주 사용

### RTCPeerConnection
암호화 및 대역폭 관리를 하는 기능을 가지고 있고, 오디오 또는 비디오 연결을 담당합니다. 애플리케이션이 채집한 음성 및 영상 데이터를 서로 주고 받는 채널을 추상화하였다고 생각

### sdp
- 미디어를 전송하기 위한 설정 값
- SDP 정보는 WebRTC의 RTCPeerConnection 객체를 사용할 때 꼭 필요

### candidate
- 미디어를 전송하고 전송받는 브라우저의 네트워크 정보가 필요
- ICE 프레임워크를 사용하여 상대방 브라우저의 네트워크 연결 정보를 찾는데 이 기능은 브라우저에 내장되어 있으며 후보 리스트를 교환하는 방식으로 이루어진다.
- 중요한 점은 미디어 전송이 이루어지기 전에 SDP와 네트워크 연결 정보인 후보 리스트가 교환되야 한다는 것\

1. RTCPeerConnection Object 를 새롭게 생성하고 RTCPeerConnection.onicecandidate 핸들러를 통해 현재 내 client 의 Ice Candidate(Network 정보) 가 확보되면 실행될 callback 을 전달합니다.
2. Ice Candidate (내 네트워크 정보) 가 확보되면, 중간 매개자인 Signaling Server 을 통해 상대 peer 에게 serialized 된 ice candidate 정보를 전송합니다. (쌍방이 서로에게 합니다.)
3. 	상대 peer 의 candidate (네트워크 정보) 가 도착하면, RTCPeerConnection.addIceCandidate 를 통해 상대 peer 의 네트워크 정보를 등록합니다. (쌍방이 모두 합니다.)

#### RTCPeerConnection.onicecandidate
RTCPeerConnection 속성의 onicecandidate 는 RTCPeerConnection 인스턴스에서 icecandidate 이벤트 발생시에 호출 하려는 함수를 지정

이 이벤트는 로컬 ICE (en-US) 에이전트가 signaling 서버를 통해 원격 피어에게 메세지를 전달 할 필요가 있을때 마다 발생

만약 이벤트의 candidate 속성이 null로 지정되어있다면, ICE 수집과정이 완료됩니다.

> https://developer.mozilla.org/ko/docs/Web/API/RTCPeerConnection/icecandidate_event





> https://webrtc.github.io/samples/

> https://developer.mozilla.org/ko/docs/Web/API/RTCPeerConnection/icecandidate_event