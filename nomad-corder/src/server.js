import http from 'http'
import express from 'express'
import Websocket from 'ws'
const app = express();

app.set('views', __dirname + '/public/views');
app.use('/public' ,express.static(__dirname +'/public')) 
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.get('/' ,(req,res)=>
    res.render('home')
)


const handleListen =(title) =>{
    console.log(`Listening on ws:`)
}
// app.listen(3000,handleListen)

// 서버 만듦
const server = http.createServer(app);

// 웹소켓 서버 만듦(http와 같이 둘 다 작동시킴)
const wss = new Websocket.Server({server})

//'connection'이 생기면 socket을 받고 socket은 연결된 브라우저를 말한다
// on 메서드는 연결된 사람의 정보를 제공
wss.on('connection',(socket)=>{
    // console.log(socket)
    socket.on('close', ()=>{
        console.log('closed Server❌')
    })

    socket.on('message', message=>{
        console.log(message)
    })
    socket.send("hello")

} )

server.listen(3000, handleListen)