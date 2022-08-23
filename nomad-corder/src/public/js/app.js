// 웹소켓은 브라우저와 서버의 연결
const socket = new WebSocket(`ws://${window.location.host}`)


// 서버와 연결될 때
socket.addEventListener("open" ,()=>{
    console.log("connected to Browse ✅")
})

// 서버에서 보낸 메시지 받기
socket.addEventListener("message", (message)=>{
console.log('message:', message)
})

// 서버와 해제될 때
socket.addEventListener('close', ()=>{
    console.log('closed Server ❌')
})
setTimeout(()=>{
    socket.send('asdfasdf')
},7000)
