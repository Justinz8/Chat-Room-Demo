import admin from 'firebase-admin';
import { Server, Socket } from 'socket.io';

import { Bucket } from '@google-cloud/storage'

module.exports = function (db: admin.firestore.Firestore, socket: Socket, io: Server, bucket: Bucket) {
    const uid = socket.request.headers.uid as string;
    console.log(`${uid} connected`);

    /*
    If there are no other instances of a user connected to socket then alert all 
    currently online friends and members in relevant chats that this user is now online.
    */

    if (!io.sockets.adapter.rooms.get(uid)) {
        const ChatRef = db.collection("Chats")
        const UserRef = db.collection("UserData");

        ChatRef.where('ChatMemberIDs', 'array-contains', uid).get().then(docs => {
            docs.forEach(doc => {
                io.to(doc.data().ChatMemberIDs).emit("UserOnline", uid)
            })
        })

        UserRef.doc(uid).get().then(doc => {
            io.to(doc.data().Friends).emit("UserOnline", uid);
        })
    }

    /* 
        If there are no other instances of a user connected to socket then alert all 
    currently offline friends and members in relevant chats that this user is now offline.
    */

    socket.on('disconnect', function () {
        if (!io.sockets.adapter.rooms.get(uid)) {
            const UserRef = db.collection("UserData");
            const ChatRef = db.collection("Chats")

            ChatRef.where('ChatMemberIDs', 'array-contains', uid).get().then(docs => {
                docs.forEach(doc => {
                    io.to(doc.data().ChatMemberIDs).emit("UserOffline", uid)
                })
            })

            UserRef.doc(uid).get().then(doc => {
                io.to(doc.data().Friends).emit("UserOffline", uid);
            })
        }
    });

    socket.emit('connected');

    socket.join(uid);
}