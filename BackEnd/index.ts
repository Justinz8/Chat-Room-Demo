import express from 'express'

const app = express();

import cors from 'cors';
import http from 'http';

const server = http.createServer(app);

import { Server } from 'socket.io';

const io = new Server(server, { cors: { origin: "*" } });

import admin from 'firebase-admin';

import { getStorage } from 'firebase-admin/storage';

import { getFirestore } from 'firebase-admin/firestore';

import serviceAccount from "./fir-test-5bb7c-firebase-adminsdk-f38j5-05e81d9be2.json";

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    databaseURL: process.env.databaseURL,
    storageBucket: process.env.storageBucket
});

const db = getFirestore();

const bucket = getStorage().bucket('chatapp-a9084.appspot.com');

const port = 3000;

app.use(express.json());

app.use(cors({ origin: '*' }));

//if user is attempting to sign up then no need to vertify token
//otherwise check if token is valid and if so, store the uid in the body for future use
app.use((req, res, next) => {
    switch (req.url) {
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

/*
    Check if user token is valid on socket connection, if so store the uid of the user
    into the header
*/
io.use((socket, next) => {
    if (!socket.handshake.auth.token) return;
    admin.auth().verifyIdToken(socket.handshake.auth.token, true).then((result) => {
        socket.request.headers.uid = result.uid;
        next();
    }).catch((error) => {
        next(new Error('Token Error'));
    })
});

require('./Express Endpoints/InitEndpoints')(app, db, io, bucket)

io.on('connection', (socket) => {
    require('./SocketIO/SocketInit')(db, socket, io)
    require('./SocketIO/ChatEndpoints')(db, socket, io)
    require('./SocketIO/FriendEndpoints')(db, socket, io)
});

server.listen(port, () => {
    console.log(`listening on port:${port}`);
});