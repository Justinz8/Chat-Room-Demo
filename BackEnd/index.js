const express = require('express');
const app = express();
const cors = require('cors')

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {cors: {origin: "*"}});

const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const serviceAccount = require("./fir-test-5bb7c-firebase-adminsdk-f38j5-05e81d9be2.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.databaseURL
});

const db = getFirestore();

const port = 3000;

app.use(express.json());

app.use(cors({origin: '*'}));

//returns a promise where given a list of UserIDs returns a list of objects that contains both the original 
//userIDs and their respective usernames
function getUsernames(UserIDs, userDataRef){
    return Promise.all(UserIDs.map(x => {
        return userDataRef.doc(x).get().then(user => {
            if (!user.data()) {
                return {
                    uid: x,
                    Username: x
                };
            } else {
                return {
                    uid: x,
                    Username: user.data().Username 
                };
            }
        })
    }))
}

app.post('/SignUpInit', (req, res) => {
    admin.auth().createUser({
        email: req.body.Email,
        emailVerified: false,
        password: req.body.Password,
        disabled: false,    
    }).then((response)=>{
        return db.collection('UserData').doc(response.uid).set({
            Email: req.body.Email,
            Username: req.body.Username,
            Friends: [],
            FriendRequests: [],
        })
    }).then(() => {
        res.send({success: true});
    }).catch((error) => {
        res.send({success: false, error: error});
    });
});

app.use((req, res, next) => {
    switch(req.url){
        case "/SignUpInit":
            next();
            break;
        default:
            admin.auth().verifyIdToken(req.body.token, true).then((result) => {
                req.body.uid = result.uid;
                next();
            }).catch((error) => {
                console.log("error")
                next(new Error('Token Error'));
            })
            break;
    }
});



app.post('/getChats', (req, res) => {
    
    const chatRef = db.collection('Chats');
    const userDataRef = db.collection('UserData')

    chatRef.where('ChatMemberIDs', 'array-contains-any', [req.body.uid]).get().then((querySnapshot) => {
        //this like a 2d array of promises where each doc has a list of promises that needs to be resolved

        return Promise.all(querySnapshot.docs.map(doc => {//map each doc to a promise
            const data = doc.data();
            return getUsernames(data.ChatMemberIDs, userDataRef).then(members => {//return a member struct as the final value of the promise
                return {
                    name: data.ChatName, 
                    id: doc.id, 
                    members: members
                };
            });
        }));
    }).then(chats => {
        res.send({success: true, chats: chats});
    }).catch(error => {
        console.log(error);
        res.send({success: false, error: error});
    });;
});

function AddUserToMap(uid, map){
    const UserRef = db.collection('UserData');

    return new Promise((resolve, reject) => {
        if(!map.has(uid)){ //if user id not in the map then get username from db and store it into map
            getUsernames([uid], UserRef).then((member) => {
                map.set(uid, member[0].Username);
                resolve()
            }).catch(error=>{
                reject(error);
            })
        }else{
            resolve()
        }
    })
}

app.post('/getChatMessages', (req, res) => {
    db.collection('Chats').doc(req.body.chatID).get().then(content => {
        

        //if current user not in the chat dont authorize access
        if(!content.data().ChatMemberIDs.includes(req.body.uid)){ 
            res.send({success: false, error: "Unauthorized"});
            return;
        }else{
            const map = new Map() //maps all user ids that show up in message history to a username
            if(!content.data().ChatEntries) return;
            Promise.all(content.data().ChatEntries.map(x => {
                switch(x.type){
                    case 0:{
                        return AddUserToMap(x.uid, map).then(()=>{
                            return AddUserToMap(x.addeduid, map)
                        }).then(()=>{
                            return ({
                                ...x,
                                uid: null,
                                addeduid: null,
                                sender: {
                                    uid: x.uid,
                                    Username: map.get(x.uid)
                                },
                                added: {
                                    uid: x.addeduid,
                                    Username: map.get(x.addeduid)
                                }
                            })
                        })
                    }
                    case 1:{
                        return AddUserToMap(x.uid, map).then(()=>{
                            return ({
                                ...x,
                                uid: null,
                                sender: {
                                    uid: x.uid,
                                    Username: map.get(x.uid)
                                }
                            })
                        })
                    }
                }
            })).then((ChatEntries)=>{
                res.send({success: true, ChatMessages: ChatEntries});
            }).catch(error=>{
                console.log(error);
            })
        }
    });
});

app.post('/getUserData', (req, res) => { //returns all immediately relevent information about the user
    db.collection('UserData').doc(req.body.uid).get().then((doc1) => {
        return Promise.all([
            Promise.all(doc1.data().FriendRequests.map(x => {
                        return db.collection('UserData').doc(x).get().then(doc2 => {
                            return {
                                uid: x,
                                Username: doc2.data().Username
                            }
                        })})),
            Promise.all(doc1.data().Friends.map(x => {
                return db.collection('UserData').doc(x).get().then(doc2 => {
                    return {
                        uid: x,
                        Username: doc2.data().Username
                    }
                })
            })),
            doc1.data().Username
        ])
    }).then(val => {
        res.send({success: true, requests: val[0], friends: val[1], Username: val[2]});
    });
});

io.use((socket, next) => {
    if(!socket.handshake.auth.token) return;
    admin.auth().verifyIdToken(socket.handshake.auth.token, true).then((result) => {
        socket.request.headers.uid = result.uid;
        next();
    }).catch((error) => {
        next(new Error('Token Error'));
    })
});

io.on('connection', (socket) => {
    const uid = socket.request.headers.uid;
    console.log(`${uid} connected`);

    socket.emit('connected');
    
    socket.join(uid);

    socket.on('addChat', ({ chat })=>{
        const chatRef = db.collection('Chats');
        const userDataRef = db.collection('UserData');

        const ChatMemberIDs = [uid, ...chat.members];

        userDataRef.doc(uid).get().then((doc) => {//Checks if every friend the user is trying to add is a friend
            const data = doc.data();

            if(!chat.members.every(x => data.Friends.includes(x))){
                return Promise.reject('Unauthorized')
            }
        }).then(()=>{
            return chatRef.add({
                ChatEntries: [],
                ChatMemberIDs: ChatMemberIDs,
                ChatName: chat.name,
            })
        }).then((doc)=>{
            return Promise.all(
                [getUsernames(ChatMemberIDs, userDataRef),
                doc.id]
            )
        }).then(val => {
            return {
                name: chat.name, 
                id: val[1], 
                members: val[0]
            };
        }).then((newchat)=>{
            io.to(ChatMemberIDs).emit('newChat', newchat)
        }).catch(error=>{
            console.log(error);
        })
    })

    socket.on('AddUserToChat', ({ Frienduid, Chatid }) =>{
        const ChatRef = db.collection('Chats');
        const userDataRef = db.collection('UserData');

        ChatRef.doc(Chatid).get().then((Chatdoc)=>{ 
            const ChatData = Chatdoc.data();

            if(!ChatData.ChatMemberIDs.includes(uid)){//if user is not in the chat prevent adding friend to chat
                return Promise.reject('Unauthorized');
            }
            if(ChatData.ChatMemberIDs.includes(Frienduid)){
                return Promise.reject('User Already in Chat')//if Frienduid already in chat stop
            }
            userDataRef.doc(uid).get().then((doc)=>{ //if Frienduid is not a friend of user then stop request
                if(!doc.data().Friends.includes(Frienduid)){
                    return Promise.reject("Unauthorized");
                }
            }).then(()=>{
                return ChatRef.doc(Chatid).update({
                    ChatMemberIDs: FieldValue.arrayUnion(Frienduid),
                    ChatEntries: FieldValue.arrayUnion({uid: uid, addeduid: Frienduid, timestamp: Date.now(), type: 0})
                });
            }).then(()=>{
                return Promise.all([
                    ChatData.ChatName,
                    getUsernames(ChatData.ChatMemberIDs, userDataRef),
                ])
            }).then((val) => {
                return {
                    name: val[0], 
                    id: Chatid, 
                    members: val[1]
                }
            }).then((newchat) => {
                io.to(Frienduid).emit('newChat', newchat);
                getUsernames([uid, Frienduid], userDataRef).then((users)=>{
                    io.to(ChatData.ChatMemberIDs).emit('UpdateChatUsers', {Chatid: Chatid, NewUser: users[1]})
                    io.to(Chatid).emit('RecieveMessage', {sender: users[0], added: users[1], timestamp: Date.now(), type: 0});
                })
            }).catch((err) => {
                console.log(err);
            })
        }).catch(err => {
            console.log(err)
        })
    })

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
        }).then((Usernames)=>{
            io.to(uid).emit("NewFriend", {uid: AcceptedUser, Username: Usernames[0]});
            io.to(AcceptedUser).emit("NewFriend", {uid: uid, Username: Usernames[1]});
        }).catch(err=>{
            console.log(err);
        })
    }

    socket.on("AcceptFriendReq", (AcceptedUser) => {
        AcceptFriendReq(AcceptedUser)
    })

    socket.on('AddFriend', ({ FriendEmail }) => {
        const UserRef = db.collection("UserData");

        db.collection('UserData').where('Email', '==', FriendEmail).get().then((querySnapshot) => {
            if(!querySnapshot.empty){
                const doc = querySnapshot.docs[0];

                if(doc.id === uid) {
                    return;
                }
                //if user sending the friend request still has an outgoing request or is already friends with 
                //the target user then prevent from sending another
                UserRef.doc(doc.id).get().then((val)=>{
                    if(val.data().FriendRequests.includes(uid) || val.data().Friends.includes(uid)){
                        return Promise.reject("Unable to send Friend Request");
                    }
                }).then(()=>{
                    return UserRef.doc(uid).get().then((val) => { //if user sending fq has incoming fq from target then accept fq
                        if(val.data().FriendRequests.includes(doc.id)){
                            AcceptFriendReq(doc.id);
                            return Promise.reject("Accepted Friend Request");
                        }
                    })
                }).then(()=>{
                    return UserRef.doc(doc.id).update({
                        FriendRequests: FieldValue.arrayUnion(uid)
                    })
                }).then(()=>{
                    return UserRef.doc(uid).get().then((val)=>{
                        return val.data().Username;
                    })
                }).then((Username) => {
                    io.to(doc.id).emit('FriendRequest', {uid: uid, Username: Username});
                }).catch(error => console.log(error))
            }
        })
    });

    socket.on('joinRoom', (chatID) => {
        const chatRef = db.collection('Chats');
        chatRef.doc(chatID).get().then((doc) => {
            const data = doc.data();
            if(data.ChatMemberIDs.includes(uid)) {
                socket.join(chatID);
            }else{
                return Promise.reject('Unauthorized');
            }
        }).catch((error) => {
            console.log(error);
        })
    });

    socket.on('leaveRoom', (chatID) => {
        socket.leave(chatID);
    })

    socket.on('SendMessage', (msg) => {

        if(msg.chatID){
            const chatRef = db.collection('Chats');
            const UserRef = db.collection('UserData');

            chatRef.doc(msg.chatID).get().then((doc) => {  
                const data = doc.data();
                if(data.ChatMemberIDs.includes(uid)) {
                    chatRef.doc(msg.chatID).update({
                        ChatEntries: FieldValue.arrayUnion({uid: uid, message: msg.message, timestamp: Date.now(), type: 1})
                    });
                }else{
                    return Promise.reject('Unauthorized');
                }
            }).then(() => {
                return getUsernames([uid], UserRef)
                
            }).then((user) => {
                io.to(msg.chatID).emit('RecieveMessage', {sender: user[0], message: msg.message, timestamp: Date.now(), type: 1});
            }).catch((error) => {
                console.log(error);
            });
        }
    });
});

server.listen(port, () => {
    console.log(`listening on port:${port}`);
});