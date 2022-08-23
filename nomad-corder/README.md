Zoom Clone Using NodeJS, WebRTc and Websockets


@@ Description

1. @babel/core

2. @babel/cli

3. @babel/node

4. babel?

5. nodemon


nodemon.json

Nodemon은 우리의 프로젝트를 살펴보고 변경 사항이 있을 시 서버를 재시작해주는 프로그램

서버를 재시작하는 대신에 babel-node를 실행하게 되는데

Babel은 우리가 작성한 코드를 일반 NodeJS 코드로 컴파일 해주는데

exec : src/server.js에 대해 babel-node 명령문을 실행시키는 것

그 작업을 src/server.js 파일에 해줘

"ignore":["src/public/*"] -> public 폴더 내의 파일이 변경되어도 nodemon을 실행시키지 않겠다.

1. package.json

nodemon이 호출되면 nodemon이 nodemon.json을 살펴보고 거기 있는 코드를 실행한다

7. Websocket

브라우저에 내장된 websocket api

websocket은 언어에 국한된게 아니다 그저 protocol이다

http와의 차이 알자

websocket 으로 실시간 chat, notification, call 같은 real-time을 만들 수 있다(양방향)

> http
> 모든 서버들이 작동하는 방식
> 유저가 request를 보내면 서버가 response로 응답한다
> stateless한 특성 -> 서버가 기억하지 못한다. request와 response 과정 뒤에 서버가 잊어 버린다 끝!!!! -> real time이 아니다(서버가 먼저 못 보냄)

websocket을 사용해서 연결하고 싶고, 서버가 지원한다면 wss를 쓰면 된다
ex) wss://nomadcoder.co

8. ws

library ws
websocket protocol을 실행하는 package