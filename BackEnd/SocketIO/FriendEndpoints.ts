import { FieldValue } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import { Server, Socket } from 'socket.io';

import { Bucket } from '@google-cloud/storage'

module.exports = function(db: admin.firestore.Firestore, socket: Socket, io: Server, bucket: Bucket){
    const { getUsernames } = require('../HelperFunctions')

    const uid = socket.request.headers.uid as string;

    /*
        Turns the AcceptedUser into a friend, updating both the backend and emitting
        to the front end of the accepted user and current user to update their front end
        with the new friend

        if there is no friend request from AcceptedUser then return an error
    */
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
                currentUserDoc.update({//remove friend request from accepting user of friend request
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
            //check if new friend is online or not
            const NewFriendStatus = io.sockets.adapter.rooms.get(Users[0].uid) !== undefined ? 1 : 0

            io.to(uid).emit("NewFriend", {
                User: Users[0],
                Status: NewFriendStatus
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

    /*
    Send a friend request to user either using Frienduid or FriendEmail
    */

    socket.on('AddFriend', ({ FriendEmail, Frienduid }) => {
            /*
                Sends a friend request to Fuid, this means updating the database and also emitting
                to the front end to Fuid to update their friend request list

                if Fuid = current user uid then nothing happens
                if Fuid is already a friend of current user or if current user already has
                an outgoing friend request to Fuid then return an error
                if current user has an incoming friend request from Fuid then add Fuid as a friend
            */
        function addFriendWithuid(Fuid){
            if(Fuid === uid) { //if user is trying to add themselves as a user then stop them
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
                return UserRef.doc(Fuid).update({//update friend requests of the recieving user
                    FriendRequests: FieldValue.arrayUnion(uid)
                })
            }).then(()=>{
                return UserRef.doc(uid).get().then((val)=>{ //get username of current user
                    return val.data().Username;
                })
            }).then((Username) => {//emit to Fuid to update friend requests on front end
                io.to(Fuid).emit('FriendRequest', {uid: uid, Username: Username});
            }).catch(error => console.log(error))
        }

        const UserRef = db.collection("UserData");

        if(Frienduid){ //if given the uid of the target user then just use the above function
            addFriendWithuid(Frienduid);
        }else{//otherwise get the uid of the target user
            db.collection('UserData').where('Email', '==', FriendEmail).get().then((querySnapshot) => {
                if(!querySnapshot.empty){
                    const doc = querySnapshot.docs[0];
                    
                    addFriendWithuid(doc.id);
                }
            })
        }
    });

    /*
        Removes Frienduid as a friend with current user, this includes updating the db
        and emitting to the front end of both current user and Frienduid to update
        friend list

        if Frienduid is not a friend of current user return an error
    */
    socket.on('RemoveFriend', (Frienduid)=>{
        const UserDataRef = db.collection("UserData");

        UserDataRef.doc(uid).get().then(doc => {
            //check if Frienduid is currently a friend of the current user
            if(!doc.data().Friends.includes(Frienduid)){ 
                return Promise.reject("Unauthorized")
            }
        }).then(()=>{
            return Promise.all([
            UserDataRef.doc(uid).update({
                Friends: FieldValue.arrayRemove(Frienduid)
            }),
            UserDataRef.doc(Frienduid).update({
                Friends: FieldValue.arrayRemove(uid)
            })
            ])
        }).then(()=>{
            io.to(uid).emit("RemoveFriend", Frienduid);
            io.to(Frienduid).emit("RemoveFriend", uid);
        }).catch((err)=>{
            console.log(err);
        })
    })
}