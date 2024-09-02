import admin from 'firebase-admin';
import { Server } from 'socket.io';
import { Express } from 'express';

import { Bucket } from '@google-cloud/storage'

import sharp from 'sharp'

import { Request } from 'express';

import fs from 'fs'

import { getPFP, getPFPMap } from '../HelperFunctions';

module.exports = function (app: Express, db: admin.firestore.Firestore, io: Server, bucket: Bucket) {
    const { getUsernames } = require('../HelperFunctions')

    /*
        Initiaized signup by creating a user in firebase users and creates a db 
        doc of the newly created user
    */

    app.post('/SignUpInit', (req, res) => {
        admin.auth().createUser({
            email: req.body.Email,
            emailVerified: false,
            password: req.body.Password,
            disabled: false,
        }).then((response) => {
            return db.collection('UserData').doc(response.uid).set({
                Email: req.body.Email,
                Username: req.body.Username,
                Friends: [],
                FriendRequests: [],
            })
        }).then(() => {
            res.send({ success: true });
        }).catch((error) => {
            res.send({ success: false, error: error });
        });
    });

    /*
        Gets the chats of the current user
    */

    app.post('/getChats', (req, res) => {

        const chatRef = db.collection('Chats');
        const userDataRef = db.collection('UserData')

        chatRef.where('ChatMemberIDs', 'array-contains-any', [req.body.uid]).get().then((querySnapshot) => {
            //this like a 2d array of promises where each doc has a list of promises that needs to be resolved

            return Promise.all(querySnapshot.docs.map(doc => {//map each doc to a promise
                const data = doc.data();

                return Promise.all([
                    getUsernames(data.ChatMemberIDs, userDataRef),
                    getPFPMap(data.ChatMemberIDs, bucket)
                ]).then(([members, imgMap]) => {
                    return {//returns members of chats with names and their online status
                        name: data.ChatName,
                        id: doc.id,
                        owner: data.ChatOwner,
                        members: members.map(x => {
                            if (io.sockets.adapter.rooms.get(x.uid)) {
                                return {
                                    User: x,
                                    UserPFP: imgMap.get(x.uid),
                                    Status: 1
                                }
                            } else {
                                return {
                                    User: x,
                                    UserPFP: imgMap.get(x.uid),
                                    Status: 0
                                }
                            }
                        })
                    };
                })
            }));
        }).then(chats => {
            res.send({ success: true, chats: chats });
        }).catch(error => {
            console.log(error);
            res.send({ success: false, error: error });
        });;
    });

    /*
        Helper function that maps the uid to its username by retrieving from the db
        if not done so already
    */

    function AddUserToMap(uid, map) {
        const UserRef = db.collection('UserData');

        return new Promise((resolve, reject) => {
            if (!map.has(uid)) { //if user id not in the map then get username from db and store it into map
                getUsernames([uid], UserRef).then((member) => {
                    map.set(uid, member[0]);
                    resolve(true)
                }).catch(error => {
                    reject(error);
                })
            } else {
                resolve(true)
            }
        })
    }

    /*
        Gets and formats the chat messages of chatID based on their type

        if current user is not a member of chatID then return an error
    */
    app.post('/getChatMessages', (req, res) => {
        db.collection('Chats').doc(req.body.chatID).get().then(content => {

            //if current user not in the chat dont authorize access
            if (!content.data().ChatMemberIDs.includes(req.body.uid)) {
                res.send({ success: false, error: "Unauthorized" });
                return;
            } else {
                const map = new Map() //maps all user ids that show up in message history to their username
                
                if (!content.data().ChatEntries) return;
                Promise.all(content.data().ChatEntries.map(x => {
                    switch (x.type) {
                        case -2: {// user left message
                            return AddUserToMap(x.uid, map).then(() => {
                                return ({
                                    ...x,
                                    uid: undefined,
                                    sender: map.get(x.uid)
                                })
                            })
                        }
                        case -1: {//user removed message
                            return Promise.all([
                                AddUserToMap(x.uid, map),
                                AddUserToMap(x.removeduid, map)
                            ]).then(() => {
                                return ({
                                    ...x,
                                    uid: undefined,
                                    removeduid: undefined,
                                    sender: map.get(x.uid),
                                    removed: map.get(x.removeduid)
                                })
                            })
                        }
                        case 0: {//added user message
                            return Promise.all([
                                AddUserToMap(x.uid, map),
                                AddUserToMap(x.addeduid, map)
                            ]).then(() => {
                                return ({
                                    ...x,
                                    uid: undefined,
                                    addeduid: undefined,
                                    sender: map.get(x.uid),
                                    added: map.get(x.addeduid)
                                })
                            })
                        }
                        case 1: {//user sent message
                            return AddUserToMap(x.uid, map).then(() => {
                                return ({
                                    ...x,
                                    uid: undefined,
                                    sender: map.get(x.uid)
                                })
                            })
                        }
                        case 2: {//new owner message
                            return Promise.all([
                                AddUserToMap(x.uid, map),
                                AddUserToMap(x.newOwnerUid, map)
                            ]).then(() => {
                                return ({
                                    ...x,
                                    uid: undefined,
                                    newOwnerUid: undefined,
                                    sender: map.get(x.uid),
                                    newOwner: map.get(x.newOwnerUid)
                                })
                            })
                        }
                        case 3: {//change chat name message
                            return AddUserToMap(x.uid, map).then(() => {
                                return ({
                                    ...x,
                                    uid: undefined,
                                    sender: map.get(x.uid)
                                })
                            })
                        }
                    }
                })).then((ChatEntries) => {
                    res.send({ success: true, ChatMessages: ChatEntries });
                }).catch(error => {
                    console.log(error);
                })
            }
        });
    });

    /*
        returns current user Friend request list, Friends list, and username
    */

    app.post('/getUserData', (req, res) => {
        db.collection('UserData').doc(req.body.uid).get().then((doc1) => {
            return Promise.all([getPFPMap([...doc1.data().FriendRequests, ...doc1.data().Friends], bucket), doc1])
        }).then(([imgMap, doc1]) => {
            return Promise.all([
                Promise.all(doc1.data().FriendRequests.map(x => {
                    return db.collection('UserData').doc(x).get().then(doc2 => {
                        return {
                            uid: x,
                            Username: doc2.data().Username
                        }
                    })
                })),
                Promise.all(doc1.data().Friends.map(x => {
                    return db.collection('UserData').doc(x).get().then(doc2 => {
                        const Status = io.sockets.adapter.rooms.get(x) ? 1 : 0
                        return {
                            User: {
                                uid: x,
                                Username: doc2.data().Username
                            },
                            UserPFP: imgMap.get(x),
                            Status: Status
                        }
                    })
                })),
                doc1.data().Username,
                getPFP(req.body.uid, bucket)
            ])
        }).then(val => {
            res.send({ success: true, requests: val[0], friends: val[1], Username: val[2], userPFP: val[3] });
        });
    });

    app.post('/getUserInfo', (req, res) => {
        const UserRef = db.collection('UserData');

        getUsernames([req.body.TargetUid], UserRef).then(val => {
            return {
                User: val,
                Status: null
            }
        })
    })



    app.post('/UploadUserPFP', (req: Request & { file: any }, res) => {
        // imagemagick.resize({
        //     srcPath: "./temp.jpg",
        //     dstPath: "./penis.jpg",
        //     width: 50
        // }, function(err, reulst){
        //     if (err) throw err;
        // })

        const PFPName = `${req.body.FileTime}-${req.file.originalname}.jpg`

        sharp(`./uploads/${PFPName}`).metadata().then(metadata => {
            const height = metadata.height
            const width = metadata.width

            const size = Math.max(Math.floor(100 / Number.parseInt(req.body.PFPSize) * width), 0)

            let left =  Math.max(-Math.floor(Number.parseFloat(req.body.PFPOffSetX) * width), 0)
            let top = Math.max(-Math.floor(Number.parseFloat(req.body.PFPOffSetY) * width), 0)

            left = Math.min(width - size, left)
            top = Math.min(height - size, top)
            
            return sharp(`./uploads/${PFPName}`).extract({left: left, top: top, width: size, height: size}).resize(50, 50).toFile(`./uploadsFormatted/${PFPName}`)
        }).then(()=>{
            return bucket.upload(`./uploadsFormatted/${PFPName}`, {destination: `UserIcons/${req.body.uid}.jpg`})
        }).then(()=>{
            fs.unlink(`./uploads/${PFPName}`, (err) => {
                if(err) throw err
            })
            fs.unlink(`./uploadsFormatted/${PFPName}`, (err) => {
                if(err) throw err
            })
        }).catch(err => {
            console.log(err)
        })

        console.log(req.file)
    })
}