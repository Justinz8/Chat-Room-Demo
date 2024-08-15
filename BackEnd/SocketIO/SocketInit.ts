import admin from 'firebase-admin';
import { Server, Socket } from 'socket.io';

module.exports = function(db: admin.firestore.Firestore, socket: Socket, io: Server){
    const uid = socket.request.headers.uid as string;
    console.log(`${uid} connected`);

    /*
    If there are no other instances of a user connected to socket then alert all currently online friends
    that this user is now online.
    */

    const ChatRef = db.collection("Chats")

    ChatRef.where('chatMememberIDs', 'array-contains', uid).get().then(docs => {
        docs.forEach(doc => {
            io.to(doc.id).emit("UserOnline", uid)
        })
    })

    if(!io.sockets.adapter.rooms.get(uid)){
        const UserRef = db.collection("UserData");
        
        UserRef.doc(uid).get().then(doc => {
            io.to(doc.data().Friends).emit("UserOnline", uid);
        })
    }

    /* 
    If there are no other instances of this user online then alert 
    */

    socket.on('disconnect', function () {
        const UserRef = db.collection("UserData");
        const ChatRef = db.collection("Chats")

        ChatRef.where('chatMememberIDs', 'array-contains', uid).get().then(docs => {
            docs.forEach(doc => {
                io.to(doc.id).emit("UserOffline", uid)
            })
        })

        if(!io.sockets.adapter.rooms.get(uid)){            
            UserRef.doc(uid).get().then(doc => {
                io.to(doc.data().Friends).emit("UserOffline", uid);
            })
        }
    });

    socket.emit('connected');
    
    socket.join(uid);
}