import admin from 'firebase-admin';
import { Server } from 'socket.io';
import { Express } from 'express';


module.exports = function(app: Express, db: admin.firestore.Firestore, io: Server){
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
                return getUsernames(data.ChatMemberIDs, userDataRef).then(members => {//return a member struct as the final value of the promise
                    return {//returns members of chats with names and their online status
                        name: data.ChatName, 
                        id: doc.id, 
                        owner: data.ChatOwner,
                        members: members.map(x => {
                            if(io.sockets.adapter.rooms.get(x.uid)){
                                return {
                                    User: x,
                                    Status: 1
                                }
                            }else{
                                return {
                                    User: x,
                                    Status: 0
                                }
                            }
                        })
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

    /*
        Helper function that maps the uid to its username by retrieving from the db
        if not done so already
    */
    
    function AddUserToMap(uid, map){
        const UserRef = db.collection('UserData');
    
        return new Promise((resolve, reject) => {
            if(!map.has(uid)){ //if user id not in the map then get username from db and store it into map
                getUsernames([uid], UserRef).then((member) => {
                    map.set(uid, member[0].Username);
                    resolve(true)
                }).catch(error=>{
                    reject(error);
                })
            }else{
                resolve(true)
            }
        })
    }

    /*
        returns formatted user with username and uid as a single object
    */
    function getFormattedUser(uid, map){ //assumes uid is already in map
        return {
            uid: uid,
            Username: map.get(uid)
        }
    }
    
    /*
        Gets and formats the chat messages of chatID based on their type

        if current user is not a member of chatID then return an error
    */
    app.post('/getChatMessages', (req, res) => {
        db.collection('Chats').doc(req.body.chatID).get().then(content => {
            
            //if current user not in the chat dont authorize access
            if(!content.data().ChatMemberIDs.includes(req.body.uid)){ 
                res.send({success: false, error: "Unauthorized"});
                return;
            }else{
                const map = new Map() //maps all user ids that show up in message history to their username
                
                if(!content.data().ChatEntries) return;
                Promise.all(content.data().ChatEntries.map(x => {
                    switch(x.type){
                        case -2: {// user left message
                            return AddUserToMap(x.uid, map).then(()=>{
                                return ({
                                    ...x,
                                    uid: undefined,
                                    sender: getFormattedUser(x.uid, map)
                                })
                            })
                        }
                        case -1: {//user removed message
                            return Promise.all([
                                AddUserToMap(x.uid, map),
                                AddUserToMap(x.removeduid, map)
                            ]).then(()=>{
                                return ({
                                    ...x,
                                    uid: undefined,
                                    removeduid: undefined,
                                    sender: getFormattedUser(x.uid, map),
                                    removed: getFormattedUser(x.removeduid, map)
                                })
                            })
                        }
                        case 0:{//added user message
                            return Promise.all([
                                AddUserToMap(x.uid, map),
                                AddUserToMap(x.addeduid, map)
                            ]).then(()=>{
                                return ({
                                    ...x,
                                    uid: undefined,
                                    addeduid: undefined,
                                    sender: getFormattedUser(x.uid, map),
                                    added: getFormattedUser(x.addeduid, map)
                                })
                            })
                        }
                        case 1:{//user sent message
                            return AddUserToMap(x.uid, map).then(()=>{
                                return ({
                                    ...x,
                                    uid: undefined,
                                    sender: getFormattedUser(x.uid, map)
                                })
                            })
                        }
                        case 2:{//new owner message
                            return Promise.all([
                                AddUserToMap(x.uid, map),
                                AddUserToMap(x.newOwnerUid, map)
                            ]).then(()=>{
                                return ({
                                    ...x,
                                    uid: undefined,
                                    newOwnerUid: undefined,
                                    sender: getFormattedUser(x.uid, map),
                                    newOwner: getFormattedUser(x.newOwnerUid, map)
                                })
                            })
                        }
                        case 3:{//change chat name message
                            return AddUserToMap(x.uid, map).then(()=>{
                                return ({
                                    ...x,
                                    uid: undefined,
                                    sender: getFormattedUser(x.uid, map)
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

    /*
        returns current user Friend request list, Friends list, and username
    */
    
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
                        const Status = io.sockets.adapter.rooms.get(x) ? 1 : 0
                        return {
                            User: {
                                uid: x,
                                Username: doc2.data().Username
                            },
                            Status: Status
                        }
                    })
                })),
                doc1.data().Username
            ])
        }).then(val => {
            res.send({success: true, requests: val[0], friends: val[1], Username: val[2]});
        });
    });
}