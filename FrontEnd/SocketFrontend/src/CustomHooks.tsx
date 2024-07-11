import { Socket, io } from "socket.io-client";
import { useState, useEffect, useContext, useCallback } from "react";
import { getLoadedUserContext } from "./GlobalContextProvider";
import { KnownUser } from "./interfaces";
import { auth } from "./firebase";
import { useMemo } from "react";

let sharedSocket: Socket | null = null;

export function useSocket(){
    const [Socket, SetSocket] = useState<Socket | null>(null);

    useEffect(()=>{
        auth.onIdTokenChanged((user)=>{
            if(user){
                user.getIdToken().then(accessToken => {
                    if(sharedSocket && accessToken === (sharedSocket?.auth as { [key: string]: any })["token"]) return;
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
                    SetSocket(sharedSocket);
                })

               
            }else{
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

export function useFetch(url: string){

    function FetchFunction (urlEnd: string, body?: object) {
        if(!auth.currentUser){
            return fetch(`${url}/${urlEnd}`, {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify(body ? {...body}: {}),
            }).then((response) => response.json())
        }
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

export function useLoadedUserGetter(){
    const {LoadedUsers, SetLoadedUsers} = useContext(getLoadedUserContext());

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

    const getLoadedUser = useCallback((uid: string): string | KnownUser => {
        const user = LoadedUsers.get(uid);

        if(!user){
            return uid;
        }

        return user;
    }, [LoadedUsers])

    const useLoadedUserGetterValue = useMemo(()=>{
        return {
            UpdateLoadedUser,
            getLoadedUser
        }
    }, [UpdateLoadedUser, getLoadedUser])

    return useLoadedUserGetterValue;
}