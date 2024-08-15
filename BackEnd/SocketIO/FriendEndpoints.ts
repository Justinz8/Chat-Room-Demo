import { FieldValue } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import { Server, Socket } from 'socket.io';


module.exports = function(db: admin.firestore.Firestore, socket: Socket, io: Server){
    const { getUsernames } = require('../HelperFunctions')

    const uid = socket.request.headers.uid as string;

    function AcceptFriendReq(AcceptedUser){
        const UserDataRef = db.collection("UserData");

        const currentUserDoc = UserDataRef.doc(uid);
        const acceptedUserDoc = UserDataRef.doc(AcceptedUser);

        currentUserDoc.get().then(val => { //check if there is a friend request from the supposed user to the current user
            if(!val.data().FriendRequests.includes(AcceptedUser)){
                return Promise.reject('Unauthorized');
            }
        }).then(()=>{
            return Promise.all([
                currentUserDoc.update({
                    FriendRequests: FieldValue.arrayRemove(AcceptedUser),
                    Friends: FieldValue.arrayUnion(AcceptedUser)
                }), 
                acceptedUserDoc.update({
                    Friends: FieldValue.arrayUnion(uid),
                })
            ])
        }).then(()=>{
            return getUsernames([AcceptedUser, uid], UserDataRef)
        }).then((Users)=>{
            const NewFriendStatus = io.sockets.adapter.rooms.get(Users[0].uid)
            io.to(uid).emit("NewFriend", {
                User: Users[0],
                Status: NewFriendStatus !== undefined ? 1 : 0
            });
            io.to(AcceptedUser).emit("NewFriend", {
                User: Users[1],
                Status: 1
            });
        }).catch(err=>{
            console.log(err);
        })
    }

    socket.on("AcceptFriendReq", (AcceptedUser) => {
        AcceptFriendReq(AcceptedUser)
    })

    socket.on('AddFriend', ({ FriendEmail, Frienduid }) => {

        function addFriendWithuid(Fuid){
            if(Fuid === uid) {
                return;
            }

            //if user sending the friend request still has an outgoing request or is already friends with 
            //the target user then prevent from sending another
            return UserRef.doc(Fuid).get().then((val)=>{
                if(val.data().FriendRequests.includes(uid) || val.data().Friends.includes(uid)){
                    return Promise.reject("Unable to send Friend Request");
                }
            }).then(()=>{
                return UserRef.doc(uid).get().then((val) => { //if user sending fq has incoming fq from target then accept fq
                    if(val.data().FriendRequests.includes(Fuid)){
                        AcceptFriendReq(Fuid);
                        return Promise.reject("Accepted Friend Request");
                    }
                })
            }).then(()=>{
                return UserRef.doc(Fuid).update({
                    FriendRequests: FieldValue.arrayUnion(uid)
                })
            }).then(()=>{
                return UserRef.doc(uid).get().then((val)=>{
                    return val.data().Username;
                })
            }).then((Username) => {
                io.to(Fuid).emit('FriendRequest', {uid: uid, Username: Username});
            }).catch(error => console.log(error))
        }

        const UserRef = db.collection("UserData");

        if(Frienduid){
            addFriendWithuid(Frienduid);
        }else{
            db.collection('UserData').where('Email', '==', FriendEmail).get().then((querySnapshot) => {
                if(!querySnapshot.empty){
                    const doc = querySnapshot.docs[0];
                    
                    addFriendWithuid(doc.id);
                }
            })
        }
    });

    socket.on('RemoveFriend', (Frienduid)=>{
        const UserDataRef = db.collection("UserData");

        UserDataRef.doc(uid).get().then(doc => {
            if(!doc.data().Friends.includes(Frienduid)){
                return Promise.reject("Unauthorized")
            }
        }).then(()=>{
            return UserDataRef.doc(uid).update({
                Friends: FieldValue.arrayRemove(Frienduid)
            })
        }).then(()=>{
            return UserDataRef.doc(Frienduid).update({
                Friends: FieldValue.arrayRemove(uid)
            })
        }).then(()=>{
            io.to(uid).emit("RemoveFriend", Frienduid);
            io.to(Frienduid).emit("RemoveFriend", uid);
        }).catch((err)=>{
            console.log(err);
        })
    })
}