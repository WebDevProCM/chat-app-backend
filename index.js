const http = require("http");
// const badWords = require("bad-words");
const path =  require("path");
const express = require("express");
const socketio = require("socket.io");
const cors = require("cors");
const getTools = require("./utilis/getTools");

const app = express();
const server = new http.createServer(app);

const io = socketio(server, {
    cors: {
        origin: "http://localhost:5173",
    }
});

app.use(cors());
app.use(express.json());

const publicDirectory = path.join(__dirname, "./public");
app.use(express.static(publicDirectory)); 

io.on("connect", (socket) =>{
    socket.on("room", (roomData, callback) =>{
        const user = getTools.addUser(roomData.name, roomData.room, roomData.icon ,socket.id);
        if(user.error){
            return callback(user.error);
        }

        socket.join(user.room);
        socket.emit("message", getTools.generateMessage(`Welcome ${user.username}!`, "System", "sysIcon"));
        socket.broadcast.to(user.room).emit("message", getTools.generateMessage(`${user.username} has joined!`, "System","sysIcon"));

        const users = getTools.getUserByRoom(roomData.room);
        io.to(user.room).emit("sidebarData", users);
        callback();
    })

    socket.on("message", (message, callback) =>{
        const user = getTools.getUserById(socket.id);
        if(user.error){
            return callback(user.error);
        }
        // const badWordsStatus = new badWords();
        // if(badWordsStatus.isProfane(message)){
        //     return callback("Your message contains inappropriate words!");
        // }

        io.to(user.room).emit("message", getTools.generateMessage(message, user.username, user.icon));
        callback();
    });

    socket.on("location", (location, callback) =>{
        const user = getTools.getUserById(socket.id);
        if(user.error){
            return callback(user.error);
        }

        const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
        
        io.to(user.room).emit("message", getTools.generateMessage(url, user.username), user.icon);
        callback();
    });

    socket.on("disconnect", () =>{
        const user = getTools.getUserById(socket.id);
        getTools.removeUser(user.username, user.room);
        io.to(user.room).emit("message", getTools.generateMessage(`${user.username} has left!`, "System", "sysIcon"));

        const users = getTools.getUserByRoom(user.room);
        socket.broadcast.to(user.room).emit("sidebarData", users);
    })
});

server.listen(3000, () =>{
    console.log("server is running");
})
