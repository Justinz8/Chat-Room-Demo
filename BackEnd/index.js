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

app.post('/SignUpInit', (req, res) => {
    console.log("EPs")
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
                next(new Error('unauthorized'));
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

            return Promise.all(data.ChatMemberIDs.map(x => {//promise.all wraps all the promises into one promise
                //make calls to fetch the username of each member in the chat
                //only move onto next step once every call has been resolved
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
                });
            })).then(members => {//return a member struct as the final value of the promise
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

app.post('/addChat', (req, res) => {
    const chatRef = db.collection('Chats');

    chatRef.add({
        ChatEntries: [],
        ChatMemberIDs: [req.body.uid, ...req.body.chat.members],
        ChatName: req.body.chat.name,
    }).then(()=>{
        res.send({success: true});
    }).catch(error=>{
        res.send({success: false, error: error})
    })
    
});

app.post('/getChatMessages', (req, res) => {
    db.collection('Chats').doc(req.body.chatID).get().then(content => {
        if(!content.data().ChatMemberIDs.includes(req.body.uid)){
            res.send({success: false, error: "Unauthorized"});
            return;
        }else{
            res.send({success: true, ChatMessages: content.data().ChatEntries});
        }
    });
});

app.post('/getUserData', (req, res) => {
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
        next(new Error('unauthorized'));
    })
});

io.on('connection', (socket) => {
    const uid = socket.request.headers.uid;
    console.log(`${uid} connected`);

    socket.emit('connected');

    socket.join(uid);

    function AcceptFriendReq(AcceptedUser){
        const currentUserDoc = db.collection("UserData").doc(uid);
        const acceptedUserDoc = db.collection("UserData").doc(AcceptedUser);

        currentUserDoc.get().then(val => {
            if(val.data().FriendRequests.includes(AcceptedUser)){
                currentUserDoc.update({
                    FriendRequests: FieldValue.arrayRemove(AcceptedUser),
                }).then(()=>{
                    return Promise.all([
                        acceptedUserDoc.update({
                            Friends: FieldValue.arrayUnion(uid),
                        }),
                        currentUserDoc.update({
                            Friends: FieldValue.arrayUnion(AcceptedUser),
                        }),
                    ])
                }).then(()=>{
                    return Promise.all([
                        acceptedUserDoc.get().then((val)=>{
                            return val.data().Username;
                        }),
                        currentUserDoc.get().then((val)=>{
                            return val.data().Username;
                        }),
                    ])
                }).then((Usernames)=>{
                    socket.to(uid).emit("NewFriend", {uid: AcceptedUser, Username: Usernames[0]});
                    socket.to(AcceptedUser).emit("NewFriend", {uid: uid, Username: Usernames[1]});
                })
            }
        }).catch(err=>{
            console.log(err);
        })
    }

    socket.on("AcceptFriendReq", (AcceptedUser) => {
        AcceptFriendReq(AcceptedUser)
    })

    socket.on('AddFriend', ({ FriendEmail }) => {
        db.collection('UserData').where('Email', '==', FriendEmail).get().then((querySnapshot) => {
            if(!querySnapshot.empty){
                const doc = querySnapshot.docs[0];

                if(doc.id === uid) {
                    return;
                }

                db.collection("UserData").doc(doc.id).get().then((val)=>{
                    if(val.data().FriendRequests.includes(uid) || val.data().Friends.includes(uid)){
                        return Promise.reject("Unable to send Friend Request");
                    }
                }).then(()=>{
                    return db.collection("UserData").doc(uid).get().then((val) => {
                        if(val.data().FriendRequests.includes(doc.id)){
                            AcceptFriendReq(doc.id);
                            return Promise.reject("Accepted Friend Request");
                        }
                    })
                }).then(()=>{
                    return db.collection('UserData').doc(doc.id).update({
                        FriendRequests: FieldValue.arrayUnion(uid)
                    })
                }).then(()=>{
                    return db.collection('UserData').doc(uid).get().then((val)=>{
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
                return new Error('Unauthorized');
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
            chatRef.doc(msg.chatID).get().then((doc) => {  
                const data = doc.data();
                if(data.ChatMemberIDs.includes(uid)) {
                    chatRef.doc(msg.chatID).update({
                        ChatEntries: FieldValue.arrayUnion({uid: uid, message: msg.message, timestamp:  Date.now()})
                    });
                }else{
                    return new Error('Unauthorized');
                }
            }).then(() => {
                io.to(msg.chatID).emit('RecieveMessage', {uid: uid, message: msg.message, timestamp:  Date.now()});
            }).catch((error) => {
                console.log(error);
            });
        }
    });
});

server.listen(port, () => {
    console.log(`listening on port:${port}`);
});