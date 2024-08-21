import { Socket, io } from "socket.io-client";
import { useState, useEffect, useCallback, useContext } from "react";
import { KnownUser } from "./interfaces";
import { auth } from "./firebase";
import { useMemo } from "react";

//global socket used so that every component that uses useSocket() will use the same socket
//instead of repeatedly opening new sockets
let sharedSocket: Socket | null = null;

export function useSocket(){
    const [Socket, SetSocket] = useState<Socket | null>(null);

    useEffect(()=>{
        /*
            On every instance of a new user, reopen the global socket with the new 
            accessToken associated with the new user
        */
        auth.onIdTokenChanged((user)=>{
            if(user){
                user.getIdToken().then(accessToken => {
                    //if access token is the same no need to reopen socket
                    if(sharedSocket && accessToken === (sharedSocket?.auth as { [key: string]: any })["token"]) return;
                    
                    //disconnect socket and reopen with new access token
                    if(sharedSocket) {
                        sharedSocket.disconnect();
                        sharedSocket = null;
                    }
                    sharedSocket = io("http://localhost:3000", {
                        auth:{
                            token: accessToken,
                        }
                    })
                }).then(()=>{
                    SetSocket(sharedSocket); //set the local socket to the global socket 
                })

               
            }else{//if no user is logged in set global socket and local socket to null
                if(sharedSocket){
                    sharedSocket.disconnect();
                    sharedSocket = null;
                }
                SetSocket(null);
            }
        })
    }, [])

    return Socket;
}

//returns a simplified fetch function that takes in the server endpoint and body of the request
//and sends a request
export function useFetch(url: string){

    function FetchFunction (urlEnd: string, body?: object) {
        if(!auth.currentUser){ //if no user is logged in just send the request
            return fetch(`${url}/${urlEnd}`, {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify(body ? {...body}: {}),
            }).then((response) => response.json())
        } //if user is logged in send the request along with the token associated to the user
        return auth.currentUser.getIdToken().then((token) => {
            return fetch(`${url}/${urlEnd}`, {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify(body ? {
                ...body,
                token: token,
                }: {
                    token: token
                }),
            })
        }).then((response) => response.json())
    }

    const FetchValue = useMemo(()=>{
        return FetchFunction
    }, [url])


    return FetchValue
}

import { getLoadedUserContext } from "./LoadedUserContextProvider";

//functions for the loaded users state
export function useLoadedUserGetter(){
    const {LoadedUsers, SetLoadedUsers} = useContext(getLoadedUserContext());

    /*
        set user as a known user associated with uid uid
    */
    const UpdateLoadedUser = useCallback((uid: string, user: KnownUser): void => {
        SetLoadedUsers(x => {
            if(!x.has(uid)){
                const newLoadedUsers = new Map(x);
                newLoadedUsers.set(uid, user);
                return newLoadedUsers;
            }else{
                return x;
            }
        })
    }, [SetLoadedUsers]);

    /*
        returns the loaded user associated with uid, or if the loaded user does not exist
        in the map of loaded users just return the uid
    */
    const getLoadedUser = useCallback((uid: string): string | KnownUser => {
        const user = LoadedUsers.get(uid);
        if(!user){
            return uid;
        }

        return user;
    }, [LoadedUsers])   

    /*
        Updates the online status of uid to status
    */
    const updateUserState = useCallback((uid: string, status: number): void => {
        SetLoadedUsers(x => {
            if(x.has(uid)){ //if uid exists update the online status of that user
                const newLoaded = new Map(x);
                const OnlineUser = x.get(uid) as KnownUser;

                newLoaded.set(uid, {
                    ...OnlineUser,
                    Status: status
                });
                return newLoaded;
            }else{ //otherwise nothing changes
                return x;
            }
        })
    }, [SetLoadedUsers])

    const useLoadedUserGetterValue = useMemo(()=>{
        return {
            UpdateLoadedUser,
            getLoadedUser,
            updateUserState
        }
    }, [UpdateLoadedUser, getLoadedUser, updateUserState])

    return useLoadedUserGetterValue;
}