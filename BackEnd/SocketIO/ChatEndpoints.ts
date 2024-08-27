import { FieldValue } from 'firebase-admin/firestore'
import admin from 'firebase-admin'
import { Server, Socket } from 'socket.io'

import { Bucket } from '@google-cloud/storage'

module.exports = function(db: admin.firestore.Firestore, socket: Socket, io: Server, bucket: Bucket){
    const {getUsernames} = require('../HelperFunctions')

    const uid = socket.request.headers.uid as string

    /* 
        Given the chatID, message object,
        and an object of users(where the key is the user type(sender, removed, etc) and value is uid)
        This function stores the message object into the db and sends
        a formatted message to the front end throught socket.

        if current user is not in chatID then return an error

        e.g.

        SendMessageToChat(100, {uid: 1, addeduid: 0, timestamp: 1, type: 0}, {sender: 1, added: 0})

        will add {uid: 1, addeduid: 0, timestamp: 1, type: 0} to the db
        and send 
        {sender: {uid: 1, user: exampleName}, added: {uid: 0, user: exampleName}, timestamp: 1, type: 0}
        to the front end
    */

    function SendMessageToChat(chatID, message, users){
        const chatRef = db.collection('Chats')
        const userDataRef = db.collection('UserData')

        return chatRef.doc(chatID).get().then(doc => {
            if(!doc.data().ChatMemberIDs.includes(uid)){//check if current user is in chat
                return Promise.reject("Unathorized - user is not in chat")
            }
        }).then(()=>{
            
            return chatRef.doc(chatID).update({//first add the message to the db
                ChatEntries: FieldValue.arrayUnion(message)
            })
        }).then(()=>{
            /* 
                Get the user object of each uid in the key pair of users
                and store it as an array of key pairs

                e.g.

                users = [{added: 1}, {sender: 2}]
                output: [{added:
                            {uid: 1,
                            Username exampleName}
                        },
                        {sender: 
                            {uid: 2,
                            Username: exampleName}
                        }]
            */
            return Promise.all(Object.entries(users).map(entry => {
                return new Promise((resolve, reject) => {
                    getUsernames([entry[1]], userDataRef).then((user)=>{
                        resolve({
                            [entry[0]]: user[0]
                        })
                    }).catch(err => {
                        reject(err)
                    })
                })
            }))
        }).then((UpdatedUsers) => {
            const formattedMessage = {
                message: message.message,
                type: message.type,
                timestamp: message.timestamp
            }
            UpdatedUsers.forEach(x => {
                const key = Object.entries(x)[0][0]
                const val = Object.entries(x)[0][1]
                formattedMessage[key] = val
            })
            io.to(chatID).emit('RecieveMessage', formattedMessage)
        })
    }

    /*
        create a new chat with the current user as the owner.
        This means updating the db and also emitting to the members of the new chat
        to update their chat list

        if a member is not a friend of current user return an error
    */
    socket.on('addChat', ({ chat })=>{
        const chatRef = db.collection('Chats')
        const userDataRef = db.collection('UserData')

        const ChatMemberIDs = [uid, ...chat.members]

        //Checks if every friend the user is trying to add is actually a friend
        userDataRef.doc(uid).get().then((doc) => {
            const data = doc.data()

            if(!chat.members.every(x => data.Friends.includes(x))){
                return Promise.reject('Unauthorized')
            }
        }).then(()=>{
            return chatRef.add({//values stored in the db
                ChatEntries: [],
                ChatMemberIDs: ChatMemberIDs,
                ChatName: chat.name,
                ChatOwner: uid
            })
        }).then(doc => {
            return Promise.all([{//values emitted to front end members
                name: chat.name, 
                id: doc.id,
                owner: uid,
                members: ChatMemberIDs
            },
            getUsernames(ChatMemberIDs, userDataRef).then(users => {
                //get online status of each user and add extra detail to each member
                return users.map(x => {
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
            })
            ])
        }).then((newchat)=>{
            io.to(ChatMemberIDs).emit('newChat', {newchat: newchat[0], membersList: newchat[1]})
        }).catch(err=>{
            console.log(err)
        })
    })

    /*
        Adds Frienduid to Chatid. This includes updating db, emitting to the chat members
        to update member list, emitting to Frienduid to add new chat to chat list,
        sending a message to the chat that the current user added Frienduid to Chatid

        if current user is not in Chatid or if Frienduid is already in Chatid or if Frienduid
        is not a friend of the current user then return an error
    */

    socket.on('AddUserToChat', ({ Frienduid, Chatid }) =>{
        const ChatRef = db.collection('Chats')
        const userDataRef = db.collection('UserData')

        ChatRef.doc(Chatid).get().then((Chatdoc)=>{ 
            const ChatData = Chatdoc.data()

            if(!ChatData.ChatMemberIDs.includes(uid)){//if user is not in the chat prevent adding friend to chat
                return Promise.reject('Unauthorized - user is not in the chat')
            }
            if(ChatData.ChatMemberIDs.includes(Frienduid)){
                return Promise.reject('User Already in Chat')//if Frienduid already in chat stop
            }

            return userDataRef.doc(uid).get().then((doc)=>{ //if Frienduid is not a friend of user then stop request
                if(!doc.data().Friends.includes(Frienduid)){
                    return Promise.reject("Unauthorized - Frienduid is not a friend of user")
                }
            }).then(()=>{
                return ChatRef.doc(Chatid).update({
                    ChatMemberIDs: FieldValue.arrayUnion(Frienduid),
                    ChatEntries: FieldValue.arrayUnion({uid: uid, addeduid: Frienduid, timestamp: Date.now(), type: 0})
                })
            }).then(()=>{
                getUsernames([uid, Frienduid], userDataRef).then((users)=>{
                    io.to(ChatData.ChatMemberIDs).emit('UpdateChatUsers', { //emit to chat members to update member list
                        Chatid: Chatid, 
                        NewUser: {
                            User: users[1],
                            Status: io.sockets.adapter.rooms.get(users[1].uid) ? 1 : 0
                        }
                    })
                    //send message to chat that Frienduid got added
                    io.to(Chatid).emit('RecieveMessage', {sender: users[0], added: users[1], timestamp: Date.now(), type: 0})
                })
            }).then(() => {
                return Promise.all([{//values of a new chat
                    name: ChatData.ChatName, 
                    id: Chatid, 
                    members: [...ChatData.ChatMemberIDs, Frienduid]
                },
                //get Usernames and online status of each member
                getUsernames(ChatData.ChatMemberIDs, userDataRef).then(users => {
                    return users.map(x => {
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
                })
                ])
            }).then((newchat) => {
                //emit to Frienduid to add the new chat on the front end
                io.to(Frienduid).emit('newChat', {newchat: newchat[0], membersList: newchat[1]})
            })
        }).catch(err => {
            console.log(err)
        })
    })

    /*
        Adds the current user to room with chatID. 
        (this allows current user to recieve messages from chatID in real time)

        If current user is not in chatID then return and error
    */

    socket.on('joinRoom', (chatID) => {
        const chatRef = db.collection('Chats')

        chatRef.doc(chatID).get().then((doc) => {
            const data = doc.data()
            if(data.ChatMemberIDs.includes(uid)) {//check if current user has access to chatID
                socket.join(chatID)
            }else{
                return Promise.reject('Unauthorized')
            }
        }).catch((err) => {
            console.log(err)
        })
    })

    /*
        Leave chatID room. (User will stop recieving real time messages from chatID)
    */
    socket.on('leaveRoom', (chatID) => {
        socket.leave(chatID)
    })

    /*
        Send message msg.message to msg.chatID
    */

    socket.on('SendMessage', (msg) => {
        if(msg.chatID){
            SendMessageToChat(msg.chatID, 
                            {uid: uid, message: msg.message, timestamp: Date.now(), type: 1}, 
                            {sender: uid}
            ).catch(err => {
                console.log(err)
            })
        }
    })

    /* 
        Removes user from the chat. This includes 
        -removing uidInChat from the members list of the chat
        -emits to uidInChat to remove the illusion of having chat priviliges when it has
         been revoked.
        -emits to the other users in the chat to indicate uidInChat has been removed and to
         remove uidInChat from the members list

        If uidInChat is not in chatID then returns an 'Unauthorized' error.
    */
    function RemoveUserFromChat(uidInChat, chatID){
        const ChatRef = db.collection("Chats")

        return ChatRef.doc(chatID).get().then(doc => {
            if(!doc.data().ChatMemberIDs.includes(uidInChat)){ //check if uidInChat is in chatID
                return Promise.reject("Unauthorized - uidInChat is not in chat")
            }
        }).then(() => {
            return ChatRef.doc(chatID).update({
                ChatMemberIDs: FieldValue.arrayRemove(uidInChat)
            })
        }).then(()=>{
            //get socket id of uidInChat
            const InChatSocketID = io.sockets.adapter.rooms.get(uidInChat).values().next().value
            //get socket object of uidInChat from the socket id 
            const InChatSocket = io.sockets.sockets.get(InChatSocketID)

            if(InChatSocket){ //make uidInChat leave chatID room if they're in the chat room
                InChatSocket.leave(chatID)
            }

            io.to(uidInChat).emit('RevokeChatPerm', chatID)
            io.to(chatID).emit('RemoveUser', uidInChat)
            ChatRef.doc(chatID).get().then(doc => {
                io.to(doc.data().ChatMemberIDs).emit('DecreaseMemberCount', {uid: uidInChat, chatID: chatID})
            })
        })
    }

    /* 
        Removes the current user from chatID and sends a message in the chat to tell the chat that
        the current user has left.
    */

    socket.on('LeaveChat', (chatID) => {
        RemoveUserFromChat(uid, chatID).then(()=>{
            return SendMessageToChat(chatID, {uid: uid, timestamp: Date.now(), type: -2}, {sender: uid})
        }).catch(err => {
            console.log(err)
        })
    })

    /*
        Removes uidInChat from chatID and sends a message in the chat to tell the chat that
        uidInChat has left.

        If the current user is not the owner of chatID then output Unauthorized to console
    */

    socket.on("RemoveFromChat", ({ uidInChat, chatID }) => {
        const ChatRef = db.collection("Chats")

        ChatRef.doc(chatID).get().then(doc => { //check if current user is owner of chatID
            if(doc.data().ChatOwner !== uid){
                return Promise.reject("Unauthorized - user is not owner of chat")
            }
        }).then(()=>{
            return RemoveUserFromChat(uidInChat, chatID)
        }).then(()=>{
            return SendMessageToChat(chatID, {uid: uid, removeduid: uidInChat, timestamp: Date.now(), type: -1}, {sender: uid, removed: uidInChat})
        }).catch(err => {
            console.log(err)
        })
    })

    /*
        Changes owner of chatID to uidInChat. This includes updating the db, emitting
        to front end to reflect changes, and sending a message to chatID

        If current user is not the owner of chatID or uidInChat is not in chatID 
        then return an error
    */

    socket.on("MakeUserOwner", ({ uidInChat, chatID}) => {
        const ChatRef = db.collection("Chats")
        
        ChatRef.doc(chatID).get().then(doc => { //check if current user is owner of chatID
            if(doc.data().ChatOwner !== uid){
                return Promise.reject("Unathorized - user is not owner of chat")
            }
            if(!doc.data().ChatMemberIDs.includes(uidInChat)){
                return Promise.reject("Unauthorized - uidInChat is not in the chat")
            }
        }).then(()=>{
            return ChatRef.doc(chatID).update({
                ChatOwner: uidInChat
            })
        }).then(()=>{
            return Promise.all([//emits to chat members to update chatID's owner to uidInChat
                ChatRef.doc(chatID).get().then(doc => {
                    io.to(doc.data().ChatMemberIDs).emit('ChangeOwner', {uid: uidInChat, chatID: chatID})
                }),//send a message to the chat that uidInChat got removed
                SendMessageToChat(chatID, {uid: uid, newOwnerUid: uidInChat, timestamp: Date.now(), type: 2}, {sender: uid, newOwner: uidInChat})
            ])
        }).catch(err => {
            console.log(err)
        })
    })

    /*
        Changes the title of chatID to newTitle. This includes updating db,
        emitting to front end to reflect changes, and sending a message to chat.

        If newTitle is same as the previous title or if current user is not in chatID
        then return an error.
    */

    socket.on('updateTitle', ({newTitle, chatID}) => {
        const ChatRef = db.collection('Chats')

        ChatRef.doc(chatID).get().then(doc => {
            if(doc.data().ChatName===newTitle){ //check if title is same
                return Promise.reject("Title is the same")
            }
            if(!doc.data().ChatMemberIDs.includes(uid)){ //check if user is in chatID
                return Promise.reject("Unauthorized - User not in chat")
            }
        }).then(()=>{
            return ChatRef.doc(chatID).update({
                ChatName: newTitle
            })
        }).then(()=>{
            return Promise.all([//send message and emit to ChatMemberIDS to reflect changes
                SendMessageToChat(chatID, {uid: uid, message: newTitle, timestamp: Date.now(), type: 3}, {sender: uid}),
                ChatRef.doc(chatID).get().then(doc => {
                    io.to(doc.data().ChatMemberIDs).emit('ChangeChatTitle', {chatID: chatID, newTitle: newTitle})
                })
            ])
        }).catch(err=>{
            console.log(err)
        })
    })
}