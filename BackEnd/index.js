const express = require('express');
const app = express();
const cors = require('cors')

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {cors: {origin: "*"}});

const admin = require("firebase-admin");
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');

const serviceAccount = require("./fir-test-5bb7c-firebase-adminsdk-f38j5-05e81d9be2.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.databaseURL
});

const db = getFirestore();

const port = 3000;

app.use(express.json());

app.use(cors({origin: '*'}));

app.use((req, res, next) => {
    // console.log(req.body)
    admin.auth().verifyIdToken(req.body.token, true).then((result) => {
        req.body.uid = result.uid;
        next();
    }).catch((error) => {
        console.log("error")
        next(new Error('unauthorized'));
    })
});

app.post('/SignUpInit', (req, res) => {
    db.collection('UserData').doc(req.body.uid).set({
        Email: req.body.email,
        Username: req.body.username,
        Friends: [],
        FriendRequests: [],
    }).then(() => {
        res.send({success: true});
    }).catch((error) => {
        res.send({success: false, error: error});
    });
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
                            id: x,
                            name: x
                        };
                    } else {
                        return {
                            id: x,
                            name: user.data().Username 
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
        console.log(chats)
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
    })
    res.send({success: true});
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

app.post('/getFriendRequests', (req, res) => {
    db.collection('UserData').doc(req.body.uid).get().then((doc1) => {
        Promise.all(doc1.data().FriendRequests.map(x => {
            return db.collection('UserData').doc(x).get().then(doc2 => {
                return {
                    uid: x,
                    Username: doc2.data().Username
                }
            })
        })).then(requests => {
            res.send({success: true, requests: requests});
        });
    });
});

io.use((socket, next) => {
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

    socket.on('AddFriend', ({ FriendEmail }) => {
        db.collection('UserData').where('Email', '==', FriendEmail).get().then((querySnapshot) => {
            if(!querySnapshot.empty){
                querySnapshot.forEach(doc => {
                    if(doc.id === uid) {
                        return;
                    }
                    db.collection('UserData').doc(doc.id).update({
                        FriendRequests: FieldValue.arrayUnion(uid)
                    }).then(() => {
                        console.log(doc.id)
                        io.to(doc.id).emit('FriendRequest', {uid: uid});
                    })
                })
            }
        })
    });

    socket.on('joinRoom', (chatID) => {
        socket.join(chatID);
    })

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